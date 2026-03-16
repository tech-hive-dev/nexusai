// Templates.tsx — with delete, custom template, and AI recommendation
"use client";
import { useEffect, useState } from "react";

interface Template {
  id: string; name: string; industry: string; icon: string;
  description: string; is_premium: boolean; price_cents: number;
  recommended?: boolean; is_custom?: boolean;
}
interface CustomForm { name: string; industry: string; description: string; icon: string; }

const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => (typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "");

const INDUSTRY_COLORS: Record<string, string> = {
  restaurant: "#F59E0B", medical: "#10B981", ecommerce: "#6366F1",
  real_estate: "#3B82F6", salon: "#EC4899", legal: "#8B5CF6",
  custom: "#4FFFB0", other: "#64748B",
};

const ICONS = ["💼", "🍽️", "🏥", "🛒", "🏠", "💇", "⚖️", "🎓", "🏋️", "🔧", "💻", "🌿"];

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomForm>({ name: "", industry: "custom", description: "", icon: "💼" });

  const load = () =>
    fetch(`${API}/api/templates/`).then(r => r.json()).then(d => setTemplates(d.templates || []));

  // Load templates + fetch AI recommendation
  useEffect(() => {
    load();
    fetch(`${API}/api/templates/recommend`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.recommended_id) setRecommendedId(d.recommended_id); })
      .catch(() => { });
  }, []);

  const deploy = async (id: string, name: string) => {
    setDeploying(id);
    try {
      const res = await fetch(`${API}/api/templates/${id}/deploy`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setSuccess(data.message || `${name} applied!`);
      setTimeout(() => setSuccess(null), 5000);
    } finally { setDeploying(null); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/api/templates/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } finally { setDeleting(null); }
  };

  const createCustom = async () => {
    if (!form.name) return;
    const res = await fetch(`${API}/api/templates/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, is_premium: false, price_cents: 0 }),
    });
    const data = await res.json();
    if (data.id) { await load(); setShowCustom(false); setForm({ name: "", industry: "custom", description: "", icon: "💼" }); }
  };

  // Sort: recommended first
  const sorted = [...templates].sort((a, b) => {
    if (a.id === recommendedId) return -1;
    if (b.id === recommendedId) return 1;
    return 0;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 22 }}>Agent Templates</h2>
          <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>One-click deploy a pre-configured AI agent for your industry</p>
        </div>
        <button onClick={() => setShowCustom(!showCustom)} style={{ background: "rgba(79,255,176,0.1)", border: "1px solid rgba(79,255,176,0.3)", color: "#4FFFB0", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          + Build Custom
        </button>
      </div>

      {success && (
        <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "12px 16px", color: "#10B981", fontSize: 14, marginBottom: 20 }}>
          ✓ {success}
        </div>
      )}

      {/* Custom template form */}
      {showCustom && (
        <div style={{ background: "rgba(79,255,176,0.04)", border: "1px solid rgba(79,255,176,0.2)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ color: "#4FFFB0", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🛠 Build Custom Template</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { k: "name", label: "Template Name", ph: "e.g. My Business Agent" },
              { k: "industry", label: "Industry", ph: "e.g. fitness, consulting" },
            ].map(f => (
              <div key={f.k}>
                <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 5 }}>{f.label.toUpperCase()}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, outline: "none" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 5 }}>DESCRIPTION</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this agent should do..."
              rows={2} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 8 }}>ICON</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                  style={{ fontSize: 20, padding: "4px 8px", borderRadius: 6, border: form.icon === ic ? "2px solid #4FFFB0" : "1px solid rgba(255,255,255,0.1)", background: form.icon === ic ? "rgba(79,255,176,0.1)" : "transparent", cursor: "pointer" }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={createCustom} disabled={!form.name}
              style={{ background: "#4FFFB0", border: "none", color: "#000", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              Create Template →
            </button>
            <button onClick={() => setShowCustom(false)}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {sorted.map(t => {
          const accentColor = INDUSTRY_COLORS[t.industry] || "#6366F1";
          const isRecommended = t.id === recommendedId;
          return (
            <div key={t.id} style={{ background: "rgba(255,255,255,0.03)", border: isRecommended ? `1px solid ${accentColor}60` : "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${accentColor}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
              {/* Recommended badge */}
              {isRecommended && (
                <div style={{ position: "absolute", top: -1, right: 12, background: accentColor, color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: "0 0 8px 8px", fontFamily: "monospace" }}>
                  ✨ RECOMMENDED FOR YOU
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  {t.is_premium && <span style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>PRO</span>}
                  {t.is_custom && <span style={{ background: "rgba(79,255,176,0.1)", color: "#4FFFB0", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>CUSTOM</span>}
                </div>
                {/* Delete button for custom templates or any template */}
                <button onClick={() => deleteTemplate(t.id)} disabled={deleting === t.id}
                  style={{ background: "none", border: "none", color: "rgba(255,94,94,0.5)", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}
                  title="Delete template">
                  {deleting === t.id ? "..." : "🗑"}
                </button>
              </div>
              <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, flex: 1 }}>{t.description}</p>
              <button onClick={() => deploy(t.id, t.name)} disabled={deploying === t.id}
                style={{ padding: "9px 0", background: deploying === t.id ? "rgba(99,102,241,0.1)" : `${accentColor}20`, border: `1px solid ${accentColor}40`, borderRadius: 8, color: accentColor, fontSize: 13, fontWeight: 600, cursor: deploying === t.id ? "not-allowed" : "pointer" }}>
                {deploying === t.id ? "Deploying…" : "Deploy Template →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
