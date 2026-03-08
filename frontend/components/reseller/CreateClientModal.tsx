"use client";
import { useState } from "react";

interface Props {
  onClose: () => void;
  onCreated: (data: { slug: string; embed_script: string }) => void;
}

export default function CreateClientModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    business_name: "",
    business_email: "",
    industry: "",
    retail_price: 97,
    wholesale_price: 49,
    remove_nexusai_branding: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("reseller_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reseller/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to create client");
      }
      const data = await res.json();
      onCreated(data);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const INDUSTRIES = ["E-commerce", "Restaurant", "Medical Clinic", "Real Estate", "Salon & Beauty", "Legal", "Education", "Gym & Fitness", "Auto Dealership", "Other"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#1E293B", borderRadius: 16, padding: 32, width: "100%", maxWidth: 500, border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 20 }}>New Client</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#FCA5A5", fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: "Business Name *", key: "business_name", type: "text", placeholder: "Acme Store" },
            { label: "Business Email *", key: "business_email", type: "email", placeholder: "owner@acme.com" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
              <input
                type={type} required={label.endsWith("*")}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Industry</label>
            <select
              value={form.industry}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#1E293B", color: "#F1F5F9", fontSize: 14, outline: "none" }}
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Retail Price ($/mo)", key: "retail_price" },
              { label: "Wholesale Price ($/mo)", key: "wholesale_price" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
                <input
                  type="number" min={0}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 4, color: "#10B981", fontSize: 13, fontWeight: 600 }}>
            Your margin: ${((form.retail_price || 0) - (form.wholesale_price || 0)).toFixed(0)}/mo per client
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", cursor: "pointer", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={form.remove_nexusai_branding}
              onChange={e => setForm(f => ({ ...f, remove_nexusai_branding: e.target.checked }))}
            />
            <span style={{ color: "#94A3B8", fontSize: 14 }}>Remove NexusAI branding (white-label)</span>
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#94A3B8", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating…" : "Create Client →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
