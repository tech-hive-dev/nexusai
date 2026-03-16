// Channels.tsx — interactive channel configuration
"use client";
import { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

interface ChannelConfig {
  name: string; icon: string; color: string; status: "active" | "setup" | "coming";
  desc: string; action?: string;
  fields?: { key: string; label: string; placeholder: string; type?: string }[];
}

const CHANNELS: ChannelConfig[] = [
  {
    name: "Website Chat Widget", icon: "💬", color: "#4FFFB0", status: "active",
    desc: "Your AI agent is live on your website via embed code.", action: "embed",
  },
  {
    name: "WhatsApp Business", icon: "🟢", color: "#25D366", status: "setup",
    desc: "Connect WhatsApp to handle customer messages with your AI agent.",
    fields: [
      { key: "WHATSAPP_TOKEN", label: "WhatsApp API Token", placeholder: "EAAxxxxxxxxx..." },
      { key: "WHATSAPP_PHONE_ID", label: "Phone Number ID", placeholder: "1234567890" },
      { key: "WHATSAPP_VERIFY_TOKEN", label: "Webhook Verify Token", placeholder: "my_verify_token" },
    ],
  },
  {
    name: "Facebook Messenger", icon: "🔵", color: "#1877F2", status: "setup",
    desc: "Connect Facebook Messenger to your AI agent.",
    fields: [
      { key: "FACEBOOK_APP_ID", label: "Facebook App ID", placeholder: "123456789" },
      { key: "FACEBOOK_APP_SECRET", label: "App Secret", placeholder: "abc123...", type: "password" },
      { key: "FACEBOOK_PAGE_TOKEN", label: "Page Access Token", placeholder: "EAAxxxxxxxxx..." },
    ],
  },
  {
    name: "Instagram DM", icon: "📷", color: "#E1306C", status: "coming",
    desc: "Instagram DM integration coming in v1.1 — via Meta Business Suite.",
  },
  {
    name: "Email (SendGrid)", icon: "📧", color: "#EA4335", status: "setup",
    desc: "Reply to customer emails automatically with your AI agent.",
    fields: [
      { key: "SENDGRID_API_KEY", label: "SendGrid API Key", placeholder: "SG.xxxxxxxxx", type: "password" },
      { key: "FROM_EMAIL", label: "From Email Address", placeholder: "support@yourbusiness.com" },
    ],
  },
  {
    name: "REST API", icon: "🔑", color: "#C084FC", status: "active",
    desc: "Integrate programmatically using our API endpoint.", action: "api",
  },
];

const statusColor: Record<string, string> = { active: "#4FFFB0", setup: "#FFD166", coming: "rgba(255,255,255,0.3)" };

export default function Channels() {
  const [open, setOpen] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [setView, _] = useState<string>("");

  const save = async (ch: ChannelConfig) => {
    if (!ch.fields) return;
    setSaving(true);
    try {
      // Save each field as a tenant setting key
      const updates: Record<string, string> = {};
      ch.fields.forEach(f => { if (fields[f.key]) updates[f.key.toLowerCase()] = fields[f.key]; });
      await fetch(`${API}/api/tenants/settings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSaved(ch.name);
      setTimeout(() => { setSaved(null); setOpen(null); }, 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Channels</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
        Connect your AI agent to messaging platforms.
      </p>

      {saved && (
        <div style={{ background: "rgba(79,255,176,0.1)", border: "1px solid rgba(79,255,176,0.3)", borderRadius: 10, padding: "12px 16px", color: "#4FFFB0", fontSize: 13, marginBottom: 20 }}>
          ✓ {saved} configured! Redeploy Railway for env vars to take effect.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {CHANNELS.map(ch => (
          <div key={ch.name} style={{ background: "rgba(255,255,255,0.03)", border: open === ch.name ? `1px solid ${ch.color}60` : "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${ch.color}`, borderRadius: 12, padding: "18px 20px", transition: "border 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{ch.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 14 }}>{ch.name}</div>
                <span style={{ background: (statusColor[ch.status] || "#888") + "20", color: statusColor[ch.status] || "#888", padding: "1px 7px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>
                  {ch.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>{ch.desc}</div>

            {/* Action buttons */}
            {ch.status !== "coming" && (
              <>
                {ch.action === "embed" && (
                  <button
                    onClick={() => { const btn = document.querySelector('[data-view="embed"]') as HTMLElement; btn?.click(); }}
                    style={btnStyle(ch.color)}>
                    View Embed Code →
                  </button>
                )}
                {ch.action === "api" && (
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#C084FC" }}>
                    POST {API}/api/chat/message
                  </div>
                )}
                {ch.fields && (
                  <button onClick={() => setOpen(open === ch.name ? null : ch.name)} style={btnStyle(ch.color)}>
                    {open === ch.name ? "Close ✕" : "⚙ Configure"}
                  </button>
                )}
              </>
            )}
            {ch.status === "coming" && (
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, fontStyle: "italic" }}>Coming soon</div>
            )}

            {/* Config panel */}
            {open === ch.name && ch.fields && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                {ch.fields.map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 5 }}>{f.label.toUpperCase()}</label>
                    <input
                      type={f.type || "text"}
                      value={fields[f.key] || ""}
                      onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#e8eaf0", fontSize: 12, outline: "none" }}
                    />
                  </div>
                ))}
                <button onClick={() => save(ch)} disabled={saving} style={{ ...btnStyle(ch.color), width: "100%", marginTop: 4 }}>
                  {saving ? "Saving..." : "Save Configuration →"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = (color: string): React.CSSProperties => ({
  background: `${color}15`,
  border: `1px solid ${color}40`,
  color,
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  width: "100%",
});
