"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

const STEPS = [
  { n: 1, title: "Business Info", icon: "🏢" },
  { n: 2, title: "AI Analysis", icon: "🤖" },
  { n: 3, title: "Configure Agent", icon: "⚙️" },
  { n: 4, title: "Go Live!", icon: "🚀" },
];

interface KnowledgeItem { title: string; content: string; approved: boolean; }

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ industry: "", agent_name: "Aria", escalation_email: "", url: "", source_name: "" });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiItems, setAiItems] = useState<KnowledgeItem[]>([]);
  const [aiDone, setAiDone] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const router = useRouter();

  const patch = async (data: any) => {
    await fetch(`${API}/api/tenants/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  // Step 2: Analyze website with AI
  const analyzeWithAI = async () => {
    if (!form.url) return;
    setAiLoading(true);
    setAiDone(false);
    try {
      const res = await fetch(`${API}/api/knowledge/auto-discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url, business_name: form.source_name }),
      });
      const data = await res.json();
      setAiItems((data.items || []).map((item: any) => ({ ...item, approved: true })));
      setAiPowered(data.ai_powered === true);
      setAiDone(true);
    } catch {
      setAiItems([
        { title: "Business Website", content: `Website: ${form.url}`, approved: true },
      ]);
      setAiDone(true);
    }
    setAiLoading(false);
  };

  // Step 2: Confirm and save approved items
  const confirmKnowledge = async () => {
    setLoading(true);
    const approved = aiItems.filter(i => i.approved);
    await fetch(`${API}/api/knowledge/auto-discover/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: form.url, business_name: form.source_name, approved_items: approved }),
    });
    await patch({ onboarding_step: 3 });
    setStep(3);
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

  const btnPrimary: React.CSSProperties = { width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8 };

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

          {/* STEP 1 — Business Info */}
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
              <button onClick={() => { patch({ industry: form.industry, onboarding_step: 2 }); setStep(2); }} style={btnPrimary}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — AI-Powered Knowledge Discovery */}
          {step === 2 && (
            <div>
              <h3 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                🤖 AI Knowledge Discovery
              </h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                Enter your website and we'll use AI to automatically extract your business information and build your knowledge base.
              </p>

              {!aiDone ? (
                <>
                  {inp("source_name", "Business Name", "e.g. Pizza Palace")}
                  {inp("url", "Website URL", "https://yourbusiness.com")}
                  <button onClick={analyzeWithAI} disabled={aiLoading || !form.url}
                    style={{ ...btnPrimary, background: aiLoading ? "rgba(79,255,176,0.2)" : "#4FFFB0", opacity: (!form.url || aiLoading) ? 0.6 : 1 }}>
                    {aiLoading ? "🤖 Analyzing your website..." : "🔍 Analyze with AI →"}
                  </button>
                  {aiLoading && (
                    <div style={{ textAlign: "center", marginTop: 16, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                      Fetching your website and extracting business info...
                    </div>
                  )}
                  <button onClick={() => { patch({ onboarding_step: 3 }); setStep(3); }}
                    style={{ width: "100%", marginTop: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>
                    Skip this step →
                  </button>
                </>
              ) : (
                <>
                  <div style={{ background: aiPowered ? "rgba(79,255,176,0.08)" : "rgba(255,213,102,0.08)", border: `1px solid ${aiPowered ? "rgba(79,255,176,0.2)" : "rgba(255,213,102,0.2)"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: aiPowered ? "#4FFFB0" : "#FFD166" }}>
                    {aiPowered ? "✨ AI found the following info from your website:" : "⚠️ Basic extraction (add ANTHROPIC_API_KEY for AI-powered analysis):"}
                  </div>

                  {/* Knowledge items with checkboxes to approve/remove */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {aiItems.map((item, idx) => (
                      <div key={idx} style={{ background: item.approved ? "rgba(79,255,176,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${item.approved ? "rgba(79,255,176,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <input type="checkbox" checked={item.approved} onChange={e => {
                            const updated = [...aiItems];
                            updated[idx] = { ...updated[idx], approved: e.target.checked };
                            setAiItems(updated);
                          }} style={{ marginTop: 2, accentColor: "#4FFFB0", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: item.approved ? "#4FFFB0" : "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}>{item.content.slice(0, 200)}{item.content.length > 200 ? "..." : ""}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={confirmKnowledge} disabled={loading || aiItems.filter(i => i.approved).length === 0}
                    style={btnPrimary}>
                    {loading ? "Saving..." : `✓ Save ${aiItems.filter(i => i.approved).length} Knowledge Items →`}
                  </button>
                  <button onClick={() => setAiDone(false)}
                    style={{ width: "100%", marginTop: 8, background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>
                    ← Try a different URL
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 3 — Configure Agent */}
          {step === 3 && (
            <div>
              <h3 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Configure your agent</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Give your agent a name and set up escalation.</p>
              {inp("agent_name", "Agent Name", "e.g. Aria, Max, Luna")}
              {inp("escalation_email", "Your Email (for urgent alerts)", "you@business.com", "email")}
              <button onClick={() => { patch({ agent_name: form.agent_name, escalation_email: form.escalation_email, onboarding_step: 4 }); setStep(4); }} style={btnPrimary}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 4 — Go Live */}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h3 style={{ color: "#4FFFB0", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're ready to go live!</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                Your AI agent is being trained on your knowledge sources. It will be ready to handle conversations in 5–10 minutes.
                Go to your dashboard to grab your embed code and add it to your website.
              </p>
              <button onClick={finish} style={btnPrimary}>
                Open My Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
