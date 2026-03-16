from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import text

from app.core.database import engine, Base
from loguru import logger
from app.core.config import settings

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
    )

logger.info("Importing routers...")
from app.api import auth, tenants, chat, knowledge, channels, leads, broadcasts, webhooks, analytics, reseller, templates, csat, cart_recovery, integrations
logger.info("Routers imported successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NexusAI API starting up...")
    if settings.JWT_SECRET in ("change_this_secret", "supersecretjwtkey123", ""):
        logger.warning("JWT_SECRET is set to a weak default value — change it before going to production!")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception as e:
        logger.warning(f"Database not reachable at startup (will retry on requests): {e}")
    yield
    logger.info("NexusAI API shutting down.")


app = FastAPI(
    title="NexusAI Platform API",
    description="Multi-tenant AI chat agent platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ──────────────────────────────────────────────────────
_cors_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://(.*\.railway\.app|.*\.vercel\.app)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── ROUTES ────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(tenants.router,    prefix="/api/tenants",    tags=["Tenants"])
app.include_router(chat.router,       prefix="/api/chat",       tags=["Chat"])
app.include_router(knowledge.router,  prefix="/api/knowledge",  tags=["Knowledge"])
app.include_router(channels.router,   prefix="/api/channels",   tags=["Channels"])
app.include_router(leads.router,      prefix="/api/leads",      tags=["Leads"])
app.include_router(broadcasts.router, prefix="/api/broadcasts", tags=["Broadcasts"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(webhooks.router,   prefix="/webhooks",       tags=["Webhooks"])
app.include_router(reseller.router,                             tags=["Reseller"])
app.include_router(templates.router,                            tags=["Templates"])
app.include_router(csat.router,                                 tags=["CSAT"])
app.include_router(cart_recovery.router,                        tags=["Cart Recovery"])
app.include_router(integrations.router,                         tags=["Integrations"])

# ─── STATIC FILES ──────────────────────────────────────────────
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"status": "NexusAI API running", "version": "1.0.0"}

@app.get("/health")
async def health():
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unavailable: {e}"
    # Always return 200 so Railway marks the service healthy.
    # DB status is informational only.
    return {"status": "healthy", "db": db_status}

logger.info("NexusAI API started")
