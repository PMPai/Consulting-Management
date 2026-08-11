from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ProjectBase(BaseModel):
    client_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = None
    owner_user_id: UUID
    objective: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str = Field("planning", pattern="^(planning|active|on_hold|completed|cancelled)$")
    billing_model: str = Field("hourly", pattern="^(hourly|fixed_fee|retainer|hybrid)$")
    estimated_client_benefit: Decimal | None = None
    total_quote: Decimal | None = None
    final_goal: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot precede start date")
        return self


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    client_id: UUID | None = None
    name: str | None = Field(None, min_length=1, max_length=255)
    code: str | None = None
    owner_user_id: UUID | None = None
    objective: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = Field(None, pattern="^(planning|active|on_hold|completed|cancelled)$")
    billing_model: str | None = Field(None, pattern="^(hourly|fixed_fee|retainer|hybrid)$")
    estimated_client_benefit: Decimal | None = None
    total_quote: Decimal | None = None
    final_goal: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot precede start date")
        return self


class ProjectOut(BaseModel):
    id: UUID
    organization_id: UUID
    client_id: UUID
    name: str
    code: str | None
    owner_user_id: UUID
    objective: str | None
    description: str | None
    start_date: date | None
    end_date: date | None
    status: str
    billing_model: str
    estimated_client_benefit: Decimal | None
    total_quote: Decimal | None
    final_goal: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    archived_at: datetime | None
    created_by: UUID | None
    updated_by: UUID | None
    version: int

    model_config = {"from_attributes": True}
