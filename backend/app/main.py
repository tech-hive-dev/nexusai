from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, tenants, chat, knowledge, channels, leads, broadcasts, webhooks, analytics, reseller, templates, csat, cart_recovery, integrations
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

app = FastAPI(
    title="NexusAI Platform API",
    description="Multi-tenant AI chat agent platform",
    version="1.0.0",
)

# ─── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "*",  # Remove in production, use specific origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
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
    return {"status": "healthy"}

logger.info("NexusAI API started")
