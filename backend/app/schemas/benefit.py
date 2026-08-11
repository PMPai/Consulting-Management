from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BenefitBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    benefit_name: str = Field(..., min_length=1, max_length=255)
    benefit_type: str = Field("other", pattern="^(incremental_revenue|labor_savings|tool_savings|loss_avoidance|efficiency_gain|other)$")
    observation_date: date
    amount: Decimal = Field(..., ge=0)
    status: str = Field("estimated", pattern="^(estimated|verified)$")
    notes: str | None = None


class BenefitCreate(BenefitBase):
    pass


class BenefitUpdate(BaseModel):
    benefit_name: str | None = Field(None, min_length=1, max_length=255)
    benefit_type: str | None = Field(None, pattern="^(incremental_revenue|labor_savings|tool_savings|loss_avoidance|efficiency_gain|other)$")
    amount: Decimal | None = Field(None, ge=0)
    status: str | None = Field(None, pattern="^(estimated|verified)$")
    notes: str | None = None


class BenefitOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    phase_id: UUID | None
    benefit_name: str
    benefit_type: str
    observation_date: date
    amount: Decimal
    status: str
    notes: str | None
    verified_by: UUID | None
    verified_at: object | None
    created_at: object
    updated_at: object
    deleted_at: object | None
    version: int

    model_config = {"from_attributes": True}
