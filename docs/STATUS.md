# NexusAI — Implementation Status
_Last updated: 2026-03-23_

## What's Built

### Infrastructure
- [x] FastAPI backend on Railway (auto-deploy from `main`)
- [x] Next.js 14 frontend on Vercel (auto-deploy from `main`)
- [x] PostgreSQL + pgvector (Railway managed)
- [x] Redis + Celery workers (async tasks)
- [x] Docker Compose for local dev
- [x] JWT auth (register / login / forgot-password / reset-password)
- [x] Multi-tenant architecture (all data scoped by `tenant_id`)

### AI Agent
- [x] Claude tool-use orchestration (`services/agent.py`)
- [x] RAG search with pgvector (`services/knowledge.py`)
- [x] Sentiment detection + escalation (`services/sentiment.py`)
- [x] Memory service — customer preference persistence (`services/memory.py`)
- [x] PII detection service (`services/pii.py`) — ⚠️ NOT wired into chat flow
- [x] Voice TTS service — ElevenLabs (`services/voice.py`) — ⚠️ NOT wired into webhooks

### Knowledge Base
- [x] Document upload (PDF, DOCX, XLSX, CSV) + URL crawl
- [x] Auto-discovery at onboarding (website + Google Places gated + social enrichment)
- [x] Knowledge source provenance metadata (`source_meta` JSONB)
- [x] Industry agent templates — apply/unapply lifecycle with DB persistence
- [x] `applied_template_id` tracked on Tenant model

### Dashboard (Frontend)
- [x] Overview — LineChart (7-day trend) + PieChart (channel breakdown) + usage bar
- [x] Conversations — list + detail
- [x] Leads — kanban + GDPR export (CSV/JSON) + delete (right to erasure)
- [x] Quotes — list + detail
- [x] Broadcasts / Campaigns
- [x] Knowledge Base — sources list, upload, URL crawl, delete action
- [x] Settings — 5 sections: Identity, Brand Voice, Competitor Playbook, Notifications, Privacy
- [x] Integrations — catalog + connect (view registered in dashboard/page.tsx)
- [x] Reports — weekly/custom
- [x] Channels — create/update/list via `/api/channels`
- [x] Templates — list, recommend, apply, unapply
- [x] CSAT — satisfaction survey management

### Monetization
- [x] Stripe subscriptions + webhook handler
- [x] Plan limits enforced (conversation count)
- [x] White-label reseller portal
- [x] Cart recovery service
- [x] AI Upsell engine
- [x] Payment link tool (`send_payment_link`)

### Integrations
- [x] WhatsApp (Meta Cloud API webhooks)
- [x] PDF export of conversations (reportlab)

---

## Pending / Gaps

### Quick Wins (< 1 day each)
- [ ] **Sidebar: add "Integrations" nav item** — view is registered but no nav button exists in `Sidebar.tsx`
- [ ] **Wire PII scanning into `chat.py` `send_message`** — check `tenant.pii_detection_enabled`, call `pii.scan_message()`, store redacted text
- [ ] **Wire voice reply in `webhooks.py`** — after agent response, check `tenant.voice_replies_enabled`, call `services/voice.py send_voice_reply()`
- [ ] **Cal.com booking service** — `book_appointment` tool in `agent.py` is a stub; build `services/calcom.py`

### Medium Tasks (2–5 days each)
- [ ] **Email channel reader** — Gmail/Outlook OAuth inbox polling (`services/email_reader.py`)
- [ ] **S3/R2 file storage** — move uploads from local `/uploads` to cloud; build `services/storage.py`
- [ ] **Sentry error monitoring** — wire into `backend/app/main.py`
- [ ] **PostHog analytics** — wire into `frontend/app/layout.tsx`

### Phase Backlog (from PRD/Checklist)
- [ ] `chunker.py` — text splitting + embedding generation
- [ ] `web_crawler.py` — crawl4ai + Playwright
- [ ] `crm_connector.py` — HubSpot + Salesforce sync
- [ ] Shopify integration connector
- [ ] `/dashboard/analytics` — full analytics page (KPI cards, tables)
- [ ] Tests — lead scoring, quote generation, analytics, campaigns

---

## Phase Status
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Knowledge Base Foundation | ~60% — upload/crawl done; chunker/crawler/CRM partial |
| 2 | Revenue Generation | ~80% — leads/quotes built; payment links done |
| 3 | Retention & Automation | ~70% — broadcasts done; post-sale automation partial |
| 4 | Intelligence & Scale | ~40% — analytics API exists; full dashboard page pending |
