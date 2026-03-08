"use client";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  industry: string;
  icon: string;
  description: string;
  is_premium: boolean;
  price_cents: number;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";
  const api = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${api}/api/templates/`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []));
  }, []);

  async function deploy(id: string, name: string) {
    setDeploying(id);
    try {
      const res = await fetch(`${api}/api/templates/${id}/deploy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSuccess(data.message || `${name} applied!`);
      setTimeout(() => setSuccess(null), 4000);
    } finally {
      setDeploying(null);
    }
  }

  const INDUSTRY_COLORS: Record<string, string> = {
    restaurant:   "#F59E0B",
    medical:      "#10B981",
    ecommerce:    "#6366F1",
    real_estate:  "#3B82F6",
    salon:        "#EC4899",
    legal:        "#8B5CF6",
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 22 }}>Agent Templates</h2>
        <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>
          One-click deploy a pre-configured AI agent for your industry
        </p>
      </div>

      {success && (
        <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "12px 16px", color: "#10B981", fontSize: 14, marginBottom: 20 }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {templates.map(t => {
          const accentColor = INDUSTRY_COLORS[t.industry] || "#6366F1";
          return (
            <div key={t.id} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderTop: `3px solid ${accentColor}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{t.icon}</span>
                <div>
                  <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  {t.is_premium && (
                    <span style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>PRO</span>
                  )}
                </div>
              </div>
              <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, flex: 1 }}>{t.description}</p>
              <button
                onClick={() => deploy(t.id, t.name)}
                disabled={deploying === t.id}
                style={{
                  padding: "9px 0",
                  background: deploying === t.id ? "rgba(99,102,241,0.1)" : `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  borderRadius: 8,
                  color: accentColor,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deploying === t.id ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {deploying === t.id ? "Deploying…" : "Deploy Template →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
