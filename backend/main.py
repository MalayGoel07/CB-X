from fastapi import FastAPI,HTTPException,Depends,File,Form,UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse,Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel,Field,ValidationError
import asyncio,json,os,uvicorn
from db import users_collection,load_file,show_files,delete_file,file_name
from urllib.parse import quote
from doc_agent import MIME
from general import M_CODER,M_MATH,M_MERGER,M_RESEARCH,M_ROUTER,M_WRITER,Message,orchestrate,read_file_content,DEFAULT_MODELS,installed_models,norm_model
from security import Token,UserSignup,authenticate_user,create_access_token,get_password_hash,get_current_active_user,User
from datetime import timedelta
from typing import List,Annotated
from dotenv import load_dotenv
from uuid import uuid4
from pathlib import Path

load_dotenv()
ACCESS_TOKEN_EXPIRE_MINUTES=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
app=FastAPI(title="Orch-7 API",version="0.0.1")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

class ChatRequest(BaseModel):
    message:str=Field(...,min_length=1)
    history:List[Message]=[]

class ChatSession(BaseModel):
    id:str
    title:str
    messages:List[Message]=Field(default_factory=list)

class ChatsUpdate(BaseModel):
    chats:List[ChatSession]

@app.get("/")
async def root():
    return {"message":"orch-7 is running!"}

@app.get("/models")
async def get_models():
    return {"models":[{"role":"Router","model":M_ROUTER},{"role":"Research","model":M_RESEARCH},{"role":"Writer","model":M_WRITER},{"role":"Coder","model":M_CODER},{"role":"Maths","model":M_MATH},{"role":"Merger","model":M_MERGER}]}

@app.post("/auth/login")
async def login(form_data:Annotated[OAuth2PasswordRequestForm,Depends()])->Token:
    user=authenticate_user(form_data.username,form_data.password)
    if not user: raise HTTPException(401,"Incorrect username or password")
    token=create_access_token(data={"sub":user.username},expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return Token(access_token=token,token_type="bearer")

@app.post("/auth/signup")
async def signup(user:UserSignup)->Token:
    if users_collection.find_one({"username":user.username}): raise HTTPException(400,"Username already exists")
    users_collection.insert_one({"username":user.username,"full_name":user.full_name,"email":user.email,"hashed_password":get_password_hash(user.password),"disabled":False})
    return Token(access_token=create_access_token(data={"sub":user.username}),token_type="bearer")

class ProfileUpdate(BaseModel):
    full_name:str|None=None
    nickname:str|None=None
    instructions:str|None=None
    system_prompt:str|None=None

@app.put("/me")
async def update_me(data:ProfileUpdate,current_user:Annotated[User,Depends(get_current_active_user)]):
    users_collection.update_one({"username":current_user.username},{"$set":{"full_name":data.full_name,"nickname":data.nickname,"instructions":data.instructions,"system_prompt":data.system_prompt}})
    return {"message":"Profile updated"}

@app.get("/me")
async def get_me(current_user:Annotated[User,Depends(get_current_active_user)]):
    user=users_collection.find_one({"username":current_user.username})
    return {"username":user["username"],"full_name":user.get("full_name",""),"email":user.get("email",""),"nickname":user.get("nickname",""),"instructions":user.get("instructions",""),"system_prompt":user.get("system_prompt","")}

MAX_ATTACHMENT_SIZE=10*1024*1024
MAX_ATTACHMENT_COUNT=5
IMAGE_EXTENSIONS={".jpg",".jpeg",".png",".webp",".gif",".bmp"}
DOCUMENT_EXTENSIONS={".pdf",".docx",".txt",".md",".py",".js",".json",".csv",".html",".css"}
MAX_DOCUMENT_CHARS=50000

@app.post("/chat")
async def chat(message:str=Form(...),history:str=Form("[]"),files:List[UploadFile]=File(default=[]),current_user:User=Depends(get_current_active_user)):
    if not message.strip() and not files: raise HTTPException(422,"Enter a message or attach a file.")
    if len(files)>MAX_ATTACHMENT_COUNT: raise HTTPException(413,f"Attach no more than {MAX_ATTACHMENT_COUNT} files.")
    try:
        history_data=json.loads(history)
        history_messages=[Message.model_validate(item) for item in history_data]
    except (json.JSONDecodeError,TypeError,ValidationError) as error:
        raise HTTPException(400,"Invalid chat history.") from error

    image_data=[]
    document_parts=[]
    for upload in files:
        filename=upload.filename or "attachment"
        extension=os.path.splitext(filename)[1].lower()
        if extension not in IMAGE_EXTENSIONS|DOCUMENT_EXTENSIONS: raise HTTPException(415,f"Unsupported file type: {filename}")
        content=await upload.read(MAX_ATTACHMENT_SIZE+1)
        if len(content)>MAX_ATTACHMENT_SIZE: raise HTTPException(413,f"{filename} exceeds the 10 MB file limit.")
        if extension in IMAGE_EXTENSIONS: image_data.append(content)
        else:
            try: extracted=read_file_content(filename,content)
            except (UnicodeDecodeError,ValueError) as error: raise HTTPException(422,f"Could not read {filename}: {error}") from error
            remaining_chars=max(MAX_DOCUMENT_CHARS-sum(len(part) for part in document_parts),0)
            document_parts.append(f"--- {filename} ---\n{extracted[:remaining_chars]}")

    file_context="\n\n".join(document_parts) or None
    prompt=message.strip() or "Analyze the attached file(s)."
    user_doc=users_collection.find_one({"username":current_user.username},{"models":1}) or {}
    return StreamingResponse(orchestrate(prompt,history_messages,image_data or None,file_context,current_user.system_prompt,current_user.username,user_doc.get("models") or None),media_type="text/event-stream")

@app.get("/history")
async def get_history(current_user:Annotated[User,Depends(get_current_active_user)]):
    user=users_collection.find_one({"username":current_user.username})
    return {"history":user.get("history",[])}

@app.post("/history")
async def save_history(data:dict,current_user:Annotated[User,Depends(get_current_active_user)]):
    users_collection.update_one({"username":current_user.username},{"$set":{"history":data["history"]}})
    return {"message":"History saved"}

@app.get("/chats")
async def get_chats(current_user:Annotated[User,Depends(get_current_active_user)]):
    user=users_collection.find_one({"username":current_user.username})
    chats=user.get("chats")
    if chats is not None: return {"chats":chats}
    legacy_history=user.get("history",[])
    chats=[]
    if legacy_history:
        first_prompt=next((message["content"] for message in legacy_history if message.get("role")=="user"),"Imported chat")
        chats=[{"id":str(uuid4()),"title":first_prompt[:60],"messages":legacy_history}]
        users_collection.update_one({"username":current_user.username},{"$set":{"chats":chats}})
    return {"chats":chats}

@app.post("/chats")
async def save_chats(data:ChatsUpdate,current_user:Annotated[User,Depends(get_current_active_user)]):
    users_collection.update_one({"username":current_user.username},{"$set":{"chats":[chat.model_dump(exclude_none=True) for chat in data.chats]}})
    return {"message":"Chats saved"}

@app.get("/files")
async def show_user_files(current_user:Annotated[User,Depends(get_current_active_user)]):
    docs=await asyncio.to_thread(show_files,current_user.username)
    return {"files":[{"id":d["_id"],"name":d["name"],"size":d.get("size",0),"created":d["created"].isoformat()+"Z"} for d in docs]}

@app.get("/files/{file_id}")
async def download(file_id:str,current_user:Annotated[User,Depends(get_current_active_user)]):
    data=await asyncio.to_thread(load_file,file_id,current_user.username)
    if data is None: raise HTTPException(404,"File not found")
    name=await asyncio.to_thread(file_name,file_id,current_user.username) or file_id
    ext=name.rsplit(".",1)[-1].lower()
    return Response(data,media_type=MIME.get(ext,"application/octet-stream"),headers={"Content-Disposition":f"attachment; filename*=UTF-8''{quote(name)}"})

@app.delete("/files/{file_id}")
async def delete_user_file(file_id:str,current_user:Annotated[User,Depends(get_current_active_user)]):
    if not delete_file(file_id,current_user.username): raise HTTPException(404,"File not found")
    return {"message":"File deleted"}

class ModelsUpdate(BaseModel):
    models:dict[str,str]

@app.get("/models/installed")
async def list_installed(current_user:Annotated[User,Depends(get_current_active_user)]):
    try: return {"models":sorted(await installed_models())}
    except ConnectionError: raise HTTPException(503,"Can't reach Ollama. Start it with `ollama serve`.")

@app.get("/me/models")
async def get_my_models(current_user:Annotated[User,Depends(get_current_active_user)]):
    user=users_collection.find_one({"username":current_user.username},{"models":1}) or {}
    custom=user.get("models",{})
    return {"models":[{"role":r,"model":custom.get(r) or d or "","default":d or "","custom":bool(custom.get(r))} for r,d in DEFAULT_MODELS.items()]}

@app.put("/me/models")
async def set_my_models(data:ModelsUpdate,current_user:Annotated[User,Depends(get_current_active_user)]):
    bad=[r for r in data.models if r not in DEFAULT_MODELS]
    if bad: raise HTTPException(400,f"Unknown role: {bad[0]}")
    clean={r:norm_model(m) for r,m in data.models.items() if m.strip()}
    if clean:
        try: have=await installed_models()
        except ConnectionError: raise HTTPException(503,"Can't reach Ollama. Start it with `ollama serve`.")
        missing=sorted({m for m in clean.values() if m not in have})
        if missing: raise HTTPException(400,f"Not installed: {', '.join(missing)}. Please download all the models you want to use first (ollama pull <name>).")
    users_collection.update_one({"username":current_user.username},{"$set":{"models":clean}})
    return await get_my_models(current_user)

if __name__=="__main__":
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)