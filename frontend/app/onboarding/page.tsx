"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

const STEPS = [
  { n: 1, title: "Business Info", icon: "🏢" },
  { n: 2, title: "Add Knowledge", icon: "🧠" },
  { n: 3, title: "Configure Agent", icon: "⚙️" },
  { n: 4, title: "Go Live!", icon: "🚀" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ industry: "", agent_name: "Aria", escalation_email: "", url: "", source_name: "" });
  const [loading, setLoading] = useState(false);
  const [sourceAdded, setSourceAdded] = useState(false);
  const router = useRouter();

  const patch = async (data: any) => {
    await fetch(`${API}/api/tenants/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const addKnowledge = async () => {
    if (!form.url) return;
    setLoading(true);
    await fetch(`${API}/api/knowledge/sources`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "website", name: form.source_name || "My Website", url: form.url }),
    });
    setSourceAdded(true);
    setLoading(false);
  };

  const finish = async () => {
    await patch({ agent_name: form.agent_name, escalation_email: form.escalation_email, onboarding_completed: true });
    router.push("/dashboard");
  };

  const inp = (field: string, label: string, placeholder: string, type = "text") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 6 }}>{label.toUpperCase()}</label>
      <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder}
        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080814", padding: "40px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>
            NEXUS<span style={{ color: "#4FFFB0" }}>AI</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Get your AI agent live in under 30 minutes</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: step > s.n - 1 ? "#4FFFB0" : "rgba(255,255,255,0.1)" }} />}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: step >= s.n ? "rgba(79,255,176,0.2)" : "rgba(255,255,255,0.05)", border: `2px solid ${step >= s.n ? "#4FFFB0" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: step >= s.n ? "#4FFFB0" : "rgba(255,255,255,0.3)", fontSize: 16, flexShrink: 0 }}>
                  {step > s.n ? "✓" : s.icon}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "#4FFFB0" : "rgba(255,255,255,0.1)" }} />}
              </div>
              <div style={{ color: step === s.n ? "#4FFFB0" : "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 6, textAlign: "center", fontFamily: "monospace" }}>{s.title}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 28 }}>

          {step === 1 && (
            <div>
              <h3 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Tell us about your business</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>This helps your AI agent understand your context.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 6 }}>INDUSTRY</label>
                <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}>
                  <option value="">Select your industry...</option>
                  {["E-commerce", "Restaurant", "Healthcare / Clinic", "Real Estate", "Beauty & Salon", "Education / Coaching", "Fitness / Gym", "Legal Services", "Home Services", "Retail", "Technology", "Other"].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <button onClick={() => { patch({ industry: form.industry, onboarding_step: 2 }); setStep(2); }}
                style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8 }}>
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Add your knowledge base</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Your agent will learn from these sources. Start with your website URL.</p>
              {inp("source_name", "Source Name", "e.g. My Business Website")}
              {inp("url", "Website URL", "https://yourbusiness.com")}
              <button onClick={addKnowledge} disabled={loading || !form.url}
                style={{ width: "100%", background: sourceAdded ? "rgba(79,255,176,0.1)" : "rgba(79,255,176,0.15)", border: "1px solid rgba(79,255,176,0.3)", color: "#4FFFB0", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
                {loading ? "Adding..." : sourceAdded ? "✓ Added! Add another?" : "Add Knowledge Source"}
              </button>
              <button onClick={() => { patch({ onboarding_step: 3 }); setStep(3); }}
                style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                Continue →
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Configure your agent</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Give your agent a name and set up escalation.</p>
              {inp("agent_name", "Agent Name", "e.g. Aria, Max, Luna")}
              {inp("escalation_email", "Your Email (for urgent alerts)", "you@business.com", "email")}
              <button onClick={() => { patch({ agent_name: form.agent_name, escalation_email: form.escalation_email, onboarding_step: 4 }); setStep(4); }}
                style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                Continue →
              </button>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h3 style={{ color: "#4FFFB0", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're ready to go live!</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                Your AI agent is being trained on your knowledge sources. It will be ready to handle conversations in 5–10 minutes.
                Go to your dashboard to grab your embed code and add it to your website.
              </p>
              <button onClick={finish}
                style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 14, color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                Open My Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
