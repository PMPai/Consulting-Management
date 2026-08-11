from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TimeEntryBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    work_date: datetime
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int = Field(0, ge=0)
    billable: bool = True
    source: str = Field("manual", pattern="^(manual|timer|external)$")


class TimeEntryCreate(TimeEntryBase):
    pass


class TimeEntryUpdate(BaseModel):
    phase_id: UUID | None = None
    work_date: datetime | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_minutes: int | None = Field(None, ge=0)
    billable: bool | None = None


class TimeEntryOut(BaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    project_id: UUID
    phase_id: UUID | None
    work_date: datetime
    start_time: datetime | None
    end_time: datetime | None
    duration_minutes: int
    billable: bool
    internal_cost_rate_snapshot: Decimal
    client_billing_rate_snapshot: Decimal
    labor_cost: Decimal
    billable_amount: Decimal
    source: str
    timer_status: str | None
    timer_started_at: datetime | None
    accumulated_paused_seconds: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    version: int

    model_config = {"from_attributes": True}


class TimerStart(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None


class TimerStop(BaseModel):
    activity_summary: str = Field(..., min_length=1)
    activity_details: str | None = None
    tags: list[str] = []
    visibility: str = Field("internal", pattern="^(private|internal|client_visible)$")


class WorkRecordOut(BaseModel):
    id: UUID
    time_entry_id: UUID
    activity_summary: str
    activity_details: str | None
    tags: list[str] | None
    visibility: str

    model_config = {"from_attributes": True}
