import uuid
from datetime import datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import BaseRecord


class BenefitEntry(Base, BaseRecord):
    __tablename__ = "benefit_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    phase_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("phases.id"), nullable=True)
    benefit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    benefit_type: Mapped[str] = mapped_column(
        Enum("incremental_revenue", "labor_savings", "tool_savings",
             "loss_avoidance", "efficiency_gain", "other", name="benefit_type"),
        nullable=False,
        default="other",
    )
    observation_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("estimated", "verified", name="benefit_status"),
        nullable=False,
        default="estimated",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
