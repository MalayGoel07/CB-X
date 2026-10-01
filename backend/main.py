from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List
from general import (
    M_CODER,
    M_MATH,
    M_MERGER,
    M_RESEARCH,
    M_ROUTER,
    M_WRITER,
    Message,
    orchestrate,
)
import uvicorn
from db import users_collection
from security import Token, UserSignup, authenticate_user, create_access_token, get_password_hash,get_current_active_user,User
from datetime import timedelta
from typing import Annotated
from fastapi import Depends, HTTPException
from dotenv import load_dotenv
import os
from uuid import uuid4

load_dotenv()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

app = FastAPI(title="Orch-7 API", version="0.0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: List[Message] = []

class ChatSession(BaseModel):
    id: str
    title: str
    messages: List[Message] = Field(default_factory=list)

class ChatsUpdate(BaseModel):
    chats: List[ChatSession]

@app.get("/")
async def root():
    return {"message": "orch-7 is running!"}

@app.get("/models")
async def get_models():
    return {
        "models": [
            {"role": "Router", "model": M_ROUTER},
            {"role": "Research", "model": M_RESEARCH},
            {"role": "Writer", "model": M_WRITER},
            {"role": "Coder", "model": M_CODER},
            {"role": "Maths", "model": M_MATH},
            {"role": "Merger", "model": M_MERGER},
        ]
    }

@app.post("/auth/login")
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=access_token, token_type="bearer")


@app.post("/auth/signup")
async def signup(user: UserSignup) -> Token:
    existing = users_collection.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = get_password_hash(user.password)
    users_collection.insert_one({
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "hashed_password": hashed,
        "disabled": False
    })
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    nickname: str | None = None
    instructions: str | None = None

@app.put("/me")
async def update_me(
    data: ProfileUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    users_collection.update_one(
        {"username": current_user.username},
        {
            "$set": {
                "full_name": data.full_name,
                "nickname": data.nickname,
                "instructions": data.instructions
            }
        }
    )

    return {"message": "Profile updated"}

@app.get("/me")
async def get_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    user = users_collection.find_one(
        {"username": current_user.username}
    )

    return {
        "username": user.get("full_name", user["username"]),
        "email": user.get("email", ""),
        "nickname": user.get("nickname", ""),
        "instructions": user.get("instructions", "")
    }

@app.post("/chat")
async def chat(req: ChatRequest, current_user: Annotated[User, Depends(get_current_active_user)]):
    return StreamingResponse(orchestrate(req.message, req.history), media_type="text/event-stream")

@app.get("/history")
async def get_history(current_user: Annotated[User, Depends(get_current_active_user)]):
    user = users_collection.find_one({"username": current_user.username})
    return {"history": user.get("history", [])}

@app.post("/history")
async def save_history(
    data: dict,
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    users_collection.update_one(
        {"username": current_user.username},
        {"$set": {"history": data["history"]}}
    )
    return {"message": "History saved"}

@app.get("/chats")
async def get_chats(current_user: Annotated[User, Depends(get_current_active_user)]):
    user = users_collection.find_one({"username": current_user.username})
    chats = user.get("chats")
    if chats is not None:
        return {"chats": chats}

    legacy_history = user.get("history", [])
    chats = []
    if legacy_history:
        first_prompt = next(
            (message["content"] for message in legacy_history if message.get("role") == "user"),
            "Imported chat",
        )
        chats.append({
            "id": str(uuid4()),
            "title": first_prompt[:60],
            "messages": legacy_history,
        })
        users_collection.update_one(
            {"username": current_user.username},
            {"$set": {"chats": chats}},
        )
    return {"chats": chats}

@app.post("/chats")
async def save_chats(
    data: ChatsUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    users_collection.update_one(
        {"username": current_user.username},
        {"$set": {"chats": [chat.model_dump() for chat in data.chats]}},
    )
    return {"message": "Chats saved"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)