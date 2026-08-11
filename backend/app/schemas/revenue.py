import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class RevenueBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    date: datetime.date
    revenue_type: str = Field(..., min_length=1, max_length=64)
    amount: Decimal = Field(..., ge=0)
    status: str = Field("estimated", pattern="^(estimated|confirmed|received)$")
    notes: str | None = None


class RevenueCreate(RevenueBase):
    pass


class RevenueUpdate(BaseModel):
    revenue_type: str | None = Field(None, min_length=1, max_length=64)
    amount: Decimal | None = Field(None, ge=0)
    status: str | None = Field(None, pattern="^(estimated|confirmed|received)$")
    notes: str | None = None


class RevenueOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    phase_id: UUID | None
    date: datetime.date
    revenue_type: str
    amount: Decimal
    status: str
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    deleted_at: datetime.datetime | None
    version: int

    model_config = {"from_attributes": True}
