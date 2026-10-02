"""Persist frontend resources.

Revision ID: 7a31d48e2c10
Revises: c55808195aa4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7a31d48e2c10"
down_revision: Union[str, Sequence[str], None] = "c55808195aa4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("collection", sa.String(length=40), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_api_records_collection", "api_records", ["collection"])
    op.create_index("ix_api_records_collection_id", "api_records", ["collection", "id"])


def downgrade() -> None:
    op.drop_index("ix_api_records_collection_id", table_name="api_records")
    op.drop_index("ix_api_records_collection", table_name="api_records")
    op.drop_table("api_records")