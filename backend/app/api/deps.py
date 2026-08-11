from fastapi import Depends, Header, HTTPException, Request
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import decode_token
from app.database import SessionLocal
from app.models.user import User


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    authorization: str | None = Header(None),
) -> User:
    """Extract and validate JWT, return the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing or invalid token"}},
        )

    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Invalid or expired token"}},
        ) from exc

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Wrong token type"}},
        )

    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    if not user_id or not org_id:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Invalid token claims"}},
        )

    user = db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == org_id,
            User.deleted_at.is_(None),
            User.status == "active",
        )
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "User not found or inactive"}},
        )

    request.state.current_user = user
    request.state.organization_id = user.organization_id
    return user


def require_owner(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("owner", "assistant"):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Owner or assistant role required"}},
        )
    return user


def require_write(user: User = Depends(get_current_user)) -> User:
    if user.role == "viewer":
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN", "message": "Write access required"}},
        )
    return user
