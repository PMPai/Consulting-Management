from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.benefit_entry import BenefitEntry
from app.models.user import User
from app.schemas.benefit import BenefitCreate, BenefitOut, BenefitUpdate
from app.schemas.common import success
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/benefit-entries", tags=["benefits"])


@router.get("")
async def list_benefits(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
    status: str | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(BenefitEntry.project_id == projectId)
    if status:
        filters.append(BenefitEntry.status == status)
    records, total = list_records(db, BenefitEntry, user.organization_id, params, filters)
    return success(
        [BenefitOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.post("")
async def create_benefit(
    body: BenefitCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = create_record(db, BenefitEntry, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(BenefitOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{benefit_id}")
async def update_benefit(
    benefit_id: UUID,
    body: BenefitUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, BenefitEntry, user.organization_id, benefit_id)
    data = body.model_dump(exclude_unset=True)

    if data.get("status") == "verified" and record.status != "verified":
        record.verified_by = user.id
        record.verified_at = datetime.now(timezone.utc)

    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(BenefitOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{benefit_id}")
async def delete_benefit(
    benefit_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, BenefitEntry, user.organization_id, benefit_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
