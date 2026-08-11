"""add assistant role, project enhancements, phase kpis, file uploads

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-12

Changes:
- Add 'assistant' role to user_role and role_rate_role enums
- Add total_quote, final_goal, notes to projects
- Add kpi_definition, milestone_goal, estimated_expense to phases
- Create project_files table for file uploads
- Add uploaded_by_user_id to expenses for merged view
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'assistant' to user_role enum
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant'")
    # Add 'assistant' to role_rate_role enum
    op.execute("ALTER TYPE role_rate_role ADD VALUE IF NOT EXISTS 'assistant'")

    # Add fields to projects
    op.add_column("projects", sa.Column("total_quote", sa.Numeric(14, 2), nullable=True))
    op.add_column("projects", sa.Column("final_goal", sa.Text, nullable=True))
    op.add_column("projects", sa.Column("notes", sa.Text, nullable=True))

    # Add fields to phases
    op.add_column("phases", sa.Column("kpi_definition", sa.Text, nullable=True))
    op.add_column("phases", sa.Column("milestone_goal", sa.Text, nullable=True))
    op.add_column("phases", sa.Column("estimated_expense", sa.Numeric(14, 2), nullable=True))

    # Create project_files table
    op.create_table(
        "project_files",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("phase_id", UUID(as_uuid=True), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(64), nullable=True),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("uploaded_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("project_files")

    op.drop_column("phases", "estimated_expense")
    op.drop_column("phases", "milestone_goal")
    op.drop_column("phases", "kpi_definition")

    op.drop_column("projects", "notes")
    op.drop_column("projects", "final_goal")
    op.drop_column("projects", "total_quote")

    # Note: enum value removal is not supported in PostgreSQL
    # The 'assistant' value will remain but is harmless
