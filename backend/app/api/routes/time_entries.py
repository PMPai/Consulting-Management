from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_write
from app.domain.time_calc import billable_amount, labor_cost
from app.models.role_rate import RoleRate
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.models.work_record import WorkRecord
from app.schemas.common import success
from app.schemas.time_entry import (
    TimeEntryCreate,
    TimeEntryOut,
    TimeEntryUpdate,
    TimerStart,
    TimerStop,
    WorkRecordOut,
)
from app.services.crud import (
    create_record,
    get_by_id,
    list_records,
    parse_list_params,
    soft_delete,
    update_record,
)

router = APIRouter(prefix="/time-entries", tags=["time-entries"])


def _get_role_rates(db: Session, org_id: UUID, role: str) -> RoleRate:
    rate = db.execute(
        select(RoleRate).where(RoleRate.organization_id == org_id, RoleRate.role == role)
    ).scalar_one_or_none()
    return rate


@router.get("")
async def list_time_entries(
    request: Request,
    db: Session = Depends(get_db),
    params=Depends(parse_list_params),
    user: User = Depends(get_current_user),
    projectId: UUID | None = Query(None),
    userId: UUID | None = Query(None),
):
    filters = []
    if projectId:
        filters.append(TimeEntry.project_id == projectId)
    if userId:
        filters.append(TimeEntry.user_id == userId)
    records, total = list_records(db, TimeEntry, user.organization_id, params, filters)
    return success(
        [TimeEntryOut.model_validate(r).model_dump(mode="json") for r in records],
        page=params.page,
        pageSize=params.page_size,
        total=total,
    )


@router.get("/{entry_id}")
async def get_time_entry(
    entry_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.post("")
async def create_time_entry(
    body: TimeEntryCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    rate = _get_role_rates(db, user.organization_id, user.role)
    cost_rate = Decimal(str(rate.internal_cost_rate)) if rate else Decimal("0")
    billing_rate = Decimal(str(rate.client_billing_rate)) if rate else Decimal("0")

    lc = labor_cost(body.duration_minutes, cost_rate)
    ba = billable_amount(body.duration_minutes, billing_rate, body.billable)

    data = body.model_dump()
    data["user_id"] = user.id
    data["internal_cost_rate_snapshot"] = cost_rate
    data["client_billing_rate_snapshot"] = billing_rate
    data["labor_cost"] = lc
    data["billable_amount"] = ba

    record = create_record(db, TimeEntry, user.organization_id, data, user.id)
    db.commit()
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.patch("/{entry_id}")
async def update_time_entry(
    entry_id: UUID,
    body: TimeEntryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
    if_match: int | None = Header(None, alias="If-Match"),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)
    data = body.model_dump(exclude_unset=True)

    if "duration_minutes" in data and data["duration_minutes"] is not None:
        cost_rate = Decimal(str(record.internal_cost_rate_snapshot))
        billing_rate = Decimal(str(record.client_billing_rate_snapshot))
        data["labor_cost"] = labor_cost(data["duration_minutes"], cost_rate)
        data["billable_amount"] = billable_amount(
            data["duration_minutes"], billing_rate, record.billable
        )

    record = update_record(db, record, data, user.id, expected_version=if_match)
    db.commit()
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.delete("/{entry_id}")
async def delete_time_entry(
    entry_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)
    soft_delete(db, record, user.id)
    db.commit()
    return success({"id": str(record.id), "deleted": True})


@router.post("/timer/start")
async def start_timer(
    body: TimerStart,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    existing = db.execute(
        select(TimeEntry).where(
            TimeEntry.user_id == user.id,
            TimeEntry.organization_id == user.organization_id,
            TimeEntry.timer_status == "running",
            TimeEntry.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "TIMER_ALREADY_RUNNING",
                    "message": "You already have a running timer",
                    "details": [{"timer_id": str(existing.id)}],
                }
            },
        )

    rate = _get_role_rates(db, user.organization_id, user.role)
    cost_rate = Decimal(str(rate.internal_cost_rate)) if rate else Decimal("0")
    billing_rate = Decimal(str(rate.client_billing_rate)) if rate else Decimal("0")

    now = datetime.now(timezone.utc)
    record = TimeEntry(
        organization_id=user.organization_id,
        user_id=user.id,
        project_id=body.project_id,
        phase_id=body.phase_id,
        work_date=now,
        duration_minutes=0,
        billable=True,
        internal_cost_rate_snapshot=cost_rate,
        client_billing_rate_snapshot=billing_rate,
        labor_cost=Decimal("0"),
        billable_amount=Decimal("0"),
        source="timer",
        timer_status="running",
        timer_started_at=now,
        accumulated_paused_seconds=0,
        created_by=user.id,
        updated_by=user.id,
        version=1,
    )
    db.add(record)
    db.flush()

    wr = WorkRecord(
        organization_id=user.organization_id,
        time_entry_id=record.id,
        activity_summary="Timer running — summary pending",
        visibility="internal",
    )
    db.add(wr)
    db.commit()
    db.refresh(record)
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.post("/timer/{entry_id}/stop")
async def stop_timer(
    entry_id: UUID,
    body: TimerStop,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)

    if record.timer_status != "running":
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "TIMER_NOT_RUNNING", "message": "Timer is not running"}},
        )

    now = datetime.now(timezone.utc)
    elapsed = int((now - record.timer_started_at).total_seconds())
    record.duration_minutes = max(elapsed // 60, 0)
    record.end_time = now
    record.timer_status = "stopped"

    cost_rate = Decimal(str(record.internal_cost_rate_snapshot))
    billing_rate = Decimal(str(record.client_billing_rate_snapshot))
    record.labor_cost = labor_cost(record.duration_minutes, cost_rate)
    record.billable_amount = billable_amount(record.duration_minutes, billing_rate)
    record.version += 1

    wr = db.execute(
        select(WorkRecord).where(WorkRecord.time_entry_id == record.id)
    ).scalar_one_or_none()
    if wr:
        wr.activity_summary = body.activity_summary
        wr.activity_details = body.activity_details
        wr.tags = body.tags
        wr.visibility = body.visibility
    else:
        wr = WorkRecord(
            organization_id=user.organization_id,
            time_entry_id=record.id,
            activity_summary=body.activity_summary,
            activity_details=body.activity_details,
            tags=body.tags,
            visibility=body.visibility,
        )
        db.add(wr)

    db.flush()
    db.commit()
    db.refresh(record)
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.post("/timer/{entry_id}/pause")
async def pause_timer(
    entry_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)
    if record.timer_status != "running":
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "TIMER_NOT_RUNNING", "message": "Timer is not running"}},
        )
    record.timer_status = "paused"
    db.flush()
    db.commit()
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.post("/timer/{entry_id}/resume")
async def resume_timer(
    entry_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_write),
):
    record = get_by_id(db, TimeEntry, user.organization_id, entry_id)
    if record.timer_status != "paused":
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "TIMER_NOT_PAUSED", "message": "Timer is not paused"}},
        )
    record.timer_status = "running"
    db.flush()
    db.commit()
    return success(TimeEntryOut.model_validate(record).model_dump(mode="json"))


@router.get("/{entry_id}/work-record")
async def get_work_record(
    entry_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_by_id(db, TimeEntry, user.organization_id, entry_id)
    wr = db.execute(
        select(WorkRecord).where(WorkRecord.time_entry_id == entry_id)
    ).scalar_one_or_none()
    if not wr:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Work record not found"}},
        )
    return success(WorkRecordOut.model_validate(wr).model_dump(mode="json"))
