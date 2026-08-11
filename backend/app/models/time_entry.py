import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import BaseRecord


class TimeEntry(Base, BaseRecord):
    __tablename__ = "time_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    phase_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("phases.id"), nullable=True)
    work_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    billable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    internal_cost_rate_snapshot: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    client_billing_rate_snapshot: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    labor_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    billable_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    source: Mapped[str] = mapped_column(
        Enum("manual", "timer", "external", name="time_entry_source"), nullable=False, default="manual"
    )
    timer_status: Mapped[str | None] = mapped_column(
        Enum("running", "paused", "stopped", name="timer_status"), nullable=True
    )
    timer_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accumulated_paused_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
