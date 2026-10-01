from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from db import users_collection

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None
    system_prompt: str | None = None

class UserInDB(User):
    hashed_password: str

class UserSignup(BaseModel):
    username: str
    email: str
    full_name: str | None = None
    password: str


password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummypassword")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)
def get_password_hash(password):
    return password_hash.hash(password)
def get_user(username: str):
    user = users_collection.find_one({"username": username})
    if user:
        return UserInDB(**user)
    
def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        verify_password(password, DUMMY_HASH)
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException( status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"},)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except InvalidTokenError:
        raise credentials_exception
    user = get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)],):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user