"""Make all DateTime columns timezone-aware

Every DateTime column was created without timezone=True, and every value
written into them so far came from datetime.utcnow() — a real UTC instant,
just missing the tag saying so. That untagged value gets sent to the
frontend, where JavaScript's Date parser assumes an untagged timestamp is
already in the browser's local timezone, silently shifting every date/time
shown in the app forward by the user's UTC offset (visible as trial
countdowns and activity timestamps being several hours ahead of reality).

This migration converts every column to `timestamp with time zone` and
tags the existing data as UTC via `AT TIME ZONE 'UTC'` — this does NOT
change any stored instant, it only adds the missing timezone tag so
Postgres (and everything downstream) knows what it already meant.

Revision ID: 002_timezone_aware_datetimes
Revises: 001_initial
Create Date: 2026-08-10
"""
from alembic import op
import sqlalchemy as sa

revision = '002_timezone_aware_datetimes'
down_revision = '001_initial'
branch_labels = None
depends_on = None


# (table, column) pairs for every DateTime column in the schema
DATETIME_COLUMNS = [
    ('users', 'reset_token_expires'),
    ('users', 'trial_ends_at'),
    ('users', 'created_at'),
    ('users', 'updated_at'),
    ('users', 'last_login'),
    ('dogs', 'created_at'),
    ('dogs', 'updated_at'),
    ('litters', 'created_at'),
    ('litters', 'updated_at'),
    ('puppies', 'created_at'),
    ('buyers', 'last_contacted'),
    ('buyers', 'follow_up_date'),
    ('buyers', 'created_at'),
    ('buyers', 'updated_at'),
    ('buyer_litter_matches', 'created_at'),
    ('contracts', 'sent_at'),
    ('contracts', 'signed_at'),
    ('contracts', 'created_at'),
    ('contracts', 'updated_at'),
    ('health_records', 'created_at'),
    ('communications', 'sent_at'),
    ('leads', 'created_at'),
    ('contact_messages', 'created_at'),
]


def upgrade():
    for table, column in DATETIME_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE TIMESTAMP WITH TIME ZONE '
            f"USING {column} AT TIME ZONE 'UTC'"
        )


def downgrade():
    for table, column in DATETIME_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} '
            f'ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE '
            f"USING {column} AT TIME ZONE 'UTC'"
        )
