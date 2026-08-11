from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str | None = None
    primary_contact: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    code: str | None = None
    primary_contact: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str | None = Field(None, pattern="^(active|archived)$")
    notes: str | None = None


class ClientOut(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    code: str | None
    primary_contact: str | None
    email: str | None
    phone: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    created_by: UUID | None
    updated_by: UUID | None
    version: int

    model_config = {"from_attributes": True}
