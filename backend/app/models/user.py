from typing import Optional
from sqlmodel import SQLModel, Field

class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    role: str = "technician"  # technician, service_advisor, owner

class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str

class UserCreate(UserBase):
    password: str

class UserLogin(SQLModel):
    username: str
    password: str

class UserResponse(SQLModel):
    id: int
    username: str
    role: str
