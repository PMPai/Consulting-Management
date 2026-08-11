import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_owner
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.common import success
from app.services.crud import (
    get_by_id,
    list_records,
    parse_list_params,
)

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def _generate_key() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, _hash_key(raw)


class ApiKeyCreate:
    def __init__(self, name: str, scopes: list[str] | None = None, expires_at: datetime | None = None):
        self.name = name
        self.scopes = scopes
        self.expires_at = expires_at


@router.get("")
async def list_api_keys(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(require_owner),
):
    records, total = list_records(db, ApiKey, user.organization_id, params)
    return success(
        [
            {
                "id": str(r.id),
                "name": r.name,
                "scopes": r.scopes,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
                "revoked_at": r.revoked_at.isoformat() if r.revoked_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.post("")
async def create_api_key(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
):
    raw_key, hashed = _generate_key()
    record = ApiKey(
        organization_id=user.organization_id,
        name=body.get("name", "API Key"),
        hashed_key=hashed,
        scopes=body.get("scopes"),
        expires_at=datetime.fromisoformat(body["expires_at"]) if body.get("expires_at") else None,
        created_by=user.id,
    )
    db.add(record)
    db.flush()
    db.commit()
    return success({
        "id": str(record.id),
        "name": record.name,
        "key": raw_key,
        "scopes": record.scopes,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None,
        "message": "Save this key securely. It will not be shown again.",
    })


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
):
    record = get_by_id(db, ApiKey, user.organization_id, key_id)
    record.revoked_at = datetime.now(timezone.utc)
    db.flush()
    db.commit()
    return success({"id": str(record.id), "revoked": True})
