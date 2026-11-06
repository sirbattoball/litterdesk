"""Persist customer workflow details and credential revocation.

Revision ID: 003
Revises: 002
"""
from alembic import op
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    # Supports both migration-managed and legacy create_all installations.
    from sqlalchemy import inspect, text
    from app.schema_updates import ADDITIONS
    conn = op.get_bind()
    inspector = inspect(conn)
    for table, additions in ADDITIONS.items():
        present = {c['name'] for c in inspector.get_columns(table)}
        for column, definition in additions.items():
            if column not in present:
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {definition}'))

def downgrade():
    # Preserve customer notes and credential versions on application rollback.
    pass
