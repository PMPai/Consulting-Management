from uuid import UUID

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    organization_id: UUID
    timezone: str
    status: str


class AuthResponse(BaseModel):
    user: UserOut
    tokens: TokenResponse
