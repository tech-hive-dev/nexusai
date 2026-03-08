"use client";

const CHANNELS = [
  { name: "WhatsApp", color: "#25D366", icon: "💬" },
  { name: "Facebook", color: "#1877F2", icon: "📘" },
  { name: "Instagram", color: "#E1306C", icon: "📷" },
  { name: "Website Widget", color: "#6366F1", icon: "🌐" },
  { name: "Shopify", color: "#96BF48", icon: "🛒" },
  { name: "WordPress", color: "#21759B", icon: "🔷" },
  { name: "Gmail", color: "#EA4335", icon: "📧" },
  { name: "REST API", color: "#10B981", icon: "⚡" },
  { name: "WhatsApp", color: "#25D366", icon: "💬" },
  { name: "Facebook", color: "#1877F2", icon: "📘" },
  { name: "Instagram", color: "#E1306C", icon: "📷" },
  { name: "Website Widget", color: "#6366F1", icon: "🌐" },
];

export default function ChannelStrip() {
  return (
    <div style={{
      background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0",
      padding: "16px 0", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 12, width: "max-content", animation: "marquee 24s linear infinite" }}>
        {CHANNELS.map((ch, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 20px",
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)", whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 16 }}>{ch.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>{ch.name}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
