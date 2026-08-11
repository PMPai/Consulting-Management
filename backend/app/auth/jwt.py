from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt

from app.config import settings


def create_access_token(subject: str, extra_claims: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "access",
        **extra_claims,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str, extra_claims: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        **extra_claims,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token. Raises JWTError on invalid/expired."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
