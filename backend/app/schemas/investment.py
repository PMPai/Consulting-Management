import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class InvestmentBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    date: datetime.date
    investment_type: str = Field("consulting_fees", pattern="^(consulting_fees|client_internal_labor|client_software|implementation|training|other)$")
    amount: Decimal = Field(..., ge=0)
    description: str | None = None
    status: str = Field("estimated", pattern="^(estimated|confirmed)$")


class InvestmentCreate(InvestmentBase):
    pass


class InvestmentUpdate(BaseModel):
    investment_type: str | None = Field(None, pattern="^(consulting_fees|client_internal_labor|client_software|implementation|training|other)$")
    amount: Decimal | None = Field(None, ge=0)
    description: str | None = None
    status: str | None = Field(None, pattern="^(estimated|confirmed)$")


class InvestmentOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    phase_id: UUID | None
    date: datetime.date
    investment_type: str
    amount: Decimal
    description: str | None
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    deleted_at: datetime.datetime | None
    version: int

    model_config = {"from_attributes": True}
