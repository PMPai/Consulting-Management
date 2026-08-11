import uuid
from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import BaseRecord


class Phase(Base, BaseRecord):
    __tablename__ = "phases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("not_started", "in_progress", "completed", "on_hold", name="phase_status"),
        nullable=False,
        default="not_started",
    )
    completion_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    planned_hours: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    predecessor_ids: Mapped[list[str] | None] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    kpi_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    milestone_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_expense: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
