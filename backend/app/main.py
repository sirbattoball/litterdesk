from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import auth, dogs, litters, buyers, contracts, payments, ai_agent, dashboard
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="LitterDesk API",
    description="Breeder operations management platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "LitterDesk API"}
