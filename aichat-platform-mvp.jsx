import { useState, useEffect, useRef } from "react";

const SECTIONS = ["overview", "architecture", "onboarding", "dashboard", "deployment", "marketing", "roadmap"];

const NAV_LABELS = {
  overview: "Product Overview",
  architecture: "Tech Architecture",
  onboarding: "Customer Onboarding",
  dashboard: "Agent Dashboard",
  deployment: "Deployment Plan",
  marketing: "Go-To-Market",
  roadmap: "MVP Roadmap",
};

function TopNav({ active, setActive }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(8,8,20,0.92)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(99,211,170,0.15)",
      display: "flex", alignItems: "center", gap: 0,
      padding: "0 32px", height: 56,
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{ color: "#63D3AA", fontWeight: 700, fontSize: 15, marginRight: 32, letterSpacing: 1, whiteSpace: "nowrap" }}>
        ◆ NEXUS<span style={{ color: "#fff", fontWeight: 300 }}>AI</span>
      </div>
      <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1 }}>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setActive(s)} style={{
            background: active === s ? "rgba(99,211,170,0.12)" : "transparent",
            border: "none", color: active === s ? "#63D3AA" : "rgba(255,255,255,0.45)",
            padding: "6px 14px", borderRadius: 6, cursor: "pointer",
            fontSize: 11.5, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
            whiteSpace: "nowrap", transition: "all 0.15s",
            borderBottom: active === s ? "2px solid #63D3AA" : "2px solid transparent",
          }}>{NAV_LABELS[s].toUpperCase()}</button>
        ))}
      </div>
    </nav>
  );
}

function Badge({ children, color = "#63D3AA" }) {
  return (
    <span style={{
      background: color + "18", border: `1px solid ${color}40`,
      color, borderRadius: 4, padding: "2px 8px", fontSize: 11,
      fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: 24,
      ...style
    }}>{children}</div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: 26, marginBottom: 8, fontWeight: 700 }}>{children}</h2>;
}
function H3({ children, color = "#63D3AA" }) {
  return <h3 style={{ fontFamily: "'DM Mono', monospace", color, fontSize: 13, letterSpacing: 1, marginBottom: 12, marginTop: 0 }}>{children}</h3>;
}
function P({ children }) {
  return <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.75, margin: "0 0 10px 0" }}>{children}</p>;
}

// ─── SECTIONS ───────────────────────────────────────────────────────────────

function OverviewSection() {
  const features = [
    { icon: "🧠", title: "Adaptive AI Brain", desc: "Learns from websites, PDFs, Excel, CRM, YouTube videos, and social comments. Gets smarter with every conversation." },
    { icon: "🌍", title: "Multilingual, Mid-Chat", desc: "Auto-detects language switches mid-conversation and responds accordingly. Supports 50+ languages natively." },
    { icon: "📅", title: "Appointments & Orders", desc: "Books appointments, processes orders, manages support tickets — all autonomously through natural conversation." },
    { icon: "📧", title: "Email In + Out", desc: "Reads incoming customer emails, generates replies, sends confirmations, follow-ups and broadcasts." },
    { icon: "🔗", title: "Omnichannel", desc: "Embed on website, WhatsApp, Facebook Messenger, Instagram DM, WordPress, Shopify, and any platform via API." },
    { icon: "🎯", title: "Lead Scraper & CRM", desc: "Captures customer info during every chat. Stores leads in DB. Enables email campaigns and broadcast messaging." },
    { icon: "🏢", title: "Multi-Tenant SaaS", desc: "Each business gets their own isolated AI agent. One backend, infinite deployments with per-customer config." },
    { icon: "📊", title: "Analytics Dashboard", desc: "Conversation stats, lead counts, resolution rates, top intents — all in real-time for each business." },
  ];

  const integrations = [
    { name: "WhatsApp", color: "#25D366" },
    { name: "Facebook", color: "#1877F2" },
    { name: "Instagram", color: "#E1306C" },
    { name: "Shopify", color: "#96BF48" },
    { name: "WordPress", color: "#21759B" },
    { name: "Gmail", color: "#EA4335" },
    { name: "Outlook", color: "#0078D4" },
    { name: "Slack", color: "#4A154B" },
    { name: "Zapier", color: "#FF4A00" },
    { name: "HubSpot", color: "#FF7A59" },
    { name: "Salesforce", color: "#00A1E0" },
    { name: "REST API", color: "#63D3AA" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Badge>MVP BLUEPRINT</Badge>
          <Badge color="#FF9F43">SaaS PLATFORM</Badge>
          <Badge color="#A29BFE">MULTI-TENANT</Badge>
        </div>
        <H2>NexusAI — The Autonomous Business Agent Platform</H2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 20 }}>
          Deploy a custom AI agent for ANY business in under 30 minutes
        </p>
        <P>
          NexusAI lets businesses deploy a fully autonomous AI agent that handles customer conversations across every channel —
          learning from their own data, booking appointments, processing orders, managing support, and capturing leads —
          all without writing a single line of code.
        </P>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {features.map(f => (
          <Card key={f.title}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
            <H3>{f.title}</H3>
            <P>{f.desc}</P>
          </Card>
        ))}
      </div>

      <Card>
        <H3>SUPPORTED INTEGRATIONS</H3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {integrations.map(i => (
            <span key={i.name} style={{
              background: i.color + "18", border: `1px solid ${i.color}40`,
              color: i.color, borderRadius: 20, padding: "5px 14px",
              fontSize: 12, fontFamily: "'DM Mono', monospace",
            }}>{i.name}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ArchSection() {
  const layers = [
    {
      name: "FRONTEND LAYER",
      color: "#63D3AA",
      items: [
        "Next.js 14 — Admin Dashboard & Onboarding Portal",
        "React Widget — Embeddable chat bubble (2KB gzip)",
        "Mobile SDKs — React Native wrapper for iOS/Android",
      ]
    },
    {
      name: "API GATEWAY",
      color: "#A29BFE",
      items: [
        "FastAPI (Python) — Main REST API with async support",
        "WebSocket Server — Real-time chat with <50ms latency",
        "Rate limiting per tenant, auth via JWT + API keys",
      ]
    },
    {
      name: "AI / LLM LAYER",
      color: "#FF9F43",
      items: [
        "Claude claude-sonnet-4-20250514 — Core reasoning & conversation engine",
        "OpenAI Whisper — Voice transcription (future)",
        "LangChain — Orchestration, tool calling, memory chains",
        "pgvector — Vector similarity search for RAG",
      ]
    },
    {
      name: "KNOWLEDGE INGESTION",
      color: "#FD79A8",
      items: [
        "Crawl4AI — Website scraping & sitemap ingestion",
        "PyPDF2 + Unstructured — PDF, Word, Excel parsing",
        "YouTube Transcript API — Video content extraction",
        "Social APIs — Facebook, Instagram comments & posts",
        "Chunking + Embedding pipeline → stored in pgvector",
      ]
    },
    {
      name: "AGENT CAPABILITIES",
      color: "#74B9FF",
      items: [
        "Tool Calling: Calendar (Cal.com API), Email (SendGrid/Gmail API)",
        "Order Management: Shopify API, WooCommerce API",
        "CRM Write: HubSpot, custom DB lead capture",
        "Ticket System: Zendesk, Freshdesk, or built-in ticketing",
        "Broadcast: Mailchimp/SendGrid bulk email to captured leads",
      ]
    },
    {
      name: "DATA LAYER",
      color: "#55EFC4",
      items: [
        "PostgreSQL — Core DB (tenants, conversations, leads, configs)",
        "pgvector extension — Per-tenant knowledge embeddings",
        "Redis — Session cache, rate limits, real-time pub/sub",
        "S3 / R2 — File storage for uploads, exports",
      ]
    },
    {
      name: "MULTI-TENANCY",
      color: "#FDCB6E",
      items: [
        "Schema-per-tenant in PostgreSQL for data isolation",
        "Tenant config: brand colors, persona, language defaults",
        "Per-tenant rate limits, token budgets, model selection",
        "Each business gets unique subdomain: bizname.nexusai.app",
      ]
    },
    {
      name: "INFRA / DEVOPS",
      color: "#E17055",
      items: [
        "Docker + Docker Compose for local & production",
        "Kubernetes (GKE/EKS) for auto-scaling per tenant load",
        "GitHub Actions CI/CD pipeline",
        "Nginx reverse proxy + SSL termination",
      ]
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>Technical Architecture</H2>
        <P>Multi-tenant, horizontally scalable architecture. One deployment serves all customers with full data isolation.</P>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, marginBottom: 32 }}>
        {layers.map(l => (
          <Card key={l.name}>
            <H3 color={l.color}>{l.name}</H3>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {l.items.map(item => (
                <li key={item} style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.7 }}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card style={{ borderColor: "rgba(99,211,170,0.2)" }}>
        <H3>TECH STACK SUMMARY</H3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[
            ["Backend", "Python + FastAPI"],
            ["Frontend", "Next.js 14 + Tailwind"],
            ["AI Orchestration", "LangChain + Claude API"],
            ["Vector DB", "PostgreSQL + pgvector"],
            ["Cache", "Redis"],
            ["File Store", "Cloudflare R2 / AWS S3"],
            ["Auth", "Clerk.dev or Auth0"],
            ["Payments", "Stripe"],
            ["Email", "SendGrid / Resend"],
            ["Hosting", "Railway (MVP) → AWS/GCP (Scale)"],
            ["DNS/CDN", "Cloudflare"],
            ["Monitoring", "Sentry + Grafana + Posthog"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ color: "#63D3AA", fontSize: 10, fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>{k.toUpperCase()}</div>
              <div style={{ color: "#fff", fontSize: 13 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OnboardingSection() {
  const steps = [
    {
      n: "01", title: "Business Registration", color: "#63D3AA",
      desc: "Business signs up on platform. Fills basic info: name, industry, timezone, default language, brand colors, agent persona name.",
      actions: ["Company name + logo upload", "Industry selection (35 presets)", "Time zone + business hours", "Agent name + avatar", "Primary language + fallback languages"],
    },
    {
      n: "02", title: "Knowledge Base Setup", color: "#A29BFE",
      desc: "The core step. Business provides all sources from which the AI agent will learn about their business.",
      actions: [
        "🌐 Website URL → Auto-crawl entire site",
        "📄 Upload PDFs (product docs, manuals, FAQs)",
        "📊 Excel / CSV (product catalog, pricing, inventory)",
        "🎬 YouTube URLs → Auto-transcript extraction",
        "💬 Facebook/Instagram → Pull posts & comments",
        "📝 Manual Q&A entry (custom intents)",
        "🔗 CRM API key (HubSpot, Salesforce)",
      ],
    },
    {
      n: "03", title: "Capabilities Config", color: "#FF9F43",
      desc: "Business selects which agent capabilities to enable.",
      actions: [
        "✅ Appointment booking (connect Cal.com or Google Calendar)",
        "✅ Order management (connect Shopify / WooCommerce)",
        "✅ Email reading + sending (connect Gmail / Outlook OAuth)",
        "✅ Support tickets (Zendesk API key or built-in)",
        "✅ Lead capture form fields (name, email, phone, custom)",
        "✅ Broadcast messaging (connect Mailchimp or SendGrid)",
      ],
    },
    {
      n: "04", title: "Channel Integration", color: "#FD79A8",
      desc: "Choose where the agent will be deployed and live.",
      actions: [
        "📋 Copy-paste website embed code (<script> tag)",
        "🟢 WhatsApp Business API token entry",
        "🔵 Facebook Page + Messenger app token",
        "📷 Instagram DM via Facebook API",
        "🛒 Shopify app install (1-click from Shopify store)",
        "🌐 WordPress plugin download + API key",
        "🔑 REST API credentials for custom integrations",
      ],
    },
    {
      n: "05", title: "Training & Go Live", color: "#74B9FF",
      desc: "AI processes all knowledge sources, runs test conversations, and gets deployed.",
      actions: [
        "Knowledge ingestion pipeline runs (5–20 min depending on size)",
        "Auto-generate test Q&A from ingested content",
        "Business reviews 10 sample responses and approves",
        "Escalation rules: when to hand off to human",
        "Agent goes LIVE across all selected channels",
      ],
    },
    {
      n: "06", title: "Ongoing Learning", color: "#FDCB6E",
      desc: "Every conversation improves the agent automatically.",
      actions: [
        "Human corrections feed back into knowledge base",
        "Unresolved queries flagged for business to answer",
        "Weekly auto-retrain on new conversations",
        "Business can add/update knowledge any time",
        "A/B test different response styles",
      ],
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>Customer Onboarding Flow</H2>
        <P>A guided 6-step wizard gets any business live with their AI agent in under 30 minutes.</P>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {steps.map(s => (
          <Card key={s.n} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{
              minWidth: 48, height: 48, borderRadius: "50%",
              background: s.color + "20", border: `2px solid ${s.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: s.color, fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14,
            }}>{s.n}</div>
            <div style={{ flex: 1 }}>
              <H3 color={s.color}>{s.title}</H3>
              <P>{s.desc}</P>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {s.actions.map(a => (
                  <div key={a} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: 12,
                  }}>{a}</div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DashboardSection() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = ["overview", "conversations", "leads", "knowledge", "channels", "settings"];

  const metrics = [
    { label: "Total Conversations", value: "1,247", delta: "+18%", color: "#63D3AA" },
    { label: "Leads Captured", value: "342", delta: "+31%", color: "#A29BFE" },
    { label: "Resolution Rate", value: "87%", delta: "+4%", color: "#FF9F43" },
    { label: "Avg Response Time", value: "1.2s", delta: "-0.3s", color: "#FD79A8" },
    { label: "Appointments Booked", value: "89", delta: "+12%", color: "#74B9FF" },
    { label: "Orders Processed", value: "156", delta: "+22%", color: "#FDCB6E" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>Agent Dashboard (UI Spec)</H2>
        <P>Each business gets a private dashboard to monitor, train, and configure their AI agent.</P>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, background: activeTab === t ? "rgba(99,211,170,0.15)" : "transparent",
            border: "none", color: activeTab === t ? "#63D3AA" : "rgba(255,255,255,0.4)",
            padding: "8px 4px", borderRadius: 7, cursor: "pointer",
            fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
            transition: "all 0.15s",
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            {metrics.map(m => (
              <Card key={m.label} style={{ textAlign: "center" }}>
                <div style={{ color: m.color, fontSize: 28, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "4px 0" }}>{m.label}</div>
                <div style={{ color: "#63D3AA", fontSize: 11 }}>{m.delta} this week</div>
              </Card>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card>
              <H3>TOP INTENTS (This Week)</H3>
              {[["Product inquiry", 38], ["Pricing question", 24], ["Order status", 19], ["Appointment booking", 11], ["Return request", 8]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{k}</div>
                  <div style={{ width: `${v * 2.5}px`, height: 6, background: "#63D3AA30", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${v}%`, background: "#63D3AA", borderRadius: 3 }} />
                  </div>
                  <div style={{ color: "#63D3AA", fontSize: 12, fontFamily: "'DM Mono', monospace", minWidth: 24, textAlign: "right" }}>{v}%</div>
                </div>
              ))}
            </Card>
            <Card>
              <H3>CHANNELS BREAKDOWN</H3>
              {[
                { ch: "Website Chat", pct: 45, color: "#63D3AA" },
                { ch: "WhatsApp", pct: 28, color: "#25D366" },
                { ch: "Facebook", pct: 17, color: "#1877F2" },
                { ch: "Instagram", pct: 10, color: "#E1306C" },
              ].map(c => (
                <div key={c.ch} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{c.ch}</div>
                  <div style={{ width: 80, height: 6, background: c.color + "20", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ color: c.color, fontSize: 12, fontFamily: "'DM Mono', monospace", minWidth: 32, textAlign: "right" }}>{c.pct}%</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "conversations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { name: "Ahmed K.", ch: "WhatsApp", msg: "I need to book an appointment for next Tuesday", status: "RESOLVED", lang: "EN", time: "2m ago" },
            { name: "Zara M.", ch: "Website", msg: "¿Cuánto cuesta el plan premium?", status: "OPEN", lang: "ES", time: "5m ago" },
            { name: "John D.", ch: "Facebook", msg: "My order #4521 hasn't arrived yet", status: "ESCALATED", lang: "EN", time: "12m ago" },
            { name: "Fatima A.", ch: "Instagram", msg: "Do you ship to Dubai?", status: "RESOLVED", lang: "EN", time: "18m ago" },
          ].map(c => (
            <Card key={c.name} style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#63D3AA20", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#63D3AA", fontWeight: 700, fontSize: 15,
              }}>{c.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  <Badge color="#A29BFE">{c.ch}</Badge>
                  <Badge color="#74B9FF">{c.lang}</Badge>
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{c.msg}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Badge color={c.status === "RESOLVED" ? "#63D3AA" : c.status === "ESCALATED" ? "#FF7675" : "#FDCB6E"}>{c.status}</Badge>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{c.time}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "leads" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Leads", value: "342", color: "#63D3AA" },
              { label: "New This Week", value: "47", color: "#A29BFE" },
              { label: "Email Broadcast Sent", value: "3", color: "#FF9F43" },
            ].map(m => (
              <Card key={m.label} style={{ textAlign: "center" }}>
                <div style={{ color: m.color, fontSize: 32, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 }}>{m.label}</div>
              </Card>
            ))}
          </div>
          <Card>
            <H3>CAPTURED LEADS</H3>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input placeholder="Search leads..." style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none",
              }} />
              <button style={{
                background: "#63D3AA20", border: "1px solid #63D3AA40",
                color: "#63D3AA", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}>📧 BROADCAST</button>
            </div>
            {[
              { name: "Ahmed K.", email: "ahmed@email.com", phone: "+971 50 XXX", ch: "WhatsApp", date: "Today" },
              { name: "Zara M.", email: "zara@email.com", phone: "+1 555 XXX", ch: "Website", date: "Today" },
              { name: "John D.", email: "john@email.com", phone: "+44 7XXX", ch: "Facebook", date: "Yesterday" },
              { name: "Fatima A.", email: "fatima@email.com", phone: "+971 52 XXX", ch: "Instagram", date: "2 days ago" },
            ].map(l => (
              <div key={l.name} style={{
                display: "flex", gap: 14, alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#A29BFE20", display: "flex", alignItems: "center", justifyContent: "center", color: "#A29BFE", fontWeight: 700 }}>{l.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 13 }}>{l.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{l.email} · {l.phone}</div>
                </div>
                <Badge color="#A29BFE">{l.ch}</Badge>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{l.date}</div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === "knowledge" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "🌐", name: "Website Crawl", url: "yourstore.com", status: "INDEXED", docs: 142, updated: "2 days ago", color: "#63D3AA" },
            { icon: "📄", name: "Product Manual.pdf", url: "Upload", status: "INDEXED", docs: 38, updated: "1 week ago", color: "#A29BFE" },
            { icon: "📊", name: "Product Catalog.xlsx", url: "Upload", status: "INDEXED", docs: 87, updated: "3 days ago", color: "#FF9F43" },
            { icon: "🎬", name: "YouTube: Company Overview", url: "youtube.com/...", status: "INDEXED", docs: 12, updated: "5 days ago", color: "#FD79A8" },
            { icon: "💬", name: "Facebook Page Comments", url: "Facebook API", status: "SYNCING", docs: 203, updated: "Live", color: "#1877F2" },
          ].map(k => (
            <Card key={k.name} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ fontSize: 28 }}>{k.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{k.name}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{k.url} · {k.docs} chunks indexed</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Badge color={k.status === "INDEXED" ? "#63D3AA" : "#FDCB6E"}>{k.status}</Badge>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>Updated: {k.updated}</div>
              </div>
            </Card>
          ))}
          <button style={{
            background: "rgba(99,211,170,0.1)", border: "2px dashed rgba(99,211,170,0.3)",
            color: "#63D3AA", borderRadius: 12, padding: "16px", cursor: "pointer",
            fontSize: 13, fontFamily: "'DM Mono', monospace",
          }}>+ ADD KNOWLEDGE SOURCE</button>
        </div>
      )}

      {activeTab === "channels" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {[
            { name: "Website Chat", icon: "💬", connected: true, color: "#63D3AA", detail: "Embed code ready" },
            { name: "WhatsApp Business", icon: "🟢", connected: true, color: "#25D366", detail: "+971 50 XXX XXXX" },
            { name: "Facebook Messenger", icon: "🔵", connected: true, color: "#1877F2", detail: "YourBrand Page" },
            { name: "Instagram DM", icon: "📷", connected: false, color: "#E1306C", detail: "Connect via Facebook" },
            { name: "Shopify Store", icon: "🛒", connected: false, color: "#96BF48", detail: "Install app" },
            { name: "Email (Gmail)", icon: "📧", connected: true, color: "#EA4335", detail: "hello@yourbiz.com" },
            { name: "WordPress", icon: "🌐", connected: false, color: "#21759B", detail: "Download plugin" },
            { name: "REST API", icon: "🔑", connected: true, color: "#A29BFE", detail: "API key active" },
          ].map(c => (
            <Card key={c.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{c.detail}</div>
                </div>
              </div>
              <button style={{
                width: "100%", padding: "7px", borderRadius: 7, cursor: "pointer", fontSize: 11,
                fontFamily: "'DM Mono', monospace", border: `1px solid ${c.color}40`,
                background: c.connected ? c.color + "15" : "transparent",
                color: c.connected ? c.color : "rgba(255,255,255,0.4)",
              }}>
                {c.connected ? "✓ CONNECTED" : "CONNECT →"}
              </button>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { title: "Agent Persona", fields: [["Agent Name", "Aria"], ["Tone", "Professional & Friendly"], ["Fallback msg", "Let me connect you to support..."]] },
            { title: "Language Settings", fields: [["Primary Language", "English (EN)"], ["Auto-detect", "Enabled"], ["Fallback Language", "Arabic (AR)"]] },
            { title: "Escalation Rules", fields: [["Escalate after", "3 failed attempts"], ["Human email", "support@yourbiz.com"], ["Escalation channel", "Email + Slack"]] },
            { title: "Business Hours", fields: [["Mon–Fri", "9:00 AM – 6:00 PM"], ["Sat", "10:00 AM – 2:00 PM"], ["After-hours mode", "AI handles + emails"]] },
          ].map(s => (
            <Card key={s.title}>
              <H3>{s.title.toUpperCase()}</H3>
              {s.fields.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{k}</span>
                  <span style={{ color: "#fff", fontSize: 12, background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4 }}>{v}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeploySection() {
  const phases = [
    {
      title: "Phase 1: MVP Infrastructure (Week 1–2)", color: "#63D3AA",
      items: [
        "Set up monorepo: /backend (FastAPI), /frontend (Next.js), /worker (ingestion)",
        "PostgreSQL + pgvector on Railway or Supabase ($25/mo to start)",
        "Redis on Railway or Upstash (free tier → $10/mo)",
        "Docker Compose for local dev environment",
        "Deploy backend + frontend to Railway (~$20/mo for MVP)",
        "Cloudflare for DNS, SSL, and CDN (free tier)",
        "Domain: nexusai.app or similar (~$12/yr)",
      ]
    },
    {
      title: "Phase 2: Core Agent (Week 3–5)", color: "#A29BFE",
      items: [
        "LangChain + Claude API integration with tool calling",
        "Knowledge ingestion pipeline (PDF, web crawl, Excel)",
        "pgvector RAG pipeline: chunk → embed → store → retrieve",
        "Multi-tenant DB schema (one schema per business)",
        "WebSocket chat server with session memory",
        "Language detection + multilingual response routing",
        "Basic lead capture to PostgreSQL",
      ]
    },
    {
      title: "Phase 3: Channels & Integrations (Week 6–8)", color: "#FF9F43",
      items: [
        "Embeddable website chat widget (vanilla JS, <5KB)",
        "WhatsApp Business API webhook handler",
        "Facebook Messenger webhook handler",
        "Email send/receive via SendGrid + Gmail OAuth",
        "Cal.com API for appointment booking",
        "Shopify webhook for order status queries",
        "Stripe integration for subscription billing",
      ]
    },
    {
      title: "Phase 4: Dashboard & Onboarding (Week 9–11)", color: "#FD79A8",
      items: [
        "Business registration + Stripe subscription flow",
        "6-step onboarding wizard (as spec'd above)",
        "Admin dashboard: metrics, conversations, leads",
        "Knowledge base manager (add/remove/resync sources)",
        "Channel connection management UI",
        "Conversation history + correction interface",
        "Email broadcast tool for captured leads",
      ]
    },
    {
      title: "Phase 5: Test, Harden & Launch (Week 12)", color: "#74B9FF",
      items: [
        "Onboard 2–3 beta customers for free (friends, network)",
        "Load test: simulate 100 concurrent conversations",
        "Security audit: tenant data isolation verification",
        "Rate limiting + abuse prevention",
        "Monitoring: Sentry (errors) + Posthog (analytics)",
        "Public launch on Product Hunt, LinkedIn, communities",
      ]
    },
  ];

  const costs = [
    { item: "Railway (backend + DB + Redis)", cost: "$50–80/mo" },
    { item: "Anthropic Claude API (10 customers)", cost: "$100–200/mo" },
    { item: "Cloudflare (CDN, DNS)", cost: "$0–20/mo" },
    { item: "SendGrid (email)", cost: "$0–15/mo" },
    { item: "Clerk.dev (auth)", cost: "$0–25/mo" },
    { item: "Stripe fees", cost: "2.9% + $0.30/txn" },
    { item: "Domain", cost: "$12/yr" },
    { item: "TOTAL (MVP phase)", cost: "~$200–350/mo" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>Deployment Plan</H2>
        <P>12-week build plan from zero to live product. Solo founder or 2-person team can execute this.</P>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {phases.map(p => (
          <Card key={p.title}>
            <H3 color={p.color}>{p.title.toUpperCase()}</H3>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {p.items.map(i => (
                <li key={i} style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.8 }}>{i}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card style={{ borderColor: "rgba(99,211,170,0.2)" }}>
        <H3>ESTIMATED MONTHLY COSTS (MVP Phase)</H3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {costs.map(c => (
            <div key={c.item} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 12px",
              background: "rgba(255,255,255,0.03)", borderRadius: 8,
            }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{c.item}</span>
              <span style={{ color: "#63D3AA", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{c.cost}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MarketingSection() {
  const pricing = [
    { name: "STARTER", price: "$97", period: "/mo", color: "#63D3AA", features: ["1 AI Agent", "2 Channels", "500 conversations/mo", "Basic lead capture", "Email support", "Website + 1 social channel"] },
    { name: "GROWTH", price: "$247", period: "/mo", color: "#A29BFE", highlight: true, features: ["1 AI Agent", "5 Channels", "2,000 conversations/mo", "Full lead CRM + broadcast", "Appointments + Orders", "Priority support", "Custom agent persona"] },
    { name: "BUSINESS", price: "$497", period: "/mo", color: "#FF9F43", features: ["3 AI Agents", "Unlimited channels", "10,000 conversations/mo", "White-label option", "CRM integrations", "Dedicated onboarding", "SLA guarantee"] },
  ];

  const channels = [
    {
      title: "Week 1–2: Warm Network", color: "#63D3AA",
      tactics: [
        "Post on LinkedIn: 'I built an AI agent for businesses — who wants to try it free for 30 days?'",
        "Reach out to 50 small business owners in your contact list (restaurants, clinics, e-commerce)",
        "Offer 3–5 free beta accounts in exchange for testimonials and case studies",
        "Facebook groups: Business Owners, Entrepreneurs, E-commerce communities",
      ]
    },
    {
      title: "Week 3–6: Content + Communities", color: "#A29BFE",
      tactics: [
        "YouTube: '5 ways AI is handling customer service for small businesses' (show your tool)",
        "Reddit: r/entrepreneur, r/smallbusiness, r/chatbots — helpful posts, not spam",
        "LinkedIn carousel posts: 'Before/After — how this shop automated 80% of customer queries'",
        "Cold DM on LinkedIn/Instagram: target business owners with high customer interaction posts",
      ]
    },
    {
      title: "Week 5–8: Paid + Partnerships", color: "#FF9F43",
      tactics: [
        "Facebook/Instagram ads: Target business owners, $10–20/day budget, demo video",
        "Partner with WordPress/Shopify developers — offer 20% recurring revenue share",
        "Approach digital marketing agencies: white-label the tool for their clients",
        "Upwork/Fiverr: List as a service, then upsell to the SaaS subscription",
      ]
    },
    {
      title: "Month 2–3: Inbound Engine", color: "#FD79A8",
      tactics: [
        "SEO blog: 'AI chatbot for [industry]' — restaurant, clinic, real estate, e-commerce",
        "Product Hunt launch (coordinate for a Tuesday or Wednesday)",
        "AppSumo lifetime deal — great for initial cash + testimonials",
        "YouTube tutorials: 'How to set up AI customer service for your Shopify store'",
      ]
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>Go-To-Market Strategy</H2>
        <P>Goal: 10–20 paying customers in 90 days. Realistic and achievable with consistent execution.</P>
      </div>

      <div style={{ marginBottom: 32 }}>
        <H3>PRICING TIERS</H3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {pricing.map(p => (
            <Card key={p.name} style={{
              border: p.highlight ? `2px solid ${p.color}60` : undefined,
              background: p.highlight ? "rgba(162,155,254,0.06)" : undefined,
              position: "relative",
            }}>
              {p.highlight && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: p.color, color: "#000", fontSize: 10, padding: "3px 10px",
                  borderRadius: 10, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                }}>MOST POPULAR</div>
              )}
              <H3 color={p.color}>{p.name}</H3>
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: "#fff", fontSize: 32, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{p.price}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{p.period}</span>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                {p.features.map(f => (
                  <li key={f} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.8 }}>{f}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: 14, background: "rgba(99,211,170,0.05)", borderColor: "rgba(99,211,170,0.2)" }}>
          <P>💡 <strong style={{ color: "#fff" }}>Revenue math:</strong> 10 Growth customers = $2,470/mo. 20 mixed = ~$3,500–5,000/mo. Break-even at ~2–3 customers. Target MRR at month 3: <strong style={{ color: "#63D3AA" }}>$4,000–6,000</strong>.</P>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        {channels.map(c => (
          <Card key={c.title}>
            <H3 color={c.color}>{c.title.toUpperCase()}</H3>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {c.tactics.map(t => (
                <li key={t} style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.8 }}>{t}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card style={{ borderColor: "rgba(99,211,170,0.2)" }}>
        <H3>TARGET VERTICALS (Highest conversion)</H3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            "🏥 Medical Clinics", "🍽️ Restaurants", "🛒 E-commerce stores",
            "🏠 Real Estate agents", "💄 Beauty & Salons", "🎓 Online Courses / Coaching",
            "🏋️ Gyms & Fitness", "⚖️ Law Firms", "🔧 Home Services", "🚗 Auto Dealerships",
          ].map(v => (
            <span key={v} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)", padding: "6px 14px", borderRadius: 20, fontSize: 12,
            }}>{v}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RoadmapSection() {
  const milestones = [
    {
      week: "WEEKS 1–4", title: "Foundation", color: "#63D3AA",
      tasks: [
        { done: true, text: "Tech stack decision + repo setup" },
        { done: true, text: "Multi-tenant DB schema designed" },
        { done: false, text: "Core chat API (FastAPI + WebSocket)" },
        { done: false, text: "Claude API + LangChain integration" },
        { done: false, text: "Basic RAG pipeline (PDF + URL)" },
        { done: false, text: "Auth system (JWT + Clerk)" },
      ]
    },
    {
      week: "WEEKS 5–8", title: "Agent Capabilities", color: "#A29BFE",
      tasks: [
        { done: false, text: "Multilingual detection + routing" },
        { done: false, text: "Lead capture to PostgreSQL" },
        { done: false, text: "Appointment booking tool (Cal.com)" },
        { done: false, text: "Email send/receive (SendGrid)" },
        { done: false, text: "Website chat widget embeddable" },
        { done: false, text: "WhatsApp webhook integration" },
      ]
    },
    {
      week: "WEEKS 9–11", title: "Platform & Onboarding", color: "#FF9F43",
      tasks: [
        { done: false, text: "Onboarding wizard (6 steps)" },
        { done: false, text: "Business dashboard (metrics + leads)" },
        { done: false, text: "Knowledge base manager UI" },
        { done: false, text: "Channel connections UI" },
        { done: false, text: "Stripe subscriptions + billing" },
        { done: false, text: "Facebook + Instagram channels" },
      ]
    },
    {
      week: "WEEK 12", title: "Launch", color: "#FD79A8",
      tasks: [
        { done: false, text: "Beta testing with 3 real businesses" },
        { done: false, text: "Bug fixes from beta feedback" },
        { done: false, text: "Marketing site (landing page)" },
        { done: false, text: "Product Hunt submission" },
        { done: false, text: "LinkedIn launch announcement" },
        { done: false, text: "First 3 paying customers 🎉" },
      ]
    },
  ];

  const mvpScope = [
    { cat: "IN MVP ✅", color: "#63D3AA", items: ["Website chat widget", "WhatsApp integration", "Facebook Messenger", "PDF + URL knowledge ingestion", "Lead capture + basic CRM", "Appointment booking", "Email send/receive", "Multilingual support", "Multi-tenant architecture", "Business dashboard", "Stripe billing"] },
    { cat: "POST-MVP (v2) 🔜", color: "#A29BFE", items: ["Instagram DM", "Shopify deep integration", "YouTube video ingestion", "Voice support (Whisper)", "A/B testing responses", "White-label offering", "Mobile app for businesses", "Advanced analytics", "AI training on corrections", "Salesforce / HubSpot CRM sync"] },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <H2>MVP Roadmap & Scope</H2>
        <P>12-week build timeline. What's in MVP vs what comes after. Ruthlessly scoped for fast launch.</P>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {milestones.map(m => (
          <Card key={m.week}>
            <Badge color={m.color}>{m.week}</Badge>
            <H3 color={m.color} style={{ marginTop: 10 }}>{m.title.toUpperCase()}</H3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {m.tasks.map(t => (
                <div key={t.text} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: t.done ? "#63D3AA" : "rgba(255,255,255,0.25)", fontSize: 14, marginTop: 1 }}>
                    {t.done ? "✓" : "○"}
                  </span>
                  <span style={{ color: t.done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)", fontSize: 13 }}>{t.text}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {mvpScope.map(s => (
          <Card key={s.cat} style={{ borderColor: s.color + "30" }}>
            <H3 color={s.color}>{s.cat}</H3>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {s.items.map(i => (
                <li key={i} style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.8 }}>{i}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card style={{ borderColor: "rgba(99,211,170,0.3)", background: "rgba(99,211,170,0.04)" }}>
        <H3>KEY SUCCESS METRICS — MONTH 3 TARGETS</H3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Paying customers", target: "10–20", color: "#63D3AA" },
            { label: "MRR", target: "$2,000–5,000", color: "#A29BFE" },
            { label: "Avg onboarding time", target: "< 45 min", color: "#FF9F43" },
            { label: "Agent resolution rate", target: "> 75%", color: "#FD79A8" },
            { label: "Churn rate", target: "< 10%", color: "#74B9FF" },
            { label: "NPS score", target: "> 50", color: "#FDCB6E" },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 8px" }}>
              <div style={{ color: m.color, fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 16 }}>{m.target}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  architecture: ArchSection,
  onboarding: OnboardingSection,
  dashboard: DashboardSection,
  deployment: DeploySection,
  marketing: MarketingSection,
  roadmap: RoadmapSection,
};

export default function App() {
  const [active, setActive] = useState("overview");
  const SectionComp = SECTION_COMPONENTS[active];

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Playfair+Display:wght@700;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080814",
      fontFamily: "'DM Mono', monospace",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(99,211,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,211,170,0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      <TopNav active={active} setActive={setActive} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px 60px", position: "relative", zIndex: 1 }}>
        <SectionComp />
      </div>
    </div>
  );
}
