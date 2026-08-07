"""Remove viewer role; add company_name to users

Revision ID: 0006_remove_viewer_role_add_company
Revises: 0005_notifications
Create Date: 2026-08-07

Every registered user is a developer with full product access; the read-only
viewer tier is gone. Existing viewer accounts are promoted to developer, the
role check constraint and server default are updated, and a nullable
company_name column is added for the registration form.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_remove_viewer_role_add_company"
down_revision: str | None = "0005_notifications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("company_name", sa.String(length=200), nullable=True))

    # No viewer accounts remain: every existing viewer becomes a developer.
    op.execute("UPDATE users SET role = 'developer' WHERE role = 'viewer'")

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "role",
            existing_type=sa.String(length=20),
            server_default=sa.text("'developer'"),
            existing_nullable=False,
        )
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint("ck_users_role", "role IN ('admin', 'developer')")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint(
            "ck_users_role", "role IN ('admin', 'developer', 'viewer')"
        )
        batch_op.alter_column(
            "role",
            existing_type=sa.String(length=20),
            server_default=sa.text("'viewer'"),
            existing_nullable=False,
        )
    op.drop_column("users", "company_name")
