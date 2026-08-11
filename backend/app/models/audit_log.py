import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_type: Mapped[str] = mapped_column(
        Enum("user", "api_key", "system", name="actor_type"), nullable=False, default="user"
    )
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    operation: Mapped[str] = mapped_column(String(32), nullable=False)
    before_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
