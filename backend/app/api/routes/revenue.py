from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.revenue_entry import RevenueEntry
from app.models.user import User
from app.schemas.common import success
from app.schemas.revenue import RevenueCreate, RevenueOut, RevenueUpdate
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/revenue-entries", tags=["revenue"])


@router.get("")
async def list_revenue(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(RevenueEntry.project_id == projectId)
    records, total = list_records(db, RevenueEntry, user.organization_id, params, filters)
    return success(
        [RevenueOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.post("")
async def create_revenue(
    body: RevenueCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = create_record(db, RevenueEntry, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(RevenueOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{revenue_id}")
async def update_revenue(
    revenue_id: UUID,
    body: RevenueUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, RevenueEntry, user.organization_id, revenue_id)
    data = body.model_dump(exclude_unset=True)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(RevenueOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{revenue_id}")
async def delete_revenue(
    revenue_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, RevenueEntry, user.organization_id, revenue_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
