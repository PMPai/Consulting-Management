import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ExpenseBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    date: datetime.date
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field("other", pattern="^(ai_tools|saas_software|cloud_services|data_services|travel|contractors|equipment|other)$")
    supplier: str | None = None
    amount: Decimal = Field(..., ge=0)
    billable_to_client: bool = False
    notes: str | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, pattern="^(ai_tools|saas_software|cloud_services|data_services|travel|contractors|equipment|other)$")
    supplier: str | None = None
    amount: Decimal | None = Field(None, ge=0)
    billable_to_client: bool | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    phase_id: UUID | None
    date: datetime.date
    name: str
    category: str
    supplier: str | None
    amount: Decimal
    billable_to_client: bool
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    deleted_at: datetime.datetime | None
    version: int

    model_config = {"from_attributes": True}
