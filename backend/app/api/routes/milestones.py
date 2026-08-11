from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.models.milestone import Milestone
from app.models.user import User
from app.schemas.common import success
from app.schemas.milestone import MilestoneCreate, MilestoneOut, MilestoneUpdate
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("")
async def list_milestones(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
    phaseId: UUID | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(Milestone.project_id == projectId)
    if phaseId:
        filters.append(Milestone.phase_id == phaseId)
    records, total = list_records(db, Milestone, user.organization_id, params, filters)
    return success(
        [MilestoneOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{milestone_id}")
async def get_milestone(
    milestone_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, Milestone, user.organization_id, milestone_id)
    return success(MilestoneOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_milestone(
    body: MilestoneCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = create_record(db, Milestone, user.organization_id, body.model_dump(), user.id)
    db.commit()
    return success(MilestoneOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{milestone_id}")
async def update_milestone(
    milestone_id: UUID,
    body: MilestoneUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, Milestone, user.organization_id, milestone_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("status") == "completed":
        record.completed_at = datetime.now(timezone.utc)
    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(MilestoneOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{milestone_id}")
async def delete_milestone(
    milestone_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, Milestone, user.organization_id, milestone_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})
