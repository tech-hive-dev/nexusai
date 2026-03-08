const INTEGRATIONS = [
  { name: "WhatsApp", icon: "💬", color: "#25D366", desc: "Send & receive messages" },
  { name: "Facebook", icon: "📘", color: "#1877F2", desc: "Messenger + Page posts" },
  { name: "Instagram", icon: "📷", color: "#E1306C", desc: "DM automation" },
  { name: "Shopify", icon: "🛒", color: "#96BF48", desc: "Orders + inventory" },
  { name: "WooCommerce", icon: "🔌", color: "#7F54B3", desc: "Cart recovery" },
  { name: "WordPress", icon: "🌐", color: "#21759B", desc: "Plugin install" },
  { name: "Gmail", icon: "📧", color: "#EA4335", desc: "Read + send emails" },
  { name: "Outlook", icon: "📨", color: "#0078D4", desc: "Microsoft 365" },
  { name: "Stripe", icon: "💳", color: "#635BFF", desc: "Payment collection" },
  { name: "Cal.com", icon: "📅", color: "#111827", desc: "Appointment booking" },
  { name: "Slack", icon: "💼", color: "#4A154B", desc: "Team notifications" },
  { name: "Zapier", icon: "⚡", color: "#FF4A00", desc: "3,000+ app connections" },
];

export default function Integrations() {
  return (
    <section id="integrations" style={{ padding: "100px 24px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", background: "#F0FDF4", color: "#10B981",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, marginBottom: 16,
          }}>INTEGRATIONS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px", letterSpacing: -0.8 }}>
            Works With Every Tool<br />You Already Use
          </h2>
          <p style={{ fontSize: 18, color: "#64748B", maxWidth: 480, margin: "0 auto" }}>
            Connect in one click. No developers. No webhooks to configure manually.
          </p>
        </div>

        {/* Integration grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 48 }}>
          {INTEGRATIONS.map((int, i) => (
            <div key={i} style={{
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
              padding: "20px 16px", textAlign: "center", transition: "all 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = int.color + "60";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${int.color}15`;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{int.icon}</div>
              <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 14, marginBottom: 4 }}>{int.name}</div>
              <div style={{ color: "#94A3B8", fontSize: 12 }}>{int.desc}</div>
            </div>
          ))}
        </div>

        {/* Zapier note */}
        <div style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
          padding: "24px 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 16, marginBottom: 4 }}>
              ⚡ Plus 3,000+ apps via Zapier & Make
            </div>
            <div style={{ color: "#64748B", fontSize: 14 }}>
              Connect NexusAI to HubSpot, Salesforce, Notion, Airtable, Pipedrive, and thousands more without writing a single line of code.
            </div>
          </div>
          <a href="#pricing" style={{
            padding: "10px 24px", borderRadius: 8,
            background: "#6366F1", color: "#fff", fontSize: 14, fontWeight: 600,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>See All Integrations →</a>
        </div>
      </div>
    </section>
  );
}
