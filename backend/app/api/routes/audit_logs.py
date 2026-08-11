
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_owner
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.common import success
from app.services.crud import parse_list_params

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("")
async def list_audit_logs(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(require_owner),
    resourceType: str | None = Query(None),
    operation: str | None = Query(None),
):
    stmt = select(AuditLog).where(AuditLog.organization_id == user.organization_id)
    if resourceType:
        stmt = stmt.where(AuditLog.resource_type == resourceType)
    if operation:
        stmt = stmt.where(AuditLog.operation == operation)

    from sqlalchemy import func
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    stmt = stmt.order_by(AuditLog.timestamp.desc())
    offset = (params.page - 1) * params.page_size
    stmt = stmt.offset(offset).limit(params.page_size)
    records = db.execute(stmt).scalars().all()

    return success(
        [
            {
                "id": str(r.id),
                "request_id": r.request_id,
                "actor_id": str(r.actor_id) if r.actor_id else None,
                "actor_type": r.actor_type,
                "source": r.source,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "operation": r.operation,
                "failure_status": r.failure_status,
            }
            for r in records
        ],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )
