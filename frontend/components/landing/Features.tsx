const FEATURES = [
  {
    icon: "🧠",
    title: "Learns From Your Data",
    desc: "Feed it your website, PDFs, product catalog, YouTube videos, and FAQs. Gets smarter with every conversation.",
    color: "#6366F1",
  },
  {
    icon: "🌍",
    title: "50+ Languages, Mid-Chat",
    desc: "Automatically detects language switches mid-conversation. Arabic, Spanish, French, Urdu — no config needed.",
    color: "#10B981",
  },
  {
    icon: "📅",
    title: "Books Appointments",
    desc: "Integrates with Cal.com and Google Calendar. Checks availability and confirms bookings autonomously.",
    color: "#F59E0B",
  },
  {
    icon: "🛒",
    title: "Recovers Abandoned Carts",
    desc: "Detects Shopify/WooCommerce cart abandonment and sends personalized WhatsApp recovery messages within 15 minutes.",
    color: "#EF4444",
  },
  {
    icon: "💳",
    title: "Collects Payments in Chat",
    desc: "Sends Stripe payment links inside the conversation. Customer pays without leaving WhatsApp or your website.",
    color: "#8B5CF6",
  },
  {
    icon: "📊",
    title: "Real-Time Analytics",
    desc: "Conversation stats, lead counts, resolution rates, revenue attributed, CSAT scores — all live in your dashboard.",
    color: "#06B6D4",
  },
  {
    icon: "🔒",
    title: "Human Takeover Anytime",
    desc: "Shadow any live conversation silently. Jump in with one tap. Hand back to AI when done. No customer notices.",
    color: "#F97316",
  },
  {
    icon: "🏢",
    title: "Every Channel, One Inbox",
    desc: "WhatsApp, website widget, Facebook, Instagram, email — all conversations in a single unified dashboard.",
    color: "#EC4899",
  },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", background: "#EEF2FF", color: "#6366F1",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, marginBottom: 16,
          }}>EVERYTHING YOUR BUSINESS NEEDS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px", letterSpacing: -0.8 }}>
            One AI That Does the Work<br />of Your Entire Support Team
          </h2>
          <p style={{ fontSize: 18, color: "#64748B", maxWidth: 560, margin: "0 auto" }}>
            Not just a chatbot. A full-stack business agent that learns, sells, books, and reports — automatically.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16,
              padding: "28px 24px", transition: "all 0.2s",
              borderTop: `3px solid ${f.color}`,
              cursor: "default",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: f.color + "15", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 24, marginBottom: 16,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 10px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
