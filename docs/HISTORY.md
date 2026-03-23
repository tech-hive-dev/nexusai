# NexusAI — Decision & Session History
_Append-only log. Most recent first._

---

## 2026-03-23 — Documentation Reorganization
**Goal**: Avoid overburdening AI model with unstructured context
**Changes**:
- CLAUDE.md slimmed to conventions + gotchas + pointers
- AGENTS.md removed (duplicate)
- Context.md replaced with structured docs/
- Created: SCOPE.md, FRONTEND.md, BACKEND.md, STATUS.md, HISTORY.md
- Memory system bootstrapped

---

## Previous Sessions — Feature Build Log

### Batch: Templates + Channels + Onboarding (PRDv2)
- Fixed `applied_template_id` on Tenant model (runtime migration)
- Restored Templates page visibility; added Unapply button
- Fixed template fetch to include Authorization header
- Wired Channels UI to `/api/channels` API (was using tenant/settings before)
- Fixed embed code `apiUrl` — now resolves from request host, not `localhost:8000`

### Batch: Dashboard Completion
- **Overview.tsx** — full rewrite with Recharts (LineChart + PieChart + usage bar)
  - Fetches `/api/analytics/overview` + `/api/analytics/trend?days=7` + `/api/analytics/channels` in parallel
  - Usage bar: green → amber at 80% → red at 95%
- **Settings.tsx** — full rewrite with 5 sections
  - Brand Voice: `blocked_topics` chips, `vocabulary_overrides` key→value pairs
  - Competitor Playbook: name + strategy pairs
  - Notifications: `weekly_report_enabled`, `owner_whatsapp_number`, `slack_webhook_url`, `google_review_url`
  - Privacy: `pii_detection_enabled` toggle
- **GDPR**: `GET /api/leads/export?format=csv|json` + `DELETE /api/leads/{id}`
- **Voice service**: `services/voice.py` — ElevenLabs `eleven_multilingual_v2` → WhatsApp audio
- **PDF export**: `services/pdf_report.py` (reportlab) + `GET /conversations/{id}/export/pdf`
- Registered Integrations view in `dashboard/page.tsx`

### Batch: Core Platform (20+ features)
Built in an earlier multi-session sprint:
- Celery workers, landing page
- Cart Recovery, AI Upsell Engine
- Sentiment Detection
- White-Label Reseller Portal
- Broadcasts/Channels
- Stripe webhooks
- Agent Templates (initial)
- CSAT
- Memory service, Reports service
- Updated `main.py` runtime migrations
- Redesigned Sidebar
- Multiple frontend dashboard components

---

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| Runtime migrations via `_MIGRATIONS` in `main.py` | Railway doesn't run `init.sql` on existing DBs; idempotent `ADD COLUMN IF NOT EXISTS` is safer |
| SAVEPOINT for risky DB queries | asyncpg aborts entire transaction on any error; savepoints isolate failure scope |
| `ARRAY(String)` for TEXT[] columns | SQLAlchemy JSON type causes DatatypeMismatchError on PostgreSQL arrays |
| Empty `NEXT_PUBLIC_API_URL` on Vercel | Vercel rewrites `/api/*` to Railway; using absolute URL causes CORS/fetch failure |
| `.split("-")[0]` instead of `str[:8]` | Type checker rejects slice notation on str; UUID first segment is equivalent |
| Claude Sonnet for primary, Haiku for fast tasks | Cost/latency tradeoff; sentiment and quick classifiers don't need Sonnet |
| Configurable models via env vars (`AUTO_DISCOVER_MODEL`, `TEMPLATE_RECOMMEND_MODEL`) | Avoids hardcoding; lets ops tune cost vs quality without code change |
