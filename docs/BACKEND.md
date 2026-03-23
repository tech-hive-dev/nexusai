# NexusAI — Backend Reference

## Structure
```
backend/app/
├── main.py              # App startup, _MIGRATIONS list, routers mounted
├── core/
│   ├── config.py        # Settings (env vars, model IDs)
│   └── database.py      # Async SQLAlchemy engine + session
├── api/                 # Route files (one per resource)
├── models/              # SQLAlchemy ORM models
└── services/            # Business logic (no HTTP concerns)
```

## API Endpoints (mounted in main.py)

| Prefix | File | Notes |
|--------|------|-------|
| `/api/auth` | `api/auth.py` | register, login, forgot/reset password |
| `/api/tenants` | `api/tenants.py` | settings, onboarding, embed code |
| `/api/chat` | `api/chat.py` | send_message, conversations, export PDF |
| `/api/leads` | `api/leads.py` | CRUD, export CSV/JSON (GDPR), delete |
| `/api/quotes` | `api/quotes.py` | quote lifecycle |
| `/api/knowledge` | `api/knowledge.py` | upload, crawl, auto-discover, sources |
| `/api/knowledge-sources` | `api/knowledge_sources.py` | list/delete sources |
| `/api/channels` | `api/channels.py` | channel config per tenant |
| `/api/analytics` | `api/analytics.py` | overview, trend, channels breakdown |
| `/api/reports` | `api/reports.py` | weekly/custom reports |
| `/api/broadcasts` | `api/broadcasts.py` | broadcast campaigns |
| `/api/templates` | `api/templates.py` | agent templates, apply/unapply |
| `/api/csat` | `api/csat.py` | satisfaction surveys |
| `/api/integrations` | `api/integrations.py` | integration catalog + connect |
| `/api/stripe` | `api/stripe.py` | subscription management |
| `/api/reseller` | `api/reseller.py` | white-label portal |
| `/webhooks` | `api/webhooks.py` | WhatsApp/Meta webhook handler |

## Services

| Service | File | Purpose |
|---------|------|---------|
| Agent | `services/agent.py` | Claude tool-use orchestration |
| Knowledge | `services/knowledge.py` | RAG search (pgvector) |
| Memory | `services/memory.py` | customer preference persistence |
| Sentiment | `services/sentiment.py` | sentiment detection + escalation |
| PII | `services/pii.py` | PII scan + redaction (not yet wired into chat) |
| Voice | `services/voice.py` | ElevenLabs TTS → WhatsApp audio |
| PDF Report | `services/pdf_report.py` | Conversation PDF export (reportlab) |
| Celery | `services/celery_app.py` | Async task queue |
| Embeddings | `services/embeddings.py` | text-embedding-3-small (OpenAI) |

## Key Models (SQLAlchemy async)
- `Tenant` — tenant config, plan, branding, applied_template_id
- `Customer` — tenant-scoped, tags (ARRAY(String)), memory
- `Conversation` / `Message` — chat history
- `KnowledgeSource` / `KnowledgeChunk` — RAG store
- `Lead` — qualified leads with score
- `Quote` — generated quotes
- `Channel` — per-tenant channel configs
- `AgentTemplate` — reusable templates (persisted in DB)
- `Broadcast` / `BroadcastContact` — campaign records

## Runtime Migrations Pattern
```python
# backend/app/main.py
_MIGRATIONS = [
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS applied_template_id TEXT",
    # Add new columns here — runs every startup, idempotent
]
```

## Environment Variables (key ones)
```
DATABASE_URL          # PostgreSQL
REDIS_URL             # Redis / Celery
ANTHROPIC_API_KEY
OPENAI_API_KEY        # embeddings
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
META_VERIFY_TOKEN     # WhatsApp webhook
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_TOKEN
GOOGLE_PLACES_API_KEY # optional, gated
AUTO_DISCOVER_MODEL   # configurable Claude model
TEMPLATE_RECOMMEND_MODEL
```

## Pending / Known Gaps
- `services/pii.py` exists but NOT called in `chat.py` send_message — needs wiring
- `services/voice.py` exists but `webhooks.py` does NOT call it after agent response
- Cal.com booking: `book_appointment` tool in `agent.py` is a stub — `services/calcom.py` not built
- Email channel reader (`services/email_reader.py`) — not built
- S3/R2 file storage — uploads still go to local `/uploads`; `services/storage.py` not built
- Sentry + PostHog — not wired into `main.py`
