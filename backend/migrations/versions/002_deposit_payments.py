"""Track hosted buyer deposit checkout sessions.

Revision ID: 002_deposit_payments
Revises: 001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = '002_deposit_payments'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Existing installations also create missing tables at application startup.
    if sa.inspect(op.get_bind()).has_table('deposit_payments'):
        return
    op.create_table(
        'deposit_payments',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('breeder_id', sa.String, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('buyer_id', sa.String, sa.ForeignKey('buyers.id'), nullable=False),
        sa.Column('litter_id', sa.String, sa.ForeignKey('litters.id'), nullable=False),
        sa.Column('amount_cents', sa.Integer, nullable=False),
        sa.Column('stripe_session_id', sa.String, unique=True),
        sa.Column('stripe_payment_intent_id', sa.String, unique=True),
        sa.Column('status', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_deposit_payments_breeder_id', 'deposit_payments', ['breeder_id'])


def downgrade():
    op.drop_index('ix_deposit_payments_breeder_id', table_name='deposit_payments')
    op.drop_table('deposit_payments')
