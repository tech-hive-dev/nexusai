"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => (typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "");

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  connected: boolean;
  fields: { key: string; label: string; type: string }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Scheduling: "#6366F1",
  Notifications: "#10B981",
  Automation: "#F59E0B",
  CRM: "#EC4899",
  "E-commerce": "#3B82F6",
  Payments: "#8B5CF6",
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [modal, setModal] = useState<Integration | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState("All");

  const load = () => {
    fetch(`${API}/api/integrations/`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => setIntegrations(d.integrations || []))
      .catch(() => {});
  };
  useEffect(load, []);

  const categories = ["All", ...Array.from(new Set(integrations.map((i) => i.category)))];
  const visible = filter === "All" ? integrations : integrations.filter((i) => i.category === filter);

  const openConnect = async (integration: Integration) => {
    setModal(integration);
    setCreds({});
    if (integration.connected) {
      const r = await fetch(`${API}/api/integrations/${integration.id}/config`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await r.json();
      if (d.credentials) setCreds(d.credentials);
    }
  };

  const handleConnect = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/integrations/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ integration_id: modal.id, credentials: creds }),
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ msg: `${modal.name} connected!`, ok: true });
        setModal(null);
        load();
      } else {
        setFeedback({ msg: "Connection failed. Check your credentials.", ok: false });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`${API}/api/integrations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    load();
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 22 }}>Integrations</h2>
        <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>
          Connect your tools to supercharge your AI agent
        </p>
      </div>

      {feedback && (
        <div style={{
          background: feedback.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${feedback.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 10, padding: "12px 16px",
          color: feedback.ok ? "#10B981" : "#EF4444",
          fontSize: 14, marginBottom: 20,
        }}>
          {feedback.ok ? "✓" : "✕"} {feedback.msg}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500,
              background: filter === cat ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              border: filter === cat ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: filter === cat ? "#818CF8" : "#64748B",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {visible.map((intg) => {
          const accent = CATEGORY_COLORS[intg.category] || "#6366F1";
          return (
            <div key={intg.id} style={{
              background: "rgba(255,255,255,0.03)",
              border: intg.connected ? `1px solid ${accent}40` : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: 20,
              display: "flex", flexDirection: "column", gap: 12,
              position: "relative",
            }}>
              {intg.connected && (
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: "rgba(16,185,129,0.15)", color: "#10B981",
                  fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                }}>
                  CONNECTED
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{intg.icon}</span>
                <div>
                  <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 15 }}>{intg.name}</div>
                  <div style={{ color: accent, fontSize: 11, fontWeight: 500 }}>{intg.category}</div>
                </div>
              </div>
              <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, flex: 1, margin: 0 }}>
                {intg.description}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => openConnect(intg)}
                  style={{
                    flex: 1, padding: "8px 0",
                    background: intg.connected ? `${accent}15` : `${accent}20`,
                    border: `1px solid ${accent}40`,
                    borderRadius: 8, color: accent, fontSize: 13,
                    cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {intg.connected ? "Reconfigure" : "Connect →"}
                </button>
                {intg.connected && (
                  <button
                    onClick={() => handleDisconnect(intg.id)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8, color: "#EF4444",
                      fontSize: 12, cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 32, width: "100%", maxWidth: 460,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>{modal.icon}</span>
              <div>
                <h3 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 18, margin: 0 }}>
                  Connect {modal.name}
                </h3>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 2 }}>{modal.description}</div>
              </div>
            </div>

            {modal.fields.map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
                  {f.label}
                </label>
                <input
                  type={f.type === "password" ? "password" : "text"}
                  value={creds[f.key] || ""}
                  onChange={(e) => setCreds((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{
                    width: "100%", padding: "9px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, color: "#e8eaf0", fontSize: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  flex: 1, padding: "10px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#64748B", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={saving}
                style={{
                  flex: 2, padding: "10px",
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  border: "none", borderRadius: 8,
                  color: "#fff", fontWeight: 600, cursor: "pointer",
                }}
              >
                {saving ? "Connecting…" : "Save & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
