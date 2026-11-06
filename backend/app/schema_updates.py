"""Additive, repeatable upgrades for installations originally created with create_all."""
from sqlalchemy import inspect, text

ADDITIONS = {
    "users": {"credential_version": "INTEGER NOT NULL DEFAULT 0", "onboarding_completed": "BOOLEAN NOT NULL DEFAULT TRUE"},
    "buyers": {"budget_min": "FLOAT", "budget_max": "FLOAT", "timeline": "VARCHAR"},
}


def ensure_customer_columns(engine):
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            conn.execute(text("SELECT pg_advisory_xact_lock(74062831)"))
        inspector = inspect(conn)
        for table, additions in ADDITIONS.items():
            if not inspector.has_table(table):
                continue
            present = {column["name"] for column in inspector.get_columns(table)}
            for column, definition in additions.items():
                if column not in present:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {definition}'))
