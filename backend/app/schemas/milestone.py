from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MilestoneBase(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    name: str = Field(..., min_length=1, max_length=255)
    date: datetime | None = None
    description: str | None = None


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    phase_id: UUID | None = None
    date: datetime | None = None
    status: str | None = Field(None, pattern="^(pending|completed)$")
    description: str | None = None


class MilestoneOut(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    phase_id: UUID | None
    name: str
    date: datetime | None
    status: str
    description: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None

    model_config = {"from_attributes": True}
