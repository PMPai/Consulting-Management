from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class PhaseBase(BaseModel):
    project_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    status: str = Field("not_started", pattern="^(not_started|in_progress|completed|on_hold)$")
    completion_pct: int = Field(0, ge=0, le=100)
    planned_hours: Decimal | None = None
    owner_user_id: UUID | None = None
    color: str | None = None
    display_order: int = 0
    predecessor_ids: list[UUID] = []
    kpi_definition: str | None = None
    milestone_goal: str | None = None
    estimated_expense: Decimal | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("Phase end date cannot precede start date")
        return self


class PhaseCreate(PhaseBase):
    pass


class PhaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = Field(None, pattern="^(not_started|in_progress|completed|on_hold)$")
    completion_pct: int | None = Field(None, ge=0, le=100)
    planned_hours: Decimal | None = None
    owner_user_id: UUID | None = None
    color: str | None = None
    display_order: int | None = None
    predecessor_ids: list[UUID] | None = None
    kpi_definition: str | None = None
    milestone_goal: str | None = None
    estimated_expense: Decimal | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("Phase end date cannot precede start date")
        return self


class PhaseOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    name: str
    start_date: date | None
    end_date: date | None
    status: str
    completion_pct: int
    planned_hours: Decimal | None
    owner_user_id: UUID | None
    color: str | None
    display_order: int
    predecessor_ids: list[UUID] | None
    kpi_definition: str | None
    milestone_goal: str | None
    estimated_expense: Decimal | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    version: int

    model_config = {"from_attributes": True}
