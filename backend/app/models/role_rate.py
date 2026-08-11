import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RoleRate(Base):
    __tablename__ = "role_rates"
    __table_args__ = (UniqueConstraint("organization_id", "role", name="uq_role_rates_org_role"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        Enum("owner", "assistant", "consultant", "viewer", name="role_rate_role"), nullable=False
    )
    internal_cost_rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    client_billing_rate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
