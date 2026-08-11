from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_owner
from app.models.role_rate import RoleRate
from app.models.user import User
from app.schemas.common import success

router = APIRouter(prefix="/role-rates", tags=["role-rates"])

VALID_ROLES = ["owner", "assistant", "consultant", "viewer"]


@router.get("")
async def list_role_rates(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rates = db.execute(
        select(RoleRate).where(RoleRate.organization_id == user.organization_id)
    ).scalars().all()

    existing = {r.role: r for r in rates}
    result = []
    for role in VALID_ROLES:
        if role in existing:
            r = existing[role]
            result.append({
                "id": str(r.id),
                "role": r.role,
                "internal_cost_rate": str(r.internal_cost_rate),
                "client_billing_rate": str(r.client_billing_rate),
            })
        else:
            result.append({
                "id": None,
                "role": role,
                "internal_cost_rate": "0.00",
                "client_billing_rate": "0.00",
            })
    return success(result)


@router.put("/{role}")
async def update_role_rate(
    role: str,
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner),
):
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_ROLE", "message": f"Role must be one of: {', '.join(VALID_ROLES)}"}},
        )

    existing = db.execute(
        select(RoleRate).where(
            RoleRate.organization_id == user.organization_id,
            RoleRate.role == role,
        )
    ).scalar_one_or_none()

    cost_rate = Decimal(str(body.get("internal_cost_rate", "0")))
    billing_rate = Decimal(str(body.get("client_billing_rate", "0")))

    if existing:
        existing.internal_cost_rate = cost_rate
        existing.client_billing_rate = billing_rate
    else:
        import uuid
        existing = RoleRate(
            id=uuid.uuid4(),
            organization_id=user.organization_id,
            role=role,
            internal_cost_rate=cost_rate,
            client_billing_rate=billing_rate,
        )
        db.add(existing)

    db.flush()
    db.commit()
    return success({
        "id": str(existing.id),
        "role": existing.role,
        "internal_cost_rate": str(existing.internal_cost_rate),
        "client_billing_rate": str(existing.client_billing_rate),
    })
