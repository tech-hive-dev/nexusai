# NexusAI — Product Scope

## What It Is
Multi-tenant AI chat SaaS. Businesses embed an AI agent (powered by Claude) on their website, WhatsApp, Facebook, Instagram, etc. The agent handles customer support, lead capture, upselling, appointment booking, and post-sale follow-up.

## Target Users
- SMBs (e-commerce, services, hospitality, retail)
- Resellers / white-label agencies

## Core Value Propositions
1. **AI handles customer chats 24/7** — trained on the business's own knowledge base
2. **Lead capture & qualification** — scores leads, notifies owner of hot prospects
3. **Revenue generation** — upsell engine, quote generation, cart recovery, payment links
4. **Multi-channel** — Website widget, WhatsApp, Facebook, Instagram, API
5. **White-label reseller** — agencies can sell under their own brand

## Key Product Areas

### Knowledge Base
- Document upload (PDF, DOCX, XLSX, CSV), URL crawl, CRM sync
- pgvector RAG — agent answers from tenant's KB
- Auto-discovery at onboarding (website crawl + Google Places + social enrichment)
- Industry templates seed KB with prebuilt content

### AI Agent
- Powered by Claude (Sonnet for primary, Haiku for fast tasks)
- Tools: search_knowledge, qualify_lead, create_quote, book_appointment, send_payment_link
- Sentiment detection → escalation to human
- PII detection + redaction (configurable per tenant)
- Memory service (customer preferences persist across sessions)

### Channels
- Website widget (vanilla JS embed)
- WhatsApp (Meta Cloud API webhooks)
- Facebook / Instagram (Messenger webhooks)
- Voice replies via ElevenLabs TTS (optional per tenant)
- Email inbox polling (planned)

### Dashboard
Views: Overview, Conversations, Leads, Quotes, Broadcasts, Knowledge Base, Settings, Integrations, Reports, Channels, Templates, CSAT

### Revenue / Billing
- Stripe subscriptions + webhooks
- Plan limits enforced (conversation count)
- White-label reseller portal with sub-tenant management

## Deployment Architecture
```
Browser → Vercel (Next.js) → /api/* rewrites → Railway (FastAPI)
                                                    ↓
                                          PostgreSQL + pgvector
                                          Redis (Celery broker)
                                          Celery workers (async tasks)
```

## Phase Roadmap (from PRD)
- **Phase 1** — Knowledge Base Foundation
- **Phase 2** — Revenue Generation (leads, quotes)
- **Phase 3** — Retention & Automation (campaigns, post-sale)
- **Phase 4** — Intelligence & Scale (analytics, integrations)

See `docs/STATUS.md` for current implementation state.
