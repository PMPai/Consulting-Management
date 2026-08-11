from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FileOut(BaseModel):
    id: UUID
    project_id: UUID
    phase_id: UUID | None
    filename: str
    file_type: str | None
    file_size: int | None
    description: str | None
    category: str | None
    uploaded_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FileCreate(BaseModel):
    project_id: UUID
    phase_id: UUID | None = None
    description: str | None = None
    category: str = Field("contract", pattern="^(contract|agreement|attachment|report|other)$")
