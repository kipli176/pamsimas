from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    nama_lengkap: str
    role: str  # 'admin' or 'petugas'


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    password: Optional[str] = None
    aktif: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    aktif: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
