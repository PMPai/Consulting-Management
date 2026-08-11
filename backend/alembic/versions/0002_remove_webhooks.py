"""remove webhooks

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-12

Removes webhook_subscriptions and webhook_deliveries tables.
Webhooks are no longer part of the system per user decision.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("webhook_deliveries")
    op.drop_table("webhook_subscriptions")


def downgrade() -> None:
    import sqlalchemy as sa
    from sqlalchemy.dialects.postgresql import UUID, ENUM, ARRAY

    webhook_status = ENUM("active", "disabled", name="webhook_status", create_type=True)
    delivery_status = ENUM("pending", "delivered", "failed", name="delivery_status", create_type=True)

    op.create_table(
        "webhook_subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("events", ARRAY(sa.String), nullable=True),
        sa.Column("secret_hmac", sa.String(512), nullable=False),
        sa.Column("status", webhook_status, nullable=False, server_default="active"),
        sa.Column("failure_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "webhook_deliveries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("subscription_id", UUID(as_uuid=True), sa.ForeignKey("webhook_subscriptions.id"), nullable=False, index=True),
        sa.Column("event_id", sa.String(64), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", sa.Text, nullable=False),
        sa.Column("status", delivery_status, nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_code", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
