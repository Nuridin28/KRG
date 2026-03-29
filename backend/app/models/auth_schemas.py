"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    preferred_styles: list[str] | None = None
    preferred_gender: str | None = None
    city: str | None = None

    class Config:
        from_attributes = True
