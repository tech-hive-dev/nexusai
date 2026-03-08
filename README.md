# NexusAI — Multi-Tenant AI Chat Agent Platform

> Deploy a custom AI agent for any business in under 30 minutes.
> Handles customer support, appointments, orders, leads, and more — across WhatsApp, website, Facebook, email.

---

## ⚡ Quick Start (5 minutes)

### Prerequisites
- Docker + Docker Compose installed
- Anthropic API key (get from console.anthropic.com)

### 1. Clone & configure
```bash
git clone <your-repo>
cd nexusai
cp .env.example .env
```

Edit `.env` and add at minimum:
```
ANTHROPIC_API_KEY=your_key_here
```

### 2. Start everything
```bash
docker-compose up --build
```

### 3. Open the app
- **Dashboard:** http://localhost:3000
- **API docs:** http://localhost:8000/docs
- Register your first business account and follow the onboarding wizard.

---

## 🏗 Project Structure

```
nexusai/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/               # REST API routes
│   │   │   ├── auth.py        # Register, login, JWT
│   │   │   ├── chat.py        # Chat messages + WebSocket
│   │   │   ├── knowledge.py   # Knowledge base management
│   │   │   ├── tenants.py     # Tenant settings
│   │   │   ├── leads.py       # CRM / leads
│   │   │   ├── analytics.py   # Dashboard metrics
│   │   │   └── webhooks.py    # WhatsApp, Facebook, Stripe
│   │   ├── core/
│   │   │   ├── config.py      # All environment settings
│   │   │   ├── database.py    # SQLAlchemy async setup
│   │   │   └── auth.py        # JWT utilities
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── services/
│   │   │   ├── agent.py       # 🧠 CORE AI AGENT (Claude + tools)
│   │   │   ├── knowledge.py   # RAG pipeline (embed + search)
│   │   │   ├── language.py    # Language detection
│   │   │   └── email.py       # SendGrid email
│   │   └── workers/           # Background jobs
│   ├── db/init.sql            # Database schema
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Next.js 14 dashboard
│   ├── app/
│   │   ├── page.tsx           # Root redirect
│   │   ├── login/page.tsx     # Login + Register
│   │   ├── onboarding/page.tsx # 4-step onboarding wizard
│   │   └── dashboard/page.tsx # Main dashboard
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── dashboard/        # All dashboard views
│   └── Dockerfile
├── widget/
│   └── nexusai.js             # Embeddable chat widget
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔑 Core Features

### AI Agent (backend/app/services/agent.py)
- Powered by **Claude claude-sonnet-4-20250514** via Anthropic API
- **RAG**: searches your knowledge base before every response
- **Tool calling**: books appointments, checks orders, captures leads, creates tickets, sends payment links, escalates to humans
- **Multilingual**: detects and responds in customer's language automatically
- **Sentiment analysis**: detects angry/frustrated customers and adjusts tone

### Knowledge Base (backend/app/services/knowledge.py)
- Ingests: websites (crawling), PDFs, Excel/CSV, YouTube transcripts, manual text
- Stores embeddings in **pgvector** (PostgreSQL extension)
- RAG retrieval: top-5 relevant chunks injected into every agent prompt

### Multi-Tenancy
- Each business gets their own DB records (tenant_id scoped)
- Separate knowledge base per tenant
- Per-tenant: agent name, persona, brand color, conversation limits, plan

### Channels
- **Website widget**: `widget/nexusai.js` — one `<script>` tag
- **WhatsApp**: webhook at `/webhooks/whatsapp/{tenant_slug}`
- **Facebook Messenger**: webhook at `/webhooks/facebook/{tenant_slug}`
- **REST API**: `POST /api/chat/message` for custom integrations

---

## 🔧 Configuration

### Required (add to .env)
```bash
ANTHROPIC_API_KEY=sk-ant-...      # Get from console.anthropic.com
```

### For embeddings (RAG knowledge search)
```bash
OPENAI_API_KEY=sk-...             # For text-embedding-3-small
```
> Without this, the agent will still work but won't search your knowledge base.

### For WhatsApp
```bash
WHATSAPP_TOKEN=...                # From Meta Developer Console
WHATSAPP_PHONE_ID=...             # Your WhatsApp Business phone ID
WHATSAPP_VERIFY_TOKEN=nexusai_verify
```
Webhook URL to configure in Meta: `https://yourdomain.com/webhooks/whatsapp/{tenant_slug}`

### For Facebook Messenger
```bash
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```
Webhook URL: `https://yourdomain.com/webhooks/facebook/{tenant_slug}`

### For email (escalation alerts, broadcasts)
```bash
SENDGRID_API_KEY=SG....
EMAIL_FROM=hello@yourdomain.com
```

### For payments in chat
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚀 Deploying to Production

### Railway (Easiest — Recommended for MVP)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```
Set all environment variables in Railway dashboard.

### Manual VPS (Ubuntu)
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone your repo
git clone <your-repo> && cd nexusai

# Add your .env
nano .env

# Start
docker-compose -f docker-compose.yml up -d

# Setup nginx + SSL (use certbot)
sudo apt install nginx certbot python3-certbot-nginx
```

### Custom Domain Per Customer
Each tenant gets a subdomain via DNS:
- Add CNAME: `*.yourdomain.com` → your server IP
- Tenant slug becomes their subdomain automatically

---

## 🧪 Testing the Agent

### Via API
```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Do you have any promotions today?",
    "tenant_slug": "your-business-slug",
    "channel": "website"
  }'
```

### Via Website Widget
Add to any HTML file:
```html
<script>
  window.NexusAIConfig = {
    tenantSlug: "your-business-slug",
    agentName: "Aria",
    brandColor: "#4FFFB0",
    apiUrl: "http://localhost:8000"
  };
</script>
<script src="http://localhost:8000/widget/nexusai.js" async></script>
```

---

## 💰 Pricing Model

| Plan     | Price    | Conversations | Channels |
|----------|----------|---------------|----------|
| Starter  | $97/mo   | 500/mo        | 2        |
| Growth   | $247/mo  | 2,000/mo      | 5        |
| Business | $497/mo  | 10,000/mo     | Unlimited|

Modify `conversation_limit` per tenant in the DB to enforce plan limits.

---

## 📞 Need Help?

- API docs: http://localhost:8000/docs (auto-generated by FastAPI)
- All environment variables are in `.env.example`
- Use Claude.ai or Cursor to extend and customize this codebase
