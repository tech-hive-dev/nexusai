import { useState, useEffect, useRef } from "react";

/* ─── FONTS ─────────────────────────────────────────────────────────────────── */
const FontLoader = () => {
  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap";
    l.rel = "stylesheet";
    document.head.appendChild(l);
  }, []);
  return null;
};

/* ─── DESIGN TOKENS ──────────────────────────────────────────────────────────── */
const C = {
  bg: "#05070F",
  surface: "#0B0E1A",
  surfaceHover: "#10142A",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  accent: "#4FFFB0",      // electric mint
  accentDim: "rgba(79,255,176,0.12)",
  accentBorder: "rgba(79,255,176,0.25)",
  orange: "#FF6B35",
  blue: "#4FA8FF",
  purple: "#B47FFF",
  rose: "#FF5E8A",
  yellow: "#FFD166",
  text: "#E8EAF0",
  muted: "rgba(232,234,240,0.45)",
  faint: "rgba(232,234,240,0.2)",
};

/* ─── FEATURE DATA ───────────────────────────────────────────────────────────── */
const FEATURE_CATEGORIES = [
  {
    id: "revenue",
    label: "Revenue Intelligence",
    icon: "◈",
    color: C.accent,
    tagline: "Turn every conversation into money",
    features: [
      {
        title: "AI Upsell Engine",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$$",
        desc: "During any conversation, the agent detects buying intent signals and automatically suggests upgrades, bundles, or add-ons. 'You ordered a coffee machine — want the premium descaler kit?' Plugs into product catalog in real time.",
        why: "Upselling is where the real margin is. Businesses will pay a premium tier just for this feature alone.",
        tech: ["Shopify product API", "Claude intent classification", "Configurable upsell rules per SKU"],
      },
      {
        title: "Abandoned Cart Recovery",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$$$",
        desc: "Agent detects cart abandonment via Shopify/WooCommerce webhooks and proactively reaches out via WhatsApp or email within 15 minutes. Personalized message with the exact items left behind. Offer a 10% discount if configured.",
        why: "Average 70% of e-commerce carts are abandoned. Recovering even 10% is massive ROI for the business — they'll pay for NexusAI just for this.",
        tech: ["Shopify webhook: cart/update", "WhatsApp proactive messaging", "Configurable delay + discount rules"],
      },
      {
        title: "Payment Collection in Chat",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "Agent can generate and send a payment link (Stripe) directly inside the chat conversation. Customer pays without leaving WhatsApp or the website widget. Agent confirms, issues receipt, and updates order status.",
        why: "Reduces friction from conversation to purchase. Clinics can collect deposits for appointments. Restaurants can take pre-orders with payment.",
        tech: ["Stripe Payment Links API", "In-chat payment button", "Webhook confirmation → order update"],
      },
      {
        title: "Smart Follow-Up Sequences",
        impact: "MED",
        effort: "LOW",
        revenue: "+$$",
        desc: "After a conversation ends without purchase, the agent schedules a follow-up sequence: WhatsApp message on Day 1, email on Day 3, final offer on Day 7. Fully automated. Business sets the cadence and message tone.",
        why: "Most sales happen on follow-up #5. No business owner remembers to follow up. This is automated sales staff.",
        tech: ["Redis-based job queue (BullMQ)", "Multi-channel follow-up scheduler", "Conversion tracking per sequence"],
      },
    ],
  },
  {
    id: "intelligence",
    label: "Agent Intelligence",
    icon: "⬡",
    color: C.blue,
    tagline: "The smartest agent your competitors don't have",
    features: [
      {
        title: "Sentiment & Mood Detection",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$$",
        desc: "Analyzes every message for frustration, urgency, anger, or delight. Adjusts tone in real time. Frustrated customer? Agent becomes warmer, apologetic. Happy customer? Lean into the upsell. Angry customer? Immediately flags for human escalation with a 'calm down' holding message.",
        why: "Prevents the nightmare scenario: a furious customer getting a chipper AI response that goes viral. Protects brand reputation.",
        tech: ["Claude sentiment classification", "Dynamic tone prompt injection", "Escalation trigger rules"],
      },
      {
        title: "Visual Product Recognition",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "Customer sends a photo of a broken product and asks 'can you fix this?' or sends a screenshot of a competitor and asks 'do you have this?' Agent analyzes the image, identifies the item, finds matching products in the catalog, and responds with options.",
        why: "This is the killer feature for retail and repair businesses. No competitor offers this in a simple chat widget.",
        tech: ["Claude vision (multimodal)", "Product catalog image similarity", "WhatsApp/IG image message handling"],
      },
      {
        title: "Proactive Outreach Engine",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$$",
        desc: "Agent doesn't just wait — it initiates. Re-engages silent customers after X days. Sends stock alerts ('The sneakers you asked about are back!'). Birthday greetings with a discount. Appointment reminders 24h before. Service renewal nudges.",
        why: "Transforms the agent from reactive support into a full-time salesperson. This is the feature that justifies $300+/mo plans.",
        tech: ["Cron scheduler + customer event triggers", "WhatsApp Business proactive messaging", "Segment: last_seen, last_purchase, birthday"],
      },
      {
        title: "Competitor Intelligence Mode",
        impact: "MED",
        effort: "MED",
        revenue: "+$$",
        desc: "When a customer mentions a competitor ('I saw X cheaper on Amazon'), the agent is trained to handle objections gracefully — highlight unique value props, offer a price match if configured, or explain why your product is worth more. Never badmouth competitors.",
        why: "This training gap kills sales. Businesses spend marketing dollars driving traffic and then lose at the final conversation.",
        tech: ["Knowledge base: competitor comparison docs", "Intent: competitor_mention classifier", "Configurable response playbooks per competitor"],
      },
    ],
  },
  {
    id: "operations",
    label: "Business Operations",
    icon: "◉",
    color: C.orange,
    tagline: "Replace 3 employees with one AI agent",
    features: [
      {
        title: "Internal Team Assistant Mode",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "The same AI agent can serve as an internal knowledge base for staff. Employee asks 'what's our return policy on electronics?' and gets the answer from the company docs. HR FAQs, inventory check, pricing lookups — all via WhatsApp or Slack. Private channel, separate from customer-facing.",
        why: "Doubles the value per customer. They're paying for one product that replaces both customer support AND internal knowledge management.",
        tech: ["Separate agent context: internal vs customer", "Slack API integration", "Role-based access: staff vs public"],
      },
      {
        title: "Auto-Generated Reports",
        impact: "MED",
        effort: "LOW",
        revenue: "+$",
        desc: "Every Monday morning, the business owner receives a WhatsApp message or email from the agent: 'Here's your weekly summary. 312 conversations, 47 leads, 12 appointments booked, 3 unresolved tickets needing your attention. Top question this week: delivery times.' No login required.",
        why: "Most business owners never log into dashboards. Pushing insights to WhatsApp makes the product indispensable.",
        tech: ["Cron: weekly report generation", "Claude: natural language summary", "WhatsApp + Email delivery"],
      },
      {
        title: "Smart Ticket Triage",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$",
        desc: "Every support request gets auto-classified by type (billing, delivery, technical, complaint, refund), priority (critical/high/medium/low), and sentiment. Agent routes to the right team member. Critical tickets get an immediate Slack/WhatsApp notification to the owner. SLA clock starts automatically.",
        why: "Prevents $10,000 complaints from sitting in a general inbox. Every business has had this nightmare.",
        tech: ["Claude: multi-label classification", "Slack webhook notifications", "Configurable SLA rules per category"],
      },
      {
        title: "Inventory-Aware Responses",
        impact: "MED",
        effort: "LOW",
        revenue: "+$",
        desc: "Agent checks live inventory before confirming availability. 'Do you have blue size 9?' → agent queries Shopify API in real time → 'Yes! Only 2 left. Want me to reserve one?' Creates urgency without lying. When out of stock, suggests alternatives or waitlist.",
        why: "Eliminates a massive embarrassment: agent confirms available product, customer pays, then gets an apology email. This destroys trust.",
        tech: ["Shopify/WooCommerce inventory API", "Real-time availability check tool", "Waitlist capture → notify when back"],
      },
    ],
  },
  {
    id: "experience",
    label: "Customer Experience",
    icon: "◎",
    color: C.purple,
    tagline: "Experiences that customers remember and share",
    features: [
      {
        title: "Voice Message Support",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "Customer sends a WhatsApp voice note instead of typing. Agent transcribes it (Whisper API), understands intent, and responds via text (with option to respond via voice too). Critical for markets like Pakistan, UAE, Africa where voice messaging is dominant.",
        why: "Huge differentiator in Middle East, South Asia, Africa markets. No competitor in the SMB space handles this well.",
        tech: ["Whisper API (speech-to-text)", "WhatsApp voice note download", "Option: ElevenLabs TTS for voice replies"],
      },
      {
        title: "Personalized Memory Profiles",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "Agent builds a persistent profile for each returning customer: preferences, past orders, family details they've mentioned, communication style, language preference. 'Welcome back Ahmed! Your usual order of [X]?' Customer feels known, not just served.",
        why: "This is why people love their local shopkeeper. We're recreating that warmth at scale. Businesses with high repeat customers (salons, clinics, restaurants) will love this.",
        tech: ["Customer profile table: preferences, history, notes", "Memory injection on conversation start", "Claude: extract + update profile from conversation"],
      },
      {
        title: "Interactive Product Demos in Chat",
        impact: "MED",
        effort: "MED",
        revenue: "+$$",
        desc: "Agent can send rich cards inside the chat: product image + price + 'Add to Cart' button, image carousels of a property, before/after photos of a service. Not just text answers — visual selling. Works in website widget and WhatsApp.",
        why: "The gap between 'interested' and 'purchased' is often just seeing the product properly. Agent closes that gap without a human.",
        tech: ["WhatsApp interactive messages (list, buttons, media)", "Website widget rich card components", "Dynamic card builder from product catalog"],
      },
      {
        title: "CSAT & Review Automation",
        impact: "MED",
        effort: "LOW",
        revenue: "+$",
        desc: "After every resolved conversation, agent sends a one-tap satisfaction rating. Happy customers (4-5 stars) are prompted with a Google Review link. Unhappy customers trigger an internal alert — caught before they go public. Monthly NPS calculated automatically.",
        why: "Google reviews are currency. Automating the happy path to reviews while intercepting negative ones is an incredible ROI for local businesses.",
        tech: ["Post-conversation webhook trigger", "Conditional Google review link", "NPS scoring in dashboard"],
      },
    ],
  },
  {
    id: "platform",
    label: "Platform & Growth",
    icon: "◆",
    color: C.rose,
    tagline: "Features that make YOU more money as the platform owner",
    features: [
      {
        title: "White-Label Reseller Program",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$$$",
        desc: "Digital marketing agencies can buy NexusAI at wholesale ($49/agent/mo) and resell to their clients at $200-500/mo under their own brand. They get a reseller dashboard to manage all their clients' agents. You get MRR without doing sales.",
        why: "Agencies have existing client relationships. One agency with 20 clients = $1,000/mo for you passively. 10 agencies = $10k/mo from the agency channel alone.",
        tech: ["Reseller tier in DB: agency owns sub-tenants", "White-label: custom logo + domain", "Reseller dashboard: manage all clients"],
      },
      {
        title: "AI Agent Marketplace",
        impact: "HIGH",
        effort: "HIGH",
        revenue: "+$$$",
        desc: "Pre-trained agent templates for specific industries: 'Restaurant Agent', 'Medical Clinic Agent', 'Real Estate Agent', 'Salon Agent'. Each comes pre-loaded with industry-specific intents, responses, and integrations. Business is live in 5 minutes, not 30.",
        why: "Reduces onboarding time to near-zero. Also creates a new revenue stream: premium templates at $50-200 one-time fee. Community can contribute templates.",
        tech: ["Template system: packaged knowledge + config", "Template marketplace UI", "One-click deploy from template"],
      },
      {
        title: "Usage-Based Billing Upsells",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$$",
        desc: "When a business is about to hit their conversation limit, the agent sends the owner a proactive warning: 'You've used 90% of your 2,000 conversations this month. Upgrade to Business plan for unlimited, or add a 500-conversation pack for $19.' In-app and via WhatsApp.",
        why: "Removes the brutal experience of service stopping mid-month. Creates natural upsell moments with urgency. Reduces churn from accidental limit-hitting.",
        tech: ["Usage counter per tenant", "Threshold webhooks at 80%, 95%, 100%", "In-app upgrade modal + WhatsApp alert"],
      },
      {
        title: "Integration App Store",
        impact: "MED",
        effort: "HIGH",
        revenue: "+$$",
        desc: "A curated one-click integrations store within the dashboard: connect Google Calendar, Calendly, Zoho CRM, Pipedrive, Notion, Trello, Airtable, Twilio, and more. Each integration is a paid add-on ($10-29/mo) or included in higher tiers.",
        why: "Every integration is a moat. The more systems NexusAI connects to, the harder it is to switch. Also generates incremental revenue per add-on.",
        tech: ["OAuth2 connection manager", "Integration SDK for third-party devs", "Webhook + REST connector framework"],
      },
    ],
  },
  {
    id: "trust",
    label: "Trust & Compliance",
    icon: "◐",
    color: C.yellow,
    tagline: "Enterprise features that unlock bigger contracts",
    features: [
      {
        title: "Human-in-the-Loop Takeover",
        impact: "HIGH",
        effort: "MED",
        revenue: "+$$",
        desc: "Business owner or support agent can 'shadow' any live conversation in real time from the dashboard. They can silently read along, or tap 'Take Over' to jump in as a human. When done, they hand back to AI. Customer sees seamless transition. Agent learns from the human's responses.",
        why: "This is the #1 fear businesses have about AI agents: 'what if it says something wrong to a VIP customer?' Human takeover solves this completely.",
        tech: ["WebSocket: real-time conversation streaming to dashboard", "Takeover flag in conversation state", "Claude learns from human override responses"],
      },
      {
        title: "GDPR / Data Residency Controls",
        impact: "MED",
        effort: "MED",
        revenue: "+$$",
        desc: "Customers in EU get EU-hosted data. Each tenant can see exactly what data is stored about their customers, export it, or delete it. Auto-purge policies (e.g. delete conversations older than 90 days). PII detection warns before sensitive data is stored.",
        why: "Unlocks EU and enterprise customers who have compliance requirements. Also protects you legally as the platform owner.",
        tech: ["Tenant-level data region config", "PII classifier on inbound messages", "Auto-purge cron + export API (CSV/JSON)"],
      },
      {
        title: "Brand Voice Guardrails",
        impact: "HIGH",
        effort: "LOW",
        revenue: "+$",
        desc: "Business defines topics the agent must NEVER discuss (competitors, pricing they haven't approved, political topics). Hard-coded guardrails that override any user prompt. 'Never mention we're using AI' option. 'Always refer to premium plan as Premier Experience' — custom vocabulary.",
        why: "Big businesses have legal and brand teams. This is the feature that closes enterprise deals. Gives the agent a professional, controlled persona.",
        tech: ["Pre-response guardrail classifier", "Blocked topics list per tenant", "Custom vocabulary replacement rules"],
      },
      {
        title: "Conversation Audit Trail",
        impact: "MED",
        effort: "LOW",
        revenue: "+$",
        desc: "Every conversation is stored with timestamps, channel, language, intent classifications, agent decisions, and any human overrides. Fully searchable. Exportable for legal or quality review. Business can annotate any exchange as 'training example' or 'policy violation'.",
        why: "When a customer complains 'your agent told me X', the business needs proof of exactly what was said. This prevents expensive disputes.",
        tech: ["Immutable conversation log (append-only)", "Full-text search with pgvector + pg_trgm", "Export to PDF for legal use"],
      },
    ],
  },
];

/* ─── COMPONENTS ─────────────────────────────────────────────────────────────── */

function ImpactBadge({ level }) {
  const map = { HIGH: [C.accent, "HIGH IMPACT"], MED: [C.yellow, "MED IMPACT"], LOW: [C.muted, "LOW IMPACT"] };
  const [color, label] = map[level] || [C.muted, level];
  return (
    <span style={{
      background: color + "15", border: `1px solid ${color}35`,
      color, fontSize: 9, padding: "2px 7px", borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
    }}>{label}</span>
  );
}

function EffortBadge({ level }) {
  const map = { HIGH: [C.rose, "HARD BUILD"], MED: [C.orange, "MED BUILD"], LOW: [C.blue, "QUICK WIN"] };
  const [color, label] = map[level] || [C.muted, level];
  return (
    <span style={{
      background: color + "15", border: `1px solid ${color}35`,
      color, fontSize: 9, padding: "2px 7px", borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
    }}>{label}</span>
  );
}

function RevBadge({ val }) {
  return (
    <span style={{
      background: C.accent + "15", border: `1px solid ${C.accent}30`,
      color: C.accent, fontSize: 10, padding: "2px 8px", borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
    }}>{val}</span>
  );
}

function FeatureCard({ feature, color, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: open ? C.surfaceHover : C.surface,
        border: `1px solid ${open ? color + "40" : C.border}`,
        borderRadius: 12, padding: "20px 24px",
        cursor: "pointer", transition: "all 0.2s",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          minWidth: 32, height: 32, borderRadius: 8,
          background: color + "20", border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13,
        }}>{String(index + 1).padStart(2, "0")}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ color: C.text, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>{feature.title}</span>
            <ImpactBadge level={feature.impact} />
            <EffortBadge level={feature.effort} />
            <RevBadge val={feature.revenue} />
          </div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            {open ? feature.desc : feature.desc.slice(0, 120) + "..."}
          </p>
        </div>
        <div style={{ color: C.faint, fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>+</div>
      </div>

      {open && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: C.accent, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 8 }}>WHY THIS MATTERS</div>
              <p style={{ color: C.text, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{feature.why}</p>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 10 }}>TECH IMPLEMENTATION</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {feature.tech.map(t => (
                  <div key={t} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: color, marginTop: 2 }}>›</span>
                    <span style={{ color: "rgba(232,234,240,0.6)", fontSize: 12, lineHeight: 1.5 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrioritizationMatrix() {
  const items = [
    { title: "Abandoned Cart Recovery", impact: 9, effort: 2, revenue: 9, color: C.accent },
    { title: "AI Upsell Engine", impact: 9, effort: 5, revenue: 10, color: C.accent },
    { title: "Sentiment Detection", impact: 8, effort: 2, revenue: 6, color: C.blue },
    { title: "Weekly Auto-Reports", impact: 7, effort: 2, revenue: 5, color: C.orange },
    { title: "Voice Message Support", impact: 9, effort: 6, revenue: 8, color: C.purple },
    { title: "Human Takeover", impact: 9, effort: 5, revenue: 7, color: C.yellow },
    { title: "White-Label Reseller", impact: 10, effort: 3, revenue: 10, color: C.rose },
    { title: "Inventory-Aware Agent", impact: 7, effort: 3, revenue: 6, color: C.orange },
    { title: "Customer Memory Profiles", impact: 8, effort: 4, revenue: 7, color: C.purple },
    { title: "CSAT + Review Automation", impact: 7, effort: 2, revenue: 5, color: C.blue },
    { title: "Payment in Chat", impact: 8, effort: 5, revenue: 9, color: C.accent },
    { title: "Industry Templates", impact: 9, effort: 7, revenue: 9, color: C.rose },
  ];

  const sorted = [...items].sort((a, b) => (b.impact + b.revenue - b.effort * 0.5) - (a.impact + a.revenue - a.effort * 0.5));

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 6 }}>PRIORITY RANKING</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 22, fontWeight: 800, margin: 0 }}>
          Build Order — Highest ROI First
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((item, i) => {
          const score = Math.round(item.impact + item.revenue - item.effort * 0.5);
          const pct = (score / 18) * 100;
          return (
            <div key={item.title} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
            }}>
              <div style={{
                minWidth: 28, height: 28, borderRadius: 6,
                background: i < 3 ? C.accent + "20" : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: i < 3 ? C.accent : C.muted,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12,
              }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600, marginBottom: 5 }}>{item.title}</div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 2, transition: "width 1s" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>I:{item.impact}</span>
                <span style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>R:{item.revenue}</span>
                <span style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>E:{item.effort}</span>
                <span style={{
                  background: i < 3 ? C.accent + "20" : "rgba(255,255,255,0.05)",
                  color: i < 3 ? C.accent : C.muted,
                  border: `1px solid ${i < 3 ? C.accent + "40" : C.border}`,
                  borderRadius: 5, padding: "2px 8px", fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                }}>{score}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 12, padding: "10px 16px", background: C.accentDim,
        border: `1px solid ${C.accentBorder}`, borderRadius: 10,
      }}>
        <span style={{ color: C.accent, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          Score = Impact + Revenue − (Effort × 0.5). Build top 3 first: they pay for the rest.
        </span>
      </div>
    </div>
  );
}

function MonetizationAddons() {
  const addons = [
    { name: "Voice Reply Upgrade", price: "+$49/mo", desc: "Agent responds with human-like voice using ElevenLabs", color: C.purple },
    { name: "Extra AI Agents", price: "+$79/agent", desc: "Add specialized agents (sales, support, internal) per business", color: C.accent },
    { name: "Conversation Pack", price: "+$19/500 convos", desc: "Top-up when monthly limit is reached", color: C.orange },
    { name: "White-Label License", price: "+$149/mo", desc: "Remove NexusAI branding, use their own domain & logo", color: C.rose },
    { name: "Priority Support SLA", price: "+$99/mo", desc: "24h SLA, dedicated Slack channel, quarterly review call", color: C.blue },
    { name: "Data Export API", price: "+$39/mo", desc: "Full API access to all conversations, leads, analytics", color: C.yellow },
    { name: "Custom Integrations", price: "$500–2000 one-time", desc: "We build custom integrations to their existing systems", color: C.accent },
    { name: "Industry Template Pack", price: "$99 one-time", desc: "Pre-trained agent for their vertical (restaurant, clinic, etc.)", color: C.purple },
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 6 }}>MONETIZATION</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 22, fontWeight: 800, margin: 0 }}>
          Add-Ons & Upsell Revenue Streams
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {addons.map(a => (
          <div key={a.name} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "16px 18px",
            borderTop: `2px solid ${a.color}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ color: C.text, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>{a.name}</span>
              <span style={{ color: a.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, whiteSpace: "nowrap", marginLeft: 8 }}>{a.price}</span>
            </div>
            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{a.desc}</p>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 16, background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "20px 24px",
      }}>
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 16 }}>REALISTIC REVENUE PROJECTION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { period: "Month 1", customers: "3", mrr: "$741", note: "3 × Starter avg" },
            { period: "Month 2", customers: "8", mrr: "$2,176", note: "Mix of tiers + 2 add-ons" },
            { period: "Month 3", customers: "18", mrr: "$5,400", note: "Incl. 2 agency resellers" },
            { period: "Month 6", customers: "45+", mrr: "$14,000+", note: "Upsells, add-ons, resellers" },
          ].map(r => (
            <div key={r.period} style={{ textAlign: "center", background: C.bg, borderRadius: 10, padding: "16px 12px" }}>
              <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{r.period}</div>
              <div style={{ color: C.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>{r.mrr}</div>
              <div style={{ color: C.faint, fontSize: 10, marginTop: 4 }}>{r.customers} customers</div>
              <div style={{ color: C.faint, fontSize: 10 }}>{r.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorMoat() {
  const comparisons = [
    { feature: "Multilingual mid-chat", nexus: true, intercom: false, tidio: false, manychat: false },
    { feature: "Voice message understanding", nexus: true, intercom: false, tidio: false, manychat: false },
    { feature: "Learns from YOUR data (RAG)", nexus: true, intercom: "partial", tidio: false, manychat: false },
    { feature: "Abandoned cart recovery", nexus: true, intercom: false, tidio: true, manychat: true },
    { feature: "Payment collection in chat", nexus: true, intercom: false, tidio: false, manychat: true },
    { feature: "Proactive outreach engine", nexus: true, intercom: true, tidio: false, manychat: true },
    { feature: "Visual product recognition", nexus: true, intercom: false, tidio: false, manychat: false },
    { feature: "Internal staff assistant", nexus: true, intercom: false, tidio: false, manychat: false },
    { feature: "Human takeover + AI learning", nexus: true, intercom: true, tidio: true, manychat: false },
    { feature: "White-label for agencies", nexus: true, intercom: false, tidio: true, manychat: true },
    { feature: "SMB-friendly pricing (<$100)", nexus: true, intercom: false, tidio: true, manychat: true },
    { feature: "30-min self-serve setup", nexus: true, intercom: false, tidio: true, manychat: true },
  ];

  const Cell = ({ val }) => (
    <td style={{ padding: "10px 16px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
      {val === true && <span style={{ color: C.accent, fontSize: 16 }}>✓</span>}
      {val === false && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 14 }}>—</span>}
      {val === "partial" && <span style={{ color: C.yellow, fontSize: 12 }}>~</span>}
    </td>
  );

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 6 }}>COMPETITIVE POSITIONING</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 22, fontWeight: 800, margin: 0 }}>
          Your Moat vs The Market
        </h2>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: "14px 16px", textAlign: "left", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1 }}>FEATURE</th>
              <th style={{ padding: "14px 16px", textAlign: "center", color: C.accent, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800 }}>NexusAI ◆</th>
              <th style={{ padding: "14px 16px", textAlign: "center", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Intercom</th>
              <th style={{ padding: "14px 16px", textAlign: "center", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Tidio</th>
              <th style={{ padding: "14px 16px", textAlign: "center", color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>ManyChat</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, i) => (
              <tr key={row.feature} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                <td style={{ padding: "10px 16px", color: C.text, fontSize: 13, borderBottom: `1px solid ${C.border}` }}>{row.feature}</td>
                <Cell val={row.nexus} />
                <Cell val={row.intercom} />
                <Cell val={row.tidio} />
                <Cell val={row.manychat} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [activeCategory, setActiveCategory] = useState("revenue");
  const [activeView, setActiveView] = useState("features"); // features | matrix | monetization | moat

  const cat = FEATURE_CATEGORIES.find(c => c.id === activeCategory);

  const totalFeatures = FEATURE_CATEGORIES.reduce((s, c) => s + c.features.length, 0);
  const highImpact = FEATURE_CATEGORIES.flatMap(c => c.features).filter(f => f.impact === "HIGH").length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'JetBrains Mono', monospace" }}>
      <FontLoader />

      {/* BG grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(79,255,176,0.04) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(79,160,255,0.04) 0%, transparent 50%),
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
      }} />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(5,7,15,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 32px", height: 52,
        gap: 24,
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: -0.5 }}>
          NEXUS<span style={{ color: C.accent }}>AI</span>
          <span style={{ color: C.faint, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, marginLeft: 10 }}>ENHANCEMENT SPEC</span>
        </div>

        <div style={{ flex: 1 }} />

        {[
          { id: "features", label: "24 NEW FEATURES" },
          { id: "matrix", label: "PRIORITY MATRIX" },
          { id: "monetization", label: "MONETIZATION" },
          { id: "moat", label: "COMPETITIVE MOAT" },
        ].map(v => (
          <button key={v.id} onClick={() => setActiveView(v.id)} style={{
            background: activeView === v.id ? C.accentDim : "transparent",
            border: `1px solid ${activeView === v.id ? C.accentBorder : "transparent"}`,
            color: activeView === v.id ? C.accent : C.muted,
            padding: "5px 14px", borderRadius: 6, cursor: "pointer",
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
            transition: "all 0.15s",
          }}>{v.label}</button>
        ))}

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 10 }}>{highImpact}/{totalFeatures} HIGH IMPACT</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 24px 60px", position: "relative", zIndex: 1 }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "40px 0 48px" }}>
          <div style={{
            display: "inline-block", background: C.accentDim, border: `1px solid ${C.accentBorder}`,
            color: C.accent, borderRadius: 20, padding: "4px 16px", fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, marginBottom: 20,
          }}>24 FEATURES TO MAKE NEXUSAI UNBEATABLE</div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", color: C.text, fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px",
            letterSpacing: -1,
          }}>
            What Separates a<br />
            <span style={{ color: C.accent }}>$97/mo Tool</span> from a<br />
            <span style={{ color: C.orange }}>$50k ARR Business</span>
          </h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, maxWidth: 580, margin: "0 auto" }}>
            24 high-impact additions grouped by what they solve — revenue, intelligence, operations, experience, platform growth, and trust. Each feature includes build complexity and revenue potential.
          </p>
        </div>

        {activeView === "features" && (
          <div>
            {/* Category tabs */}
            <div style={{
              display: "flex", gap: 8, marginBottom: 32, overflowX: "auto",
              paddingBottom: 4,
            }}>
              {FEATURE_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                  background: activeCategory === cat.id ? cat.color + "18" : C.surface,
                  border: `1px solid ${activeCategory === cat.id ? cat.color + "50" : C.border}`,
                  color: activeCategory === cat.id ? cat.color : C.muted,
                  padding: "10px 18px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap",
                  fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
                  transition: "all 0.15s",
                }}>
                  <span style={{ marginRight: 6 }}>{cat.icon}</span>
                  {cat.label}
                  <span style={{
                    marginLeft: 8, background: cat.color + "25", color: cat.color,
                    borderRadius: 10, padding: "1px 6px", fontSize: 10,
                  }}>{cat.features.length}</span>
                </button>
              ))}
            </div>

            {cat && (
              <div>
                {/* Category header */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span style={{ color: cat.color, fontSize: 22 }}>{cat.icon}</span>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.text, fontSize: 24, fontWeight: 800, margin: 0 }}>{cat.label}</h2>
                  </div>
                  <p style={{ color: cat.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, margin: 0 }}>{cat.tagline}</p>
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {cat.features.map((f, i) => (
                    <FeatureCard key={f.title} feature={f} color={cat.color} index={i} />
                  ))}
                </div>

                {/* Legend */}
                <div style={{
                  marginTop: 20, padding: "12px 16px", background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 10,
                  display: "flex", gap: 24, flexWrap: "wrap",
                }}>
                  <span style={{ color: C.faint, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>LEGEND:</span>
                  <span style={{ color: C.accent, fontSize: 10 }}>HIGH IMPACT = Customer retention & revenue driver</span>
                  <span style={{ color: C.blue, fontSize: 10 }}>QUICK WIN = Build in &lt;1 week</span>
                  <span style={{ color: C.rose, fontSize: 10 }}>HARD BUILD = 2–4 week effort</span>
                  <span style={{ color: C.accent, fontSize: 10 }}>+$$$ = Direct monetization potential</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "matrix" && <PrioritizationMatrix />}
        {activeView === "monetization" && <MonetizationAddons />}
        {activeView === "moat" && <CompetitorMoat />}
      </div>
    </div>
  );
}
