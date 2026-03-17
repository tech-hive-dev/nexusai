# NexusAI — Product Requirements Document (v2.0)

> **For:** Claude Code / Development Team
> **Repo:** https://github.com/tech-hive-dev/nexusai
> **Stack:** FastAPI (Python) · Next.js 14 (TypeScript) · PostgreSQL + pgvector · Claude API · WhatsApp Business API · Stripe · SendGrid
> **Purpose:** Full implementation specification covering knowledge base enhancement, AI lead qualification, quote generation, WhatsApp campaigns, post-sale automation, analytics, payment in chat, industry templates, and integrations.

---

## Table of Contents

1. [Product Vision & Feature Map](#1-product-vision--feature-map)
2. [Knowledge Base Enhancement (v1 Summary)](#2-knowledge-base-enhancement-v1-summary)
3. [AI Lead Qualification Engine](#3-ai-lead-qualification-engine)
4. [Instant Quote / Estimate Generator](#4-instant-quote--estimate-generator)
5. [WhatsApp Proactive Follow-up & Broadcast Campaigns](#5-whatsapp-proactive-follow-up--broadcast-campaigns)
6. [Post-Sale Automation Suite](#6-post-sale-automation-suite)
7. [Conversation Analytics & Business Intelligence](#7-conversation-analytics--business-intelligence)
8. [Payment Collection Inside Chat](#8-payment-collection-inside-chat)
9. [Industry Templates System](#9-industry-templates-system)
10. [Key Integrations](#10-key-integrations)
11. [Sentiment-Based Escalation](#11-sentiment-based-escalation)
12. [Frontend — New Dashboard Pages](#12-frontend--new-dashboard-pages)
13. [Full Implementation Roadmap](#13-full-implementation-roadmap)
14. [Additional Environment Variables](#14-additional-environment-variables)
15. [Complete File Creation & Modification List](#15-complete-file-creation--modification-list)

---

## 1. Product Vision & Feature Map

NexusAI targets SMEs who need to acquire new customers and retain existing ones — without hiring extra staff. The platform must cover three customer lifecycle stages:

| Stage | Goal | Features |
|---|---|---|
| **Win New Customers** | Convert website visitors and WhatsApp enquiries into paying clients | Knowledge base chatbot, lead qualification, instant quotes, RCS/SMS/voice |
| **Deliver Excellent Support** | Answer questions 24/7, handle complaints, escalate to humans intelligently | RAG knowledge base, sentiment escalation, multi-channel messaging |
| **Retain & Grow** | Keep existing customers happy, drive reviews, referrals, and repeat purchases | Post-sale automation, WhatsApp campaigns, payment in chat, analytics |

### Channel Strategy

NexusAI must support all six customer communication channels from a single platform:

| Channel | Use Case | Priority |
|---|---|---|
| WhatsApp | Primary engagement, campaigns, payments | P0 |
| Website Chat | Lead capture, knowledge base Q&A | P0 |
| SMS | Reach non-WhatsApp users, booking reminders | P1 |
| MMS | Rich media for offers, product images | P1 |
| Email | Formal quotes, invoices, sequences | P1 |
| Voice (AI) | Inbound call handling, lead qualification | P2 |
| RCS | Rich branded messages (Android native) | P2 |

---

## 2. Knowledge Base Enhancement (v1 Summary)

> ⚠️ **Prerequisite:** Complete all items in this section before proceeding to Sections 3–10. The lead qualification, analytics, and automation features all depend on a working knowledge base and RAG pipeline.

The following was specified in v1 of this document and should be implemented first as the foundation for all other features.

### Files to Create (v1)

- `web_crawler.py` — crawl URLs, ingest to pgvector
- `document_parser.py` — PDF, DOCX, XLSX, PPTX, CSV via `unstructured` library
- `knowledge_gap_filler.py` — DuckDuckGo search when agent confidence < 0.65
- `crm_connector.py` — HubSpot and Salesforce sync
- `knowledge_refresh.py` — APScheduler 24-hour re-crawl worker
- `knowledge_sources API` — REST endpoints for managing all sources

### Dependencies (v1)

```
unstructured[all-docs]>=0.12.0
crawl4ai>=0.3.0
playwright>=1.40.0
duckduckgo-search>=4.0.0
hubspot-api-client>=8.0.0
simple-salesforce>=1.12.0
apscheduler>=3.10.0
```

### Knowledge Source Types

| Source Type | Parser | Trigger |
|---|---|---|
| Website URL | crawl4ai + Playwright | On-demand + 24hr refresh |
| PDF | unstructured | On upload |
| DOCX / Word | unstructured | On upload |
| XLSX / Excel | unstructured | On upload |
| PPTX | unstructured | On upload |
| CSV | pandas | On upload |
| HubSpot CRM | hubspot-api-client | Daily sync |
| Salesforce CRM | simple-salesforce | Daily sync |
| Manual text entry | direct | On save |

---

## 3. AI Lead Qualification Engine

### 3.1 Overview

When a visitor chats on the website or WhatsApp, the bot proactively collects qualification signals — budget, timeline, decision-maker status, specific need — and assigns a lead score. High-scoring leads are immediately flagged to the SME owner via WhatsApp or email notification.

**Score bands:**
- 70–100 = Hot (immediate owner notification + auto follow-up)
- 40–69 = Warm (add to 24hr follow-up sequence)
- 0–39 = Cold (low-priority nurture)

### 3.2 New File: `services/lead_qualifier.py`

```python
from anthropic import Anthropic
from app.models.lead import Lead, LeadScore
from app.core.database import get_db
import json

client = Anthropic()

QUALIFICATION_PROMPT = """
You are a lead qualification assistant. Based on the conversation below,
extract and score this lead on a scale of 0-100.

Scoring criteria:
- Budget confirmed or implied (0-25 pts)
- Clear timeline / urgency (0-25 pts)
- Decision maker (0-25 pts)
- Specific need matches our service (0-25 pts)

Return JSON: {"score": int, "budget": str, "timeline": str,
"decision_maker": bool, "need_summary": str, "recommended_action": str}
"""

async def qualify_lead(conversation: list[dict], tenant_id: str) -> dict:
    """Analyse conversation and return lead qualification score."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        system=QUALIFICATION_PROMPT,
        messages=[{"role": "user", "content": str(conversation)}]
    )
    result = json.loads(response.content[0].text)

    # Persist lead score
    async with get_db() as db:
        lead = Lead(
            tenant_id=tenant_id,
            score=result["score"],
            budget=result["budget"],
            timeline=result["timeline"],
            need_summary=result["need_summary"],
            status="hot" if result["score"] >= 70 else "warm" if result["score"] >= 40 else "cold"
        )
        db.add(lead)
        await db.commit()

    # Notify owner if hot lead
    if result["score"] >= 70:
        await notify_owner_hot_lead(lead, tenant_id)

    return result
```

### 3.3 Lead Score Model (DB) — `models/lead.py`

```python
class Lead(Base):
    __tablename__ = "leads"
    id              = Column(UUID, primary_key=True, default=uuid4)
    tenant_id       = Column(UUID, ForeignKey("tenants.id"), nullable=False)
    conversation_id = Column(UUID)
    score           = Column(Integer)   # 0-100
    status          = Column(String)    # hot / warm / cold
    budget          = Column(String)
    timeline        = Column(String)
    need_summary    = Column(Text)
    contact_name    = Column(String)
    contact_email   = Column(String)
    contact_phone   = Column(String)
    created_at      = Column(DateTime, default=func.now())
    followed_up_at  = Column(DateTime)
    converted       = Column(Boolean, default=False)
```

### 3.4 Integration Point in `agent.py`

```python
# In agent.py — add at conversation close / after 3+ turns
from app.services.lead_qualifier import qualify_lead

if len(conversation_history) >= 3:
    lead_data = await qualify_lead(conversation_history, tenant_id)
    # Lead is saved to DB automatically inside qualify_lead()
```

---

## 4. Instant Quote / Estimate Generator

### 4.1 Overview

The bot collects service requirements through a natural conversation and generates a formatted price estimate instantly. The estimate is delivered in-chat and optionally emailed as a PDF. No more waiting days for quotes — customers get an answer immediately.

> ⚠️ **Setup Required:** For the quote generator to work, each tenant must upload their pricing document (PDF, XLSX, or DOCX) via the Knowledge Sources page. The bot will automatically pull from it during quote generation.

### 4.2 New File: `services/quote_generator.py`

```python
from anthropic import Anthropic
from app.models.quote import Quote
from app.services.knowledge import retrieve_context
import json

client = Anthropic()

async def generate_quote(requirements: str, tenant_id: str) -> dict:
    """Generate a price estimate based on customer requirements."""
    # Pull pricing info from the tenant's knowledge base
    pricing_context = await retrieve_context(
        query=f"pricing rates cost estimate {requirements}",
        tenant_id=tenant_id
    )

    prompt = f"""You are a professional quoting assistant for this business.
    Use the following pricing information:
    {pricing_context}

    Customer requires: {requirements}

    Generate a professional quote. Return JSON:
    {{"line_items": [{{"description": str, "price": float}}],
     "subtotal": float, "notes": str, "valid_until": str,
     "chat_summary": str}}
    """

    response = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    result = json.loads(response.content[0].text)

    # Save quote to DB
    await save_quote(result, tenant_id)

    return result
```

### 4.3 Quote Model — `models/quote.py`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Owning tenant |
| `lead_id` | UUID | Associated lead (optional) |
| `line_items` | JSONB | Array of `{description, price}` |
| `subtotal` | Float | Total estimate |
| `status` | String | `draft` / `sent` / `accepted` / `rejected` |
| `valid_until` | DateTime | Quote expiry |
| `created_at` | DateTime | Auto |

---

## 5. WhatsApp Proactive Follow-up & Broadcast Campaigns

### 5.1 Overview

Two related capabilities:

- **(a) Automated follow-up sequences** — for individual leads who chatted but did not convert
- **(b) Broadcast campaigns** — for sending personalised messages to a tenant's customer list

WhatsApp broadcasts have a **98% open rate** vs 20% for email.

### 5.2 New File: `services/whatsapp_campaigns.py`

```python
from app.core.whatsapp import send_whatsapp_message
from app.models.campaign import Campaign, CampaignContact
from apscheduler.schedulers.asyncio import AsyncIOScheduler

async def send_followup_sequence(lead_id: str, tenant_id: str):
    """Send time-delayed follow-up messages to a lead."""
    sequences = [
        {"delay_hours": 2,  "template": "followup_1_hour"},
        {"delay_hours": 24, "template": "followup_24_hour"},
        {"delay_hours": 72, "template": "followup_3_day"},
    ]
    for seq in sequences:
        scheduler.add_job(
            send_whatsapp_message,
            "date",
            run_date=datetime.now() + timedelta(hours=seq["delay_hours"]),
            args=[lead_id, tenant_id, seq["template"]]
        )

async def send_broadcast(campaign_id: str, tenant_id: str):
    """Send personalised broadcast to all contacts in a campaign."""
    campaign = await get_campaign(campaign_id)
    contacts = await get_campaign_contacts(campaign_id)
    for contact in contacts:
        msg = campaign.message_template.format(
            name=contact.name,
            company=contact.company or "",
        )
        await send_whatsapp_message(contact.phone, msg, tenant_id)
        await mark_sent(contact.id)
```

### 5.3 New DB Models — `models/campaign.py`

```python
class Campaign(Base):
    __tablename__ = "campaigns"
    id               = Column(UUID, primary_key=True, default=uuid4)
    tenant_id        = Column(UUID, ForeignKey("tenants.id"))
    name             = Column(String)
    message_template = Column(Text)   # Supports {name}, {company}, {offer}
    campaign_type    = Column(String) # "broadcast" | "followup_sequence"
    status           = Column(String) # "draft"|"scheduled"|"sending"|"complete"
    scheduled_at     = Column(DateTime)
    created_at       = Column(DateTime, default=func.now())

class CampaignContact(Base):
    __tablename__ = "campaign_contacts"
    id          = Column(UUID, primary_key=True, default=uuid4)
    campaign_id = Column(UUID, ForeignKey("campaigns.id"))
    phone       = Column(String)
    name        = Column(String)
    sent_at     = Column(DateTime)
    delivered   = Column(Boolean, default=False)
    replied     = Column(Boolean, default=False)
```

---

## 6. Post-Sale Automation Suite

### 6.1 Three Automated Flows to Build

| Flow | Trigger | Timing | Channel | Goal |
|---|---|---|---|---|
| **Check-in** | Order/booking marked complete | +3 days | WhatsApp | Satisfaction check, upsell opportunity |
| **Review Request** | Check-in sentiment positive (> 0.75) | +1 day after check-in | WhatsApp | Google review link with personal note |
| **Referral Program** | Review received or manually triggered | +3 days after review | WhatsApp | Discount code for referring a friend |

### 6.2 New File: `services/post_sale_automation.py`

```python
from app.services.sentiment import analyse_sentiment
from app.core.whatsapp import send_whatsapp_message
from app.models.customer import Customer

async def trigger_post_sale_flow(order_id: str, tenant_id: str):
    """Schedule all post-sale messages for an order."""
    scheduler.add_job(send_checkin, "date",
        run_date=datetime.now()+timedelta(days=3),
        args=[order_id, tenant_id])

async def send_checkin(order_id: str, tenant_id: str):
    customer = await get_customer_by_order(order_id)
    msg = f"Hi {customer.name}! Just checking in — how did everything go? Reply and let us know 😊"
    await send_whatsapp_message(customer.phone, msg, tenant_id)

async def send_review_request(customer_id: str, tenant_id: str):
    tenant = await get_tenant(tenant_id)
    msg = (f"So glad you had a great experience! "
           f"Would you mind leaving us a quick Google review? "
           f"It means the world to us: {tenant.google_review_url}")
    await send_whatsapp_message(customer.phone, msg, tenant_id)

async def send_referral_offer(customer_id: str, tenant_id: str):
    discount_code = generate_unique_code(customer_id)
    msg = (f"As a thank-you, here's a referral code for you: {discount_code}. "
           f"Share it with a friend and you both get 10% off your next visit!")
    await send_whatsapp_message(customer.phone, msg, tenant_id)
```

---

## 7. Conversation Analytics & Business Intelligence

### 7.1 Dashboard Metrics to Build

The analytics dashboard gives SME owners insights they have never had before. This is a strong retention and upsell driver — owners see clear ROI from the platform.

| Metric | Description | Visualisation |
|---|---|---|
| Total conversations | Count by day/week/month | Line chart |
| Lead scores distribution | Hot / Warm / Cold counts | Doughnut chart |
| Conversion rate | Leads → paying customers % | KPI card |
| Top unanswered questions | Knowledge gaps by frequency | Table |
| Estimated lost revenue | Unconverted hot leads × avg deal value | KPI card (red) |
| Avg response time | Agent first reply speed | KPI card |
| Campaign performance | Sent / delivered / reply rate per campaign | Table |
| Sentiment trend | % positive conversations over time | Area chart |

### 7.2 New File: `services/analytics.py`

```python
from sqlalchemy import func, text
from app.models.lead import Lead
from app.models.conversation import Conversation

async def get_dashboard_metrics(tenant_id: str, days: int = 7) -> dict:
    """Aggregate all KPIs for the analytics dashboard."""
    since = datetime.now() - timedelta(days=days)

    async with get_db() as db:
        leads = await db.execute(
            select(func.count(), Lead.status)
            .where(Lead.tenant_id == tenant_id)
            .where(Lead.created_at >= since)
            .group_by(Lead.status)
        )
        top_questions = await db.execute(
            text("SELECT query, count(*) AS frequency FROM knowledge_gaps "
                 "WHERE tenant_id = :tid AND created_at >= :since "
                 "GROUP BY query ORDER BY frequency DESC LIMIT 10"),
            {"tid": tenant_id, "since": since}
        )
        lost_value = await estimate_lost_revenue(tenant_id, since)

    return {
        "leads": {row.status: row.count for row in leads},
        "top_questions": [r._asdict() for r in top_questions],
        "estimated_lost_revenue": lost_value,
        "period_days": days
    }
```

### 7.3 Lost Opportunity Alert (Daily Job)

Add to `workers/knowledge_refresh.py` alongside the existing scheduler:

```python
@scheduler.scheduled_job("cron", hour=8, minute=0)
async def daily_lost_opportunity_alert():
    tenants = await get_all_tenants()
    for tenant in tenants:
        hot_leads_unconverted = await count_unconverted_hot_leads(tenant.id)
        if hot_leads_unconverted > 0:
            avg_deal = tenant.settings.get("avg_deal_value", 500)
            lost = hot_leads_unconverted * avg_deal * 0.3  # 30% avg close rate
            msg = (f"NexusAI Daily Report: You had {hot_leads_unconverted} hot leads "
                   f"yesterday that didn't convert. "
                   f"Estimated missed revenue: £{lost:.0f}. "
                   f"Log in to follow up: https://app.nexusai.co/leads")
            await send_whatsapp_message(tenant.owner_phone, msg, tenant.id)
```

---

## 8. Payment Collection Inside Chat

### 8.1 Overview

The bot generates a Stripe payment link directly inside the conversation. The customer pays without leaving WhatsApp or the website chat. Ideal for deposits, bookings, retainers, and small product purchases. Stripe is already in the NexusAI repo.

### 8.2 New File: `services/payment_link.py`

```python
import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

async def create_payment_link(
    amount: float,
    description: str,
    customer_email: str,
    tenant_id: str
) -> str:
    """Create a Stripe payment link and return the URL."""
    product = stripe.Product.create(name=description)
    price = stripe.Price.create(
        product=product.id,
        unit_amount=int(amount * 100),  # Stripe uses pence/cents
        currency="gbp",
    )
    link = stripe.PaymentLink.create(
        line_items=[{"price": price.id, "quantity": 1}],
        metadata={"tenant_id": tenant_id, "customer_email": customer_email}
    )
    return link.url


# In agent.py — detect payment intent and trigger link
# Add to tool_calling logic:
PAYMENT_TOOL = {
    "name": "send_payment_link",
    "description": "Send a payment link to the customer when they agree to pay or book",
    "input_schema": {
        "type": "object",
        "properties": {
            "amount": {"type": "number"},
            "description": {"type": "string"}
        },
        "required": ["amount", "description"]
    }
}
```

---

## 9. Industry Templates System

### 9.1 Overview

Pre-built templates for 6 core SME verticals. Each template contains:

- **(a)** A seed knowledge base with common FAQs for that industry
- **(b)** A pre-configured conversation flow for that business type
- **(c)** Sample responses the AI can draw from immediately on day one

**This is the biggest sales accelerator** — an SME is live in 30 minutes, not 30 days.

### 9.2 Templates to Build

| Industry | Key FAQs to Seed | Conversation Flow Focus |
|---|---|---|
| **Restaurant** | Menu, opening hours, allergens, reservations, delivery | Table booking → order → review |
| **Salon / Beauty** | Services, pricing, availability, aftercare | Book appointment → confirmation → rebooking |
| **Real Estate** | Property listings, viewings, mortgage info, area guides | Qualify buyer/renter → book viewing |
| **Clinic / Healthcare** | Services, booking, fees, insurance, directions | Symptom → appointment → follow-up |
| **E-commerce** | Product info, shipping, returns, order tracking | Browse → cart → purchase → review |
| **Trades (Plumber/Electrician)** | Services, call-out fees, availability, warranties | Describe job → quote → booking → review |

### 9.3 Template Storage Structure

```
backend/app/data/templates/
  restaurant/
    knowledge_base.json     ← seed FAQs and answers
    conversation_flow.json  ← structured question paths
    system_prompt.txt       ← industry-specific agent persona
  salon/
  real_estate/
  clinic/
  ecommerce/
  trades/

# Apply template on tenant onboarding:
async def apply_industry_template(tenant_id: str, industry: str):
    template = load_template(industry)
    for faq in template["knowledge_base"]:
        embedding = await get_embedding(faq["answer"])
        await store_in_pgvector(faq["answer"], embedding, tenant_id, source_type="template")
```

---

## 10. Key Integrations

### 10.1 Priority Integration List

| Integration | Purpose | Library | Priority |
|---|---|---|---|
| **Shopify** | Product catalogue sync, order status lookup | `ShopifyAPI` | P0 |
| **WooCommerce** | Product sync for WordPress stores | `woocommerce` REST API | P0 |
| **Google Calendar** | Appointment booking direct from chat | `google-auth` + `googleapiclient` | P1 |
| **Calendly** | Meeting scheduling link generation | Calendly v2 API | P1 |
| **Airtable** | SMEs who use Airtable as lightweight CRM | `pyairtable` | P2 |
| **Zapier Webhook** | Connect to 5,000+ apps without custom code | HTTP POST | P2 |
| **Stripe** | Payment links (already in repo — extend) | `stripe` | P0 |
| **Google Reviews** | Review request with direct link | Google Places API | P1 |

### 10.2 Shopify Integration (Highest Priority) — `services/integrations/shopify_connector.py`

```python
import shopify

async def sync_shopify_products(tenant_id: str, shop_url: str, access_token: str):
    """Sync Shopify product catalogue to knowledge base."""
    session = shopify.Session(shop_url, "2024-01", access_token)
    shopify.ShopifyResource.activate_session(session)

    products = shopify.Product.find()
    for product in products:
        text = f"{product.title}: {product.body_html}. Price: {product.variants[0].price}"
        embedding = await get_embedding(text)
        await store_in_pgvector(text, embedding, tenant_id, source_type="shopify")


async def get_order_status(order_number: str, tenant_id: str) -> str:
    """Called by the agent tool to look up a Shopify order."""
    shopify_creds = await get_tenant_shopify_creds(tenant_id)
    order = shopify.Order.find(order_number)
    return f"Order {order_number}: {order.fulfillment_status} — {order.shipping_address.city}"
```

---

## 11. Sentiment-Based Escalation

The `sentiment.py` service already exists in the repo. Extend it to trigger real-time escalation when a customer becomes frustrated.

### 11.1 Escalation Logic to Add to `agent.py`

```python
# In agent.py — check sentiment on every user message
from app.services.sentiment import analyse_sentiment

sentiment = await analyse_sentiment(user_message)

if sentiment["label"] == "negative" and sentiment["score"] > 0.80:
    # Offer immediate human escalation
    escalation_msg = (
        "I can see this is frustrating. Would you like me to connect you "
        "with one of our team members right now? They'll be able to help "
        "you immediately."
    )
    await send_message(escalation_msg)

    # Notify owner
    await notify_owner_escalation(
        tenant_id=tenant_id,
        customer_message=user_message,
        sentiment_score=sentiment["score"]
    )
```

### 11.2 Escalation Notification Format

The owner notification (WhatsApp) should include:
- Customer's name and contact info (if captured)
- Last 3 messages from the conversation
- Sentiment score
- Deep link to the conversation in the dashboard

---

## 12. Frontend — New Dashboard Pages

Add the following pages to the Next.js dashboard. Use the existing Tailwind + shadcn/ui setup throughout.

| Route | Component | Key UI Elements |
|---|---|---|
| `/dashboard/leads` | `LeadsDashboard` | Kanban board (Hot/Warm/Cold), lead detail drawer, follow-up action buttons |
| `/dashboard/analytics` | `AnalyticsDashboard` | KPI cards, line charts, top questions table, lost revenue alert card |
| `/dashboard/campaigns` | `CampaignManager` | Campaign list, create/schedule modal, contact CSV upload, performance stats |
| `/dashboard/quotes` | `QuoteManager` | Quote list, quote detail, status update, PDF download |
| `/onboarding/industry` | `IndustrySelector` | Industry card grid, template preview, one-click apply button |

### Implementation Notes

- Use **Recharts** for all charts (already likely in the repo)
- Lead kanban should support **drag-and-drop** status changes (use `@dnd-kit/core`)
- Campaign contact upload accepts **CSV** and maps columns to `{name, phone, company}`
- All pages must be **mobile-responsive** (SME owners check on phones)
- Use **React Query** / SWR for data fetching with 30-second auto-refresh on analytics

---

## 13. Full Implementation Roadmap

### Phase 1 — Foundation (v1, 4–6 weeks)

| Step | Task |
|---|---|
| 1 | Set up `chunker.py` shared utility (text splitting, embedding generation) |
| 2 | Build `web_crawler.py` with crawl4ai + Playwright |
| 3 | Build `document_parser.py` for PDF, DOCX, XLSX, PPTX, CSV |
| 4 | Build `knowledge_gap_filler.py` with DuckDuckGo fallback |
| 5 | Build `crm_connector.py` for HubSpot + Salesforce |
| 6 | Build `knowledge_refresh.py` APScheduler worker |
| 7 | Build Knowledge Sources REST API and frontend page |

### Phase 2 — Revenue Generation (v2, 3–4 weeks)

| Step | Task |
|---|---|
| 8 | Build `lead_qualifier.py` + Lead DB model |
| 9 | Integrate lead qualification into `agent.py` |
| 10 | Build `quote_generator.py` + Quote DB model |
| 11 | Add quote generation as agent tool |
| 12 | Build `/dashboard/leads` Kanban page |
| 13 | Build `/dashboard/quotes` page |

### Phase 3 — Retention & Automation (v2, 3–4 weeks)

| Step | Task |
|---|---|
| 14 | Build `whatsapp_campaigns.py` (broadcasts + follow-up sequences) |
| 15 | Build Campaign + CampaignContact DB models |
| 16 | Build `/dashboard/campaigns` page with CSV upload |
| 17 | Build `post_sale_automation.py` (check-in → review → referral) |
| 18 | Build `payment_link.py` + add as agent tool |

### Phase 4 — Intelligence & Scale (v2, 2–3 weeks)

| Step | Task |
|---|---|
| 19 | Build `analytics.py` + daily lost revenue alert job |
| 20 | Build `/dashboard/analytics` page |
| 21 | Build industry templates for all 6 verticals + `/onboarding/industry` |
| 22 | Build `shopify_connector.py` + `calendar.py` integrations |
| 23 | Extend `sentiment.py` with escalation trigger + owner notification |

---

## 14. Additional Environment Variables

Add to `.env` / secrets manager:

```env
# Lead Qualification
LEAD_QUALIFICATION_MIN_TURNS=3
HOT_LEAD_SCORE_THRESHOLD=70
WARM_LEAD_SCORE_THRESHOLD=40

# WhatsApp Campaigns
WHATSAPP_DAILY_MESSAGE_LIMIT=1000
FOLLOWUP_SEQUENCE_ENABLED=true

# Post-Sale Automation
CHECKIN_DELAY_DAYS=3
REVIEW_REQUEST_MIN_SENTIMENT=0.75
REFERRAL_DISCOUNT_PERCENT=10

# Analytics
DAILY_ALERT_HOUR=8
DEFAULT_AVG_DEAL_VALUE=500

# Integrations
SHOPIFY_API_VERSION=2024-01
GOOGLE_CALENDAR_CREDENTIALS_PATH=/secrets/google_calendar.json
```

---

## 15. Complete File Creation & Modification List

### Files to CREATE (v2.0 additions)

**Backend — Services**
- `backend/app/services/lead_qualifier.py`
- `backend/app/services/quote_generator.py`
- `backend/app/services/whatsapp_campaigns.py`
- `backend/app/services/post_sale_automation.py`
- `backend/app/services/payment_link.py`
- `backend/app/services/analytics.py`
- `backend/app/services/integrations/shopify_connector.py`
- `backend/app/services/integrations/calendar.py`

**Backend — Models**
- `backend/app/models/lead.py`
- `backend/app/models/campaign.py`
- `backend/app/models/quote.py`

**Backend — Templates**
- `backend/app/data/templates/restaurant/knowledge_base.json`
- `backend/app/data/templates/restaurant/conversation_flow.json`
- `backend/app/data/templates/restaurant/system_prompt.txt`
- *(same three files for: salon, real_estate, clinic, ecommerce, trades)*

**Frontend — Pages**
- `frontend/src/app/dashboard/leads/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`
- `frontend/src/app/dashboard/campaigns/page.tsx`
- `frontend/src/app/dashboard/quotes/page.tsx`
- `frontend/src/app/onboarding/industry/page.tsx`

### Files to MODIFY (v2.0 additions)

| File | Changes |
|---|---|
| `backend/app/services/agent.py` | Add lead qualification, sentiment escalation, payment tool, quote tool |
| `backend/app/services/sentiment.py` | Extend with escalation trigger and owner notification |
| `backend/app/workers/knowledge_refresh.py` | Add daily lost revenue alert job |
| `backend/app/main.py` | Register new API routers (leads, campaigns, quotes, analytics) |
| `backend/requirements.txt` | Add: `shopify`, `google-auth`, `pyairtable`, `dnd-kit` |

---

## Appendix: Additional Dependencies (v2.0)

```
# requirements.txt additions
shopify>=12.0.0
google-auth>=2.28.0
google-api-python-client>=2.120.0
pyairtable>=2.3.0
stripe>=8.0.0  # already present — ensure >= 8.0.0

# package.json additions (frontend)
@dnd-kit/core
@dnd-kit/sortable
recharts  # likely already present
```

---

*NexusAI PRD v2.0 — Generated for tech-hive-dev/nexusai*
