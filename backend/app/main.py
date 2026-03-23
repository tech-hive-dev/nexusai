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
from app.api import auth, tenants, chat, knowledge, channels, leads, broadcasts, webhooks, analytics, reseller, templates, csat, cart_recovery, integrations, quotes, campaigns, admin
logger.info("Routers imported successfully.")


_MIGRATIONS = [
    # tenants — extended columns
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_whatsapp_number VARCHAR(50)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sla_minutes INT DEFAULT 5",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_review_url TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feedback_form_url TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_store_domain VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_url TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_key TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_secret TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_internal_mode BOOLEAN DEFAULT false",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days INT",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pii_detection_enabled BOOLEAN DEFAULT false",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS blocked_topics JSONB DEFAULT '[]'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vocabulary_overrides JSONB DEFAULT '{}'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hide_ai_identity BOOLEAN DEFAULT false",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_replies_enabled BOOLEAN DEFAULT false",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(100)",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS competitor_playbook JSONB DEFAULT '[]'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hidden_templates JSONB DEFAULT '[]'",
    # conversations
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_score INT",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_requested_at TIMESTAMPTZ",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS dominant_emotion VARCHAR(50)",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS annotation VARCHAR(50)",
    # messages
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50)",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2)",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS flagged_pii BOOLEAN DEFAULT false",
    # customers
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS conversation_summary TEXT",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_summary TEXT",
    # orders
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ",
    # knowledge sources — provenance metadata
    "ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'",
    # tenants — applied template tracking
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS applied_template_id VARCHAR(50)",
    # agent templates (custom, DB-persisted)
    """CREATE TABLE IF NOT EXISTS agent_templates (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100) DEFAULT 'custom',
        icon VARCHAR(50) DEFAULT '💼',
        description TEXT DEFAULT '',
        is_premium BOOLEAN DEFAULT false,
        price_cents INT DEFAULT 0,
        system_prompt TEXT DEFAULT '',
        starter_knowledge JSONB DEFAULT '[]',
        config_defaults JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    # leads (AI-scored)
    """CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'cold',
        budget VARCHAR(255),
        timeline VARCHAR(255),
        decision_maker BOOLEAN DEFAULT false,
        need_summary TEXT,
        recommended_action TEXT,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        followed_up_at TIMESTAMPTZ,
        converted BOOLEAN DEFAULT false,
        converted_at TIMESTAMPTZ
    )""",
    # quotes
    """CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        conversation_id UUID,
        line_items JSONB DEFAULT '[]',
        subtotal FLOAT DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'GBP',
        notes TEXT,
        chat_summary TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        valid_until TIMESTAMPTZ,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        accepted_at TIMESTAMPTZ
    )""",
    # campaigns
    """CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        message_template TEXT NOT NULL,
        campaign_type VARCHAR(50) DEFAULT 'broadcast',
        status VARCHAR(20) DEFAULT 'draft',
        scheduled_at TIMESTAMPTZ,
        sent_count VARCHAR(10) DEFAULT '0',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
    )""",
    # campaign contacts
    """CREATE TABLE IF NOT EXISTS campaign_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        phone VARCHAR(100) NOT NULL,
        name VARCHAR(255),
        company VARCHAR(255),
        sent_at TIMESTAMPTZ,
        delivered BOOLEAN DEFAULT false,
        replied BOOLEAN DEFAULT false
    )""",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NexusAI API starting up...")
    if settings.JWT_SECRET in ("change_this_secret", "supersecretjwtkey123", ""):
        logger.warning("JWT_SECRET is set to a weak default value — change it before going to production!")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection verified. Running migrations...")
            for stmt in _MIGRATIONS:
                try:
                    await conn.execute(text(stmt))
                except Exception as e:
                    logger.warning(f"Migration skipped ({e}): {stmt[:60]}")
            logger.info("Migrations complete.")
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
app.include_router(quotes.router,      prefix="/api/quotes",    tags=["Quotes"])
app.include_router(campaigns.router,   prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(admin.router,                               tags=["Admin"])

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
