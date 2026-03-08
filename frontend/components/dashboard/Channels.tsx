"use client";
export default function Channels() {
  const channels = [
    { name: "Website Chat Widget", icon: "💬", status: "active", desc: "Copy embed code from the Embed Code tab", color: "#4FFFB0" },
    { name: "WhatsApp Business", icon: "🟢", status: "setup", desc: "Add WHATSAPP_TOKEN to your .env file", color: "#25D366" },
    { name: "Facebook Messenger", icon: "🔵", status: "setup", desc: "Add FACEBOOK_APP_ID and token to .env", color: "#1877F2" },
    { name: "Instagram DM", icon: "📷", status: "coming", desc: "Via Facebook API — coming in v1.1", color: "#E1306C" },
    { name: "Email (Gmail/Outlook)", icon: "📧", status: "setup", desc: "Add SENDGRID_API_KEY to enable email", color: "#EA4335" },
    { name: "REST API", icon: "🔑", status: "active", desc: "Use /api/chat/message endpoint directly", color: "#C084FC" },
  ];
  const statusColor: any = { active: "#4FFFB0", setup: "#FFD166", coming: "rgba(255,255,255,0.3)" };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Channels</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Connect your agent to messaging platforms.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {channels.map(ch => (
          <div key={ch.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${ch.color}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{ch.icon}</span>
              <div>
                <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 14 }}>{ch.name}</div>
                <span style={{ background: (statusColor[ch.status]||"#888")+"20", color: statusColor[ch.status]||"#888", padding: "1px 7px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>{ch.status.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>{ch.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
