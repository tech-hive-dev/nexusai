-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS (one per business) ─────────────────────────────────
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,      -- used in subdomain: slug.nexusai.app
    industry VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    language_default VARCHAR(10) DEFAULT 'en',
    language_fallback VARCHAR(10) DEFAULT 'en',
    agent_name VARCHAR(100) DEFAULT 'Aria',
    agent_persona TEXT DEFAULT 'Friendly, professional, helpful',
    brand_color VARCHAR(7) DEFAULT '#4FFFB0',
    logo_url TEXT,
    business_hours JSONB DEFAULT '{"mon-fri": "9:00-18:00", "sat": "10:00-14:00"}',
    escalation_email VARCHAR(255),
    escalation_after_failures INT DEFAULT 3,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'starter',     -- starter | growth | business
    plan_status VARCHAR(50) DEFAULT 'trial', -- trial | active | past_due | cancelled
    trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
    conversation_count INT DEFAULT 0,
    conversation_limit INT DEFAULT 500,
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (business owners / staff) ────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'owner',       -- owner | admin | staff
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KNOWLEDGE SOURCES ──────────────────────────────────────────
CREATE TABLE knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,              -- website | pdf | excel | youtube | manual | social
    name VARCHAR(255) NOT NULL,
    url TEXT,
    file_path TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending | processing | indexed | failed
    chunk_count INT DEFAULT 0,
    error_message TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KNOWLEDGE CHUNKS (vector embeddings) ───────────────────────
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),                -- text-embedding-3-small dimensions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
CREATE INDEX ON knowledge_chunks(tenant_id);

-- ─── CHANNELS ───────────────────────────────────────────────────
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,             -- website | whatsapp | facebook | instagram | email
    config JSONB DEFAULT '{}',             -- tokens, page IDs, phone numbers etc
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CUSTOMERS (leads captured by agent) ────────────────────────
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255),              -- WhatsApp number, FB user ID, email etc
    channel VARCHAR(50),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',        -- past orders, interests, etc
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    last_seen_at TIMESTAMPTZ,
    total_conversations INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, external_id, channel)
);

-- ─── CONVERSATIONS ───────────────────────────────────────────────
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',     -- open | resolved | escalated | human
    language VARCHAR(10) DEFAULT 'en',
    sentiment VARCHAR(20),                 -- positive | neutral | negative | angry
    intent VARCHAR(100),                   -- appointment | order | support | inquiry | complaint
    human_agent_id UUID REFERENCES users(id),
    is_human_takeover BOOLEAN DEFAULT false,
    session_data JSONB DEFAULT '{}',       -- appointment details, cart items, etc
    rating INT,                            -- 1-5 CSAT score
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ─── MESSAGES ───────────────────────────────────────────────────
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,             -- user | assistant | system
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text | image | voice | file | card
    media_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_human_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON messages(conversation_id);
CREATE INDEX ON messages(tenant_id, created_at DESC);

-- ─── APPOINTMENTS ───────────────────────────────────────────────
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(255),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'pending',  -- pending | confirmed | cancelled | completed
    cal_booking_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDERS ─────────────────────────────────────────────────────
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    external_order_id VARCHAR(255),        -- Shopify order ID etc
    status VARCHAR(50),
    items JSONB DEFAULT '[]',
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BROADCASTS ──────────────────────────────────────────────────
CREATE TABLE broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255),
    type VARCHAR(50),                      -- email | whatsapp
    subject VARCHAR(255),
    content TEXT,
    target_filter JSONB DEFAULT '{}',      -- filter criteria for recipients
    status VARCHAR(50) DEFAULT 'draft',    -- draft | scheduled | sending | sent | failed
    recipient_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TICKETS ─────────────────────────────────────────────────────
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(50),                  -- billing | delivery | technical | complaint | refund
    priority VARCHAR(20) DEFAULT 'medium', -- low | medium | high | critical
    status VARCHAR(50) DEFAULT 'open',     -- open | in_progress | resolved | closed
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANALYTICS (daily rollup) ────────────────────────────────────
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    conversations_total INT DEFAULT 0,
    conversations_resolved INT DEFAULT 0,
    conversations_escalated INT DEFAULT 0,
    leads_captured INT DEFAULT 0,
    appointments_booked INT DEFAULT 0,
    messages_total INT DEFAULT 0,
    avg_response_time_ms INT,
    UNIQUE(tenant_id, date)
);

-- ─── CART RECOVERIES ─────────────────────────────────────────────
CREATE TABLE cart_recoveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    cart_data JSONB,
    cart_url TEXT,
    discount_code VARCHAR(50),
    messages_sent INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',   -- in_progress | recovered | expired
    recovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── UPSELL EVENTS ───────────────────────────────────────────────
CREATE TABLE upsell_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    primary_product VARCHAR(255),
    suggested_product VARCHAR(255),
    was_accepted BOOLEAN DEFAULT false,
    resulted_in_sale BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENT TRANSACTIONS ────────────────────────────────────────
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    customer_id UUID REFERENCES customers(id),
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',       -- pending | succeeded | failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RESELLERS ───────────────────────────────────────────────────
CREATE TABLE resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    company_name VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    api_key VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reseller_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID REFERENCES resellers(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    retail_price DECIMAL(10,2),
    wholesale_price DECIMAL(10,2),
    custom_domain VARCHAR(255),
    logo_url TEXT,
    remove_nexusai_branding BOOLEAN DEFAULT false,
    brand_overrides JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AGENT TEMPLATES (marketplace) ──────────────────────────────
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    icon VARCHAR(10),
    system_prompt TEXT,
    starter_knowledge JSONB DEFAULT '[]',
    config_defaults JSONB DEFAULT '{}',
    is_premium BOOLEAN DEFAULT false,
    price_cents INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROACTIVE MESSAGES ──────────────────────────────────────────
CREATE TABLE proactive_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    trigger_type VARCHAR(50),               -- reengagement | birthday | appointment_reminder | stock_alert
    message_text TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEW REQUESTS ─────────────────────────────────────────────
CREATE TABLE review_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),
    type VARCHAR(20),                       -- csat | google_review | feedback
    status VARCHAR(20) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TENANT INTEGRATIONS ─────────────────────────────────────────
CREATE TABLE tenant_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    integration_type VARCHAR(100),          -- calcom | google_calendar | stripe | shopify | slack
    credentials JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ALTER EXISTING TABLES (new columns) ─────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_whatsapp_number VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sla_minutes INT DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_review_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feedback_form_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shopify_store_domain VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS woocommerce_secret TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_internal_mode BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days INT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pii_detection_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS blocked_topics JSONB DEFAULT '[]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vocabulary_overrides JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hide_ai_identity BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_replies_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS competitor_playbook JSONB DEFAULT '[]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hidden_templates JSONB DEFAULT '[]';

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_score INT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_requested_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS dominant_emotion VARCHAR(50);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS annotation VARCHAR(50);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS flagged_pii BOOLEAN DEFAULT false;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_summary TEXT;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ─── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX ON conversations(tenant_id, status);
CREATE INDEX ON conversations(tenant_id, created_at DESC);
CREATE INDEX ON customers(tenant_id);
CREATE INDEX ON customers(tenant_id, email);
CREATE INDEX ON messages(conversation_id, created_at);
CREATE INDEX ON tickets(tenant_id, status);
CREATE INDEX ON cart_recoveries(tenant_id, status);
CREATE INDEX ON upsell_events(tenant_id, created_at DESC);
CREATE INDEX ON reseller_clients(reseller_id);
