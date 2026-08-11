"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-12

Full initial schema for 顾问项目 ROI 管理台.
All tables use org-level isolation, soft delete, and version-based optimistic concurrency.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM, ARRAY

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === Enum types ===
    user_role = ENUM("owner", "consultant", "viewer", name="user_role", create_type=True)
    user_status = ENUM("active", "inactive", name="user_status", create_type=True)
    role_rate_role = ENUM("owner", "consultant", "viewer", name="role_rate_role", create_type=True)
    client_status = ENUM("active", "archived", name="client_status", create_type=True)
    project_status = ENUM("planning", "active", "on_hold", "completed", "cancelled", name="project_status", create_type=True)
    billing_model = ENUM("hourly", "fixed_fee", "retainer", "hybrid", name="billing_model", create_type=True)
    phase_status = ENUM("not_started", "in_progress", "completed", "on_hold", name="phase_status", create_type=True)
    milestone_status = ENUM("pending", "completed", name="milestone_status", create_type=True)
    time_entry_source = ENUM("manual", "timer", "external", name="time_entry_source", create_type=True)
    timer_status = ENUM("running", "paused", "stopped", name="timer_status", create_type=True)
    work_record_visibility = ENUM("private", "internal", "client_visible", name="work_record_visibility", create_type=True)
    expense_category = ENUM("ai_tools", "saas_software", "cloud_services", "data_services", "travel", "contractors", "equipment", "other", name="expense_category", create_type=True)
    revenue_status = ENUM("estimated", "confirmed", "received", name="revenue_status", create_type=True)
    investment_type = ENUM("consulting_fees", "client_internal_labor", "client_software", "implementation", "training", "other", name="investment_type", create_type=True)
    investment_status = ENUM("estimated", "confirmed", name="investment_status", create_type=True)
    benefit_type = ENUM("incremental_revenue", "labor_savings", "tool_savings", "loss_avoidance", "efficiency_gain", "other", name="benefit_type", create_type=True)
    benefit_status = ENUM("estimated", "verified", name="benefit_status", create_type=True)
    webhook_status = ENUM("active", "disabled", name="webhook_status", create_type=True)
    delivery_status = ENUM("pending", "delivered", "failed", name="delivery_status", create_type=True)
    actor_type = ENUM("user", "api_key", "system", name="actor_type", create_type=True)

    # === organizations ===
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("default_timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === users ===
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="consultant"),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("status", user_status, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # === role_rates ===
    op.create_table(
        "role_rates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("role", role_rate_role, nullable=False),
        sa.Column("internal_cost_rate", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("client_billing_rate", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("organization_id", "role", name="uq_role_rates_org_role"),
    )

    # === clients ===
    op.create_table(
        "clients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(64), nullable=True),
        sa.Column("primary_contact", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("status", client_status, nullable=False, server_default="active"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === projects ===
    op.create_table(
        "projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(64), nullable=True),
        sa.Column("owner_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("objective", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", project_status, nullable=False, server_default="planning"),
        sa.Column("billing_model", billing_model, nullable=False, server_default="hourly"),
        sa.Column("estimated_client_benefit", sa.Numeric(14, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === phases ===
    op.create_table(
        "phases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("status", phase_status, nullable=False, server_default="not_started"),
        sa.Column("completion_pct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("planned_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("owner_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("color", sa.String(16), nullable=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("predecessor_ids", ARRAY(UUID(as_uuid=True)), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === milestones ===
    op.create_table(
        "milestones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("date", sa.Date, nullable=True),
        sa.Column("status", milestone_status, nullable=False, server_default="pending"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # === time_entries ===
    op.create_table(
        "time_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("work_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("billable", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("internal_cost_rate_snapshot", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("client_billing_rate_snapshot", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("labor_cost", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("billable_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("source", time_entry_source, nullable=False, server_default="manual"),
        sa.Column("timer_status", timer_status, nullable=True),
        sa.Column("timer_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accumulated_paused_seconds", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === work_records ===
    op.create_table(
        "work_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("time_entry_id", UUID(as_uuid=True), sa.ForeignKey("time_entries.id"), unique=True, nullable=False),
        sa.Column("activity_summary", sa.String(500), nullable=False),
        sa.Column("activity_details", sa.Text, nullable=True),
        sa.Column("tags", ARRAY(sa.String), nullable=True),
        sa.Column("visibility", work_record_visibility, nullable=False, server_default="internal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # === tool_expenses ===
    op.create_table(
        "tool_expenses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", expense_category, nullable=False, server_default="other"),
        sa.Column("supplier", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("billable_to_client", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === revenue_entries ===
    op.create_table(
        "revenue_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("revenue_type", sa.String(64), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", revenue_status, nullable=False, server_default="estimated"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === client_investments ===
    op.create_table(
        "client_investments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("investment_type", investment_type, nullable=False, server_default="consulting_fees"),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", investment_status, nullable=False, server_default="estimated"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === benefit_entries ===
    op.create_table(
        "benefit_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("benefit_name", sa.String(255), nullable=False),
        sa.Column("benefit_type", benefit_type, nullable=False, server_default="other"),
        sa.Column("observation_date", sa.Date, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", benefit_status, nullable=False, server_default="estimated"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("verified_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
    )

    # === api_keys ===
    op.create_table(
        "api_keys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_key", sa.String(512), nullable=False, unique=True),
        sa.Column("scopes", ARRAY(sa.String), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === webhook_subscriptions ===
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

    # === webhook_deliveries ===
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

    # === audit_logs ===
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("actor_id", UUID(as_uuid=True), nullable=True),
        sa.Column("actor_type", actor_type, nullable=False, server_default="user"),
        sa.Column("source", sa.String(64), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64), nullable=True),
        sa.Column("operation", sa.String(32), nullable=False),
        sa.Column("before_summary", sa.Text, nullable=True),
        sa.Column("after_summary", sa.Text, nullable=True),
        sa.Column("failure_status", sa.String(32), nullable=True),
    )

    # === Indexes for soft-delete filtering ===
    for table in ["clients", "projects", "phases", "milestones", "time_entries",
                  "work_records", "tool_expenses", "revenue_entries",
                  "client_investments", "benefit_entries"]:
        op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])


def downgrade() -> None:
    tables = [
        "audit_logs",
        "webhook_deliveries",
        "webhook_subscriptions",
        "api_keys",
        "benefit_entries",
        "client_investments",
        "revenue_entries",
        "tool_expenses",
        "work_records",
        "time_entries",
        "milestones",
        "phases",
        "projects",
        "clients",
        "role_rates",
        "users",
        "organizations",
    ]
    for table in tables:
        op.drop_table(table)

    # Drop enum types
    for enum_name in [
        "actor_type", "delivery_status", "webhook_status",
        "benefit_status", "benefit_type", "investment_status", "investment_type",
        "revenue_status", "expense_category", "work_record_visibility",
        "timer_status", "time_entry_source", "milestone_status",
        "phase_status", "billing_model", "project_status",
        "client_status", "role_rate_role", "user_status", "user_role",
    ]:
        ENUM(name=enum_name, create_type=False).drop(op.get_bind(), checkfirst=True)
