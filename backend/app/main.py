from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from sqlalchemy import text

from app.database import engine, Base
from app.routers import auth, dogs, litters, buyers, contracts, payments, ai_agent, dashboard, leads
from app.config import settings

logger = logging.getLogger("uvicorn.error")

# (table, column) pairs that need to be timestamp-with-timezone.
_TIMEZONE_AWARE_COLUMNS = [
    ('users', 'reset_token_expires'), ('users', 'trial_ends_at'),
    ('users', 'created_at'), ('users', 'updated_at'), ('users', 'last_login'),
    ('dogs', 'created_at'), ('dogs', 'updated_at'),
    ('litters', 'created_at'), ('litters', 'updated_at'),
    ('puppies', 'created_at'),
    ('buyers', 'last_contacted'), ('buyers', 'follow_up_date'),
    ('buyers', 'created_at'), ('buyers', 'updated_at'),
    ('buyer_litter_matches', 'created_at'),
    ('contracts', 'sent_at'), ('contracts', 'signed_at'),
    ('contracts', 'created_at'), ('contracts', 'updated_at'),
    ('health_records', 'created_at'),
    ('communications', 'sent_at'),
    ('leads', 'created_at'),
    ('contact_messages', 'created_at'),
]


def ensure_timezone_aware_columns():
    """Self-healing fix for columns that were created without timezone=True.

    This project's tables were created directly by SQLAlchemy's
    create_all() rather than through Alembic (there's no alembic_version
    table in production), so a normal `alembic upgrade head` can't be run
    safely here — it would try to re-create tables that already exist.

    Instead, this checks each column's actual current type via
    information_schema and only alters the ones that still need it. Safe
    to run on every startup: already-correct columns are skipped, and a
    missing column/table is logged and skipped rather than crashing the
    app.
    """
    with engine.begin() as conn:
        for table, column in _TIMEZONE_AWARE_COLUMNS:
            try:
                result = conn.execute(text(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c"
                ), {"t": table, "c": column}).fetchone()

                if result is None:
                    logger.warning(f"Skipping {table}.{column}: column not found")
                    continue

                if result[0] == "timestamp without time zone":
                    conn.execute(text(
                        f'ALTER TABLE {table} ALTER COLUMN {column} '
                        f"TYPE TIMESTAMP WITH TIME ZONE USING {column} AT TIME ZONE 'UTC'"
                    ))
                    logger.info(f"Made {table}.{column} timezone-aware")
            except Exception as e:
                logger.warning(f"Skipping {table}.{column}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_timezone_aware_columns()
    yield


app = FastAPI(
    title="LitterDesk API",
    description="Breeder operations management platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["https://litterdesk.vercel.app"],
    allow_origin_regex=r"https://litterdesk.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(dogs.router, prefix="/api/dogs", tags=["dogs"])
app.include_router(litters.router, prefix="/api/litters", tags=["litters"])
app.include_router(buyers.router, prefix="/api/buyers", tags=["buyers"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(ai_agent.router, prefix="/api/ai", tags=["ai"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "LitterDesk API"}
