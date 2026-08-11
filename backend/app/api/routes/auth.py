from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.password import hash_password, verify_password
from app.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserOut
from app.schemas.common import success

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(
            User.email == body.email,
            User.deleted_at.is_(None),
            User.status == "active",
        )
    ).scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}},
        )

    extra = {"org_id": str(user.organization_id), "role": user.role}
    tokens = TokenResponse(
        access_token=create_access_token(str(user.id), extra),
        refresh_token=create_refresh_token(str(user.id), extra),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return success({
        "user": UserOut(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            organization_id=user.organization_id,
            timezone=user.timezone,
            status=user.status,
        ).model_dump(mode="json"),
        "tokens": tokens.model_dump(mode="json"),
    })


@router.post("/refresh")
async def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Invalid refresh token"}},
        ) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Wrong token type"}},
        )

    user_id = payload.get("sub")
    org_id = payload.get("org_id")
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
            detail={"error": {"code": "UNAUTHORIZED", "message": "User not found"}},
        )

    extra = {"org_id": str(user.organization_id), "role": user.role}
    tokens = TokenResponse(
        access_token=create_access_token(str(user.id), extra),
        refresh_token=create_refresh_token(str(user.id), extra),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return success(tokens.model_dump(mode="json"))


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    return success({"message": "Logged out"})


@router.post("/setup")
async def setup(body: dict, db: Session = Depends(get_db)):
    """Initial setup — creates the first organization and owner user.
    Only works if no organizations exist yet.
    """
    org_count = db.execute(select(func.count(Organization.id))).scalar()
    if org_count and org_count > 0:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "ALREADY_SETUP", "message": "System is already initialized"}},
        )

    org = Organization(
        id=__import__("uuid").uuid4(),
        name=body.get("org_name", "Default Organization"),
        currency=body.get("currency", "USD"),
        default_timezone=body.get("timezone", "UTC"),
    )
    db.add(org)
    db.flush()

    user = User(
        id=__import__("uuid").uuid4(),
        organization_id=org.id,
        email=body["email"],
        name=body["name"],
        role="owner",
        password_hash=hash_password(body["password"]),
        timezone=org.default_timezone,
        status="active",
    )
    db.add(user)
    db.commit()

    extra = {"org_id": str(org.id), "role": "owner"}
    tokens = TokenResponse(
        access_token=create_access_token(str(user.id), extra),
        refresh_token=create_refresh_token(str(user.id), extra),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return success({
        "user": UserOut(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            organization_id=user.organization_id,
            timezone=user.timezone,
            status=user.status,
        ).model_dump(mode="json"),
        "tokens": tokens.model_dump(mode="json"),
    })


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return success(UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        organization_id=user.organization_id,
        timezone=user.timezone,
        status=user.status,
    ).model_dump(mode="json"))
