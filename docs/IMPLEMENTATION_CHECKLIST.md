# NexusAI PRD Implementation Checklist

## Phase 1 — Knowledge Base Foundation (4–6 weeks)
- [ ] Build `chunker.py` for text splitting + embedding generation
- [ ] Implement `web_crawler.py` with crawl4ai + Playwright
- [ ] Implement `document_parser.py` for PDF/DOCX/XLSX/PPTX/CSV
- [ ] Implement `knowledge_gap_filler.py` with DuckDuckGo fallback
- [ ] Implement `crm_connector.py` for HubSpot + Salesforce sync
- [ ] Implement `knowledge_refresh.py` APScheduler worker
- [ ] Create knowledge sources API routes (`/api/knowledge-sources`)
- [ ] Add knowledge source models + runtime migrations in `backend/app/main.py`
- [ ] Build Knowledge Sources frontend page (upload, URLs, CRM connect)
- [ ] Wire ingestion triggers from frontend actions

## Phase 2 — Revenue Generation (3–4 weeks)
- [ ] Implement `services/lead_qualifier.py`
- [ ] Add `Lead` model + migrations
- [ ] Integrate lead qualification into `agent.py`
- [ ] Add owner notification for hot leads
- [ ] Implement `services/quote_generator.py`
- [ ] Add `Quote` model + migrations
- [ ] Add agent tool for quote generation
- [ ] Implement Leads API (`/api/leads`)
- [ ] Implement Quotes API (`/api/quotes`)
- [ ] Build `/dashboard/leads` (kanban + DnD + detail drawer)
- [ ] Build `/dashboard/quotes` (list + detail + status + PDF)

## Phase 3 — Retention & Automation (3–4 weeks)
- [ ] Implement `services/whatsapp_campaigns.py` (follow-up + broadcast)
- [ ] Add `Campaign` + `CampaignContact` models + migrations
- [ ] Implement Campaigns API (`/api/campaigns`)
- [ ] Build `/dashboard/campaigns` (list + create + schedule + CSV upload)
- [ ] Implement `services/post_sale_automation.py`
- [ ] Implement `services/payment_link.py` (Stripe Payment Links)
- [ ] Add agent tool `send_payment_link`

## Phase 4 — Intelligence & Scale (2–3 weeks)
- [ ] Implement `services/analytics.py`
- [ ] Add daily lost revenue alert job in `knowledge_refresh.py`
- [ ] Implement Analytics API (`/api/analytics`)
- [ ] Build `/dashboard/analytics` (KPI cards, charts, tables)
- [ ] Add industry templates under `backend/app/data/templates/*`
- [ ] Implement `apply_industry_template()` on onboarding
- [ ] Build `/onboarding/industry` page
- [ ] Implement Shopify integration (`shopify_connector.py`)
- [ ] Implement calendar integration stub
- [ ] Extend sentiment escalation in `agent.py` + owner notification

## Cross-Cutting Setup
- [ ] Add required backend dependencies to `backend/requirements.txt`
- [ ] Add required frontend dependencies to `frontend/package.json`
- [ ] Add new environment variables to `.env` and deployment secrets
- [ ] Add tests for lead scoring, quote generation, analytics, and campaigns
