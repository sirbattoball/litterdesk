"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01
"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('email', sa.String, unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String, nullable=False),
        sa.Column('full_name', sa.String, nullable=False),
        sa.Column('kennel_name', sa.String),
        sa.Column('phone', sa.String),
        sa.Column('address', sa.String),
        sa.Column('website', sa.String),
        sa.Column('breeds', sa.JSON, default=list),
        sa.Column('bio', sa.Text),
        sa.Column('subscription_plan', sa.String, default='free'),
        sa.Column('stripe_customer_id', sa.String),
        sa.Column('stripe_subscription_id', sa.String),
        sa.Column('subscription_active', sa.Boolean, default=False),
        sa.Column('trial_ends_at', sa.DateTime),
        sa.Column('stripe_account_id', sa.String),
        sa.Column('stripe_onboarded', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_login', sa.DateTime),
    )

    # Dogs
    op.create_table(
        'dogs',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('owner_id', sa.String, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String, nullable=False),
        sa.Column('registered_name', sa.String),
        sa.Column('breed', sa.String, nullable=False),
        sa.Column('sex', sa.String, nullable=False),
        sa.Column('dob', sa.Date),
        sa.Column('color', sa.String),
        sa.Column('weight_lbs', sa.Float),
        sa.Column('akc_number', sa.String),
        sa.Column('registration_org', sa.String),
        sa.Column('health_tests', sa.JSON, default=dict),
        sa.Column('health_notes', sa.Text),
        sa.Column('dna_profile', sa.String),
        sa.Column('color_genetics', sa.String),
        sa.Column('photo_url', sa.String),
        sa.Column('photos', sa.JSON, default=list),
        sa.Column('sire_id', sa.String, sa.ForeignKey('dogs.id')),
        sa.Column('dam_id', sa.String, sa.ForeignKey('dogs.id')),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_external', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Litters
    op.create_table(
        'litters',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('breeder_id', sa.String, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String),
        sa.Column('breed', sa.String, nullable=False),
        sa.Column('status', sa.String, default='planned'),
        sa.Column('sire_id', sa.String, sa.ForeignKey('dogs.id')),
        sa.Column('dam_id', sa.String, sa.ForeignKey('dogs.id')),
        sa.Column('breeding_date', sa.Date),
        sa.Column('due_date', sa.Date),
        sa.Column('whelp_date', sa.Date),
        sa.Column('go_home_date', sa.Date),
        sa.Column('num_males', sa.Integer, default=0),
        sa.Column('num_females', sa.Integer, default=0),
        sa.Column('puppy_price', sa.Float),
        sa.Column('deposit_amount', sa.Float),
        sa.Column('notes', sa.Text),
        sa.Column('photos', sa.JSON, default=list),
        sa.Column('waitlist_open', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Puppies
    op.create_table(
        'puppies',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('litter_id', sa.String, sa.ForeignKey('litters.id'), nullable=False),
        sa.Column('collar_color', sa.String),
        sa.Column('name', sa.String),
        sa.Column('sex', sa.String),
        sa.Column('birth_weight_oz', sa.Float),
        sa.Column('current_weight_oz', sa.Float),
        sa.Column('color', sa.String),
        sa.Column('markings', sa.String),
        sa.Column('notes', sa.Text),
        sa.Column('photo_url', sa.String),
        sa.Column('is_available', sa.Boolean, default=True),
        sa.Column('is_keeper', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Buyers
    op.create_table(
        'buyers',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('breeder_id', sa.String, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('full_name', sa.String, nullable=False),
        sa.Column('email', sa.String, nullable=False),
        sa.Column('phone', sa.String),
        sa.Column('city', sa.String),
        sa.Column('state', sa.String),
        sa.Column('breed_preference', sa.String),
        sa.Column('sex_preference', sa.String),
        sa.Column('color_preference', sa.String),
        sa.Column('lifestyle_notes', sa.Text),
        sa.Column('experience_level', sa.String),
        sa.Column('status', sa.String, default='inquiry'),
        sa.Column('priority_score', sa.Integer, default=50),
        sa.Column('referral_source', sa.String),
        sa.Column('ai_notes', sa.Text),
        sa.Column('last_contacted', sa.DateTime),
        sa.Column('follow_up_date', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Buyer-Litter matches
    op.create_table(
        'buyer_litter_matches',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('buyer_id', sa.String, sa.ForeignKey('buyers.id'), nullable=False),
        sa.Column('litter_id', sa.String, sa.ForeignKey('litters.id'), nullable=False),
        sa.Column('puppy_id', sa.String, sa.ForeignKey('puppies.id')),
        sa.Column('position', sa.Integer),
        sa.Column('deposit_paid', sa.Boolean, default=False),
        sa.Column('deposit_amount', sa.Float),
        sa.Column('stripe_payment_intent_id', sa.String),
        sa.Column('match_score', sa.Integer),
        sa.Column('match_notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Contracts
    op.create_table(
        'contracts',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('breeder_id', sa.String, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('buyer_id', sa.String, sa.ForeignKey('buyers.id'), nullable=False),
        sa.Column('litter_id', sa.String, sa.ForeignKey('litters.id')),
        sa.Column('status', sa.String, default='draft'),
        sa.Column('title', sa.String),
        sa.Column('content', sa.Text),
        sa.Column('template_vars', sa.JSON, default=dict),
        sa.Column('sale_price', sa.Float),
        sa.Column('deposit_amount', sa.Float),
        sa.Column('balance_due', sa.Float),
        sa.Column('balance_due_date', sa.Date),
        sa.Column('sent_at', sa.DateTime),
        sa.Column('signed_at', sa.DateTime),
        sa.Column('buyer_signature', sa.String),
        sa.Column('sign_token', sa.String, unique=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Health records
    op.create_table(
        'health_records',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('dog_id', sa.String, sa.ForeignKey('dogs.id'), nullable=False),
        sa.Column('record_type', sa.String),
        sa.Column('description', sa.String, nullable=False),
        sa.Column('administered_by', sa.String),
        sa.Column('administered_at', sa.Date, nullable=False),
        sa.Column('next_due', sa.Date),
        sa.Column('result', sa.String),
        sa.Column('document_url', sa.String),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    # Communications
    op.create_table(
        'communications',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('buyer_id', sa.String, sa.ForeignKey('buyers.id'), nullable=False),
        sa.Column('channel', sa.String),
        sa.Column('direction', sa.String),
        sa.Column('subject', sa.String),
        sa.Column('body', sa.Text),
        sa.Column('sent_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('ai_generated', sa.Boolean, default=False),
    )


def downgrade():
    op.drop_table('communications')
    op.drop_table('health_records')
    op.drop_table('contracts')
    op.drop_table('buyer_litter_matches')
    op.drop_table('buyers')
    op.drop_table('puppies')
    op.drop_table('litters')
    op.drop_table('dogs')
    op.drop_table('users')
