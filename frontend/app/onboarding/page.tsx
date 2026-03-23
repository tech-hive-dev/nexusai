"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL as API } from "@/utils/api";
const token = () => localStorage.getItem("nexusai_token");

// ─── Types ────────────────────────────────────────────────────
interface KnowledgeItem { title: string; content: string; source: string; approved: boolean; }
interface BusinessCard {
  name: string; address: string; phone: string; rating: number | null;
  website: string; description: string; hours: string[];
  sources: string[]; verified_via_google: boolean;
}

// ─── Step config ──────────────────────────────────────────────
const STEPS = [
  { n: 1, title: "Business Details", icon: "🏢" },
  { n: 2, title: "Social Profiles",  icon: "📱" },
  { n: 3, title: "Researching",      icon: "🔍" },
  { n: 4, title: "Verify & Confirm", icon: "✅" },
  { n: 5, title: "Your AI Agent",    icon: "🤖" },
  { n: 6, title: "Go Live",          icon: "🚀" },
];

const INDUSTRIES = [
  "Restaurant / Café", "Healthcare / Clinic", "Beauty & Salon", "E-commerce",
  "Real Estate", "Education / Coaching", "Fitness / Gym", "Legal Services",
  "Cash & Carry / Wholesale", "Hospitality / Hotel", "Home Services",
  "Retail Store", "Technology / SaaS", "Other",
];

// ─── Reusable input ───────────────────────────────────────────
function Inp({ label, value, onChange, placeholder, type = "text", prefix }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
        {label.toUpperCase()}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "0 12px", color: "rgba(255,255,255,0.3)", fontSize: 14, borderRight: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, background: "transparent", border: "none", padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}
        />
      </div>
    </div>
  );
}

function SourceBadge({ src }: { src: string }) {
  const map: Record<string, { label: string; color: string }> = {
    website:      { label: "Website",      color: "#6366F1" },
    google_places: { label: "Google",      color: "#10B981" },
    social:       { label: "Social",       color: "#F59E0B" },
  };
  const { label, color } = map[src] || { label: src, color: "#64748B" };
  return (
    <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44`, marginRight: 4 }}>
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — Business details
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — Social handles
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  // Step 3 — Research progress
  const [researchProgress, setResearchProgress] = useState<string[]>([]);
  const [researchDone, setResearchDone] = useState(false);

  // Step 4 — Verify
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);
  const [aiItems, setAiItems] = useState<KnowledgeItem[]>([]);
  const [aiPowered, setAiPowered] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 5 — Agent config
  const [agentName, setAgentName] = useState("Aria");
  const [escalationEmail, setEscalationEmail] = useState("");

  const btnPrimary: React.CSSProperties = {
    width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10,
    padding: "13px 0", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8,
  };
  const btnSecondary: React.CSSProperties = {
    width: "100%", background: "transparent", border: "none",
    color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12, marginTop: 10,
  };

  const patch = async (data: any) => {
    await fetch(`${API}/api/tenants/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  // ── Step 3: auto-triggers research ────────────────────────────
  useEffect(() => {
    if (step !== 3) return;
    runResearch();
  }, [step]);

  async function runResearch() {
    setResearchProgress([]);
    setResearchDone(false);

    const addProgress = (msg: string) => setResearchProgress(p => [...p, msg]);

    if (website) addProgress("🌐 Fetching your website…");
    else addProgress("ℹ️ No website — using phone/address for lookup…");

    await new Promise(r => setTimeout(r, 600));

    if (phone || address) addProgress("📍 Looking up Google Places by " + (phone ? "phone number" : "address") + "…");
    await new Promise(r => setTimeout(r, 500));

    if (instagram || facebook) addProgress(`📱 Fetching social profiles (${[instagram && "Instagram", facebook && "Facebook"].filter(Boolean).join(", ")})…`);
    else addProgress("📱 Scanning public social profiles…");

    await new Promise(r => setTimeout(r, 400));
    addProgress("🤖 AI extracting structured business knowledge…");

    try {
      const res = await fetch(`${API}/api/knowledge/auto-discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: website || undefined,
          business_name: name,
          phone: phone || undefined,
          address: address || undefined,
          instagram_handle: instagram || undefined,
          facebook_handle: facebook || undefined,
        }),
      });
      const data = await res.json();

      setBusinessCard(data.business_card || null);
      setAiItems((data.items || []).map((i: any) => ({ ...i, approved: true })));
      setAiPowered(!!data.ai_powered);

      const srcCount = (data.sources_used || []).length;
      addProgress(`✅ Done — found data from ${srcCount} source${srcCount !== 1 ? "s" : ""}`);
    } catch {
      addProgress("⚠️ Could not reach some sources — using available data");
      setAiItems([{ title: "Business Info", content: `${name} — ${website || phone || address || "add details"}`, source: "website", approved: true }]);
    }

    await new Promise(r => setTimeout(r, 400));
    setResearchDone(true);
  }

  // ── Save confirmed KB items and advance ───────────────────────
  async function confirmAndSave() {
    setSaving(true);
    const approved = aiItems.filter(i => i.approved);
    await fetch(`${API}/api/knowledge/auto-discover/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: website || undefined, business_name: name, approved_items: approved }),
    });
    await patch({ industry, onboarding_step: 5 });
    setSaving(false);
    setStep(5);
  }

  async function finish() {
    await patch({
      agent_name: agentName,
      escalation_email: escalationEmail,
      onboarding_completed: true,
      onboarding_step: 6,
    });
    router.push("/dashboard");
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#080814", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#e8eaf0", marginBottom: 4 }}>
            NEXUS<span style={{ color: "#4FFFB0" }}>AI</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Get your AI agent live in under 10 minutes</div>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: 0, marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: step > s.n - 1 ? "#4FFFB0" : "rgba(255,255,255,0.08)" }} />}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: step >= s.n ? "rgba(79,255,176,0.15)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${step >= s.n ? "#4FFFB0" : "rgba(255,255,255,0.12)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: step >= s.n ? "#4FFFB0" : "rgba(255,255,255,0.25)", fontSize: 14,
                }}>
                  {step > s.n ? "✓" : s.icon}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? "#4FFFB0" : "rgba(255,255,255,0.08)" }} />}
              </div>
              <div style={{ color: step === s.n ? "#4FFFB0" : "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 5, textAlign: "center", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {s.title}
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 28px" }}>

          {/* ── STEP 1: Business Details ── */}
          {step === 1 && (
            <div>
              <h2 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Tell us about your business</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                We'll use this to find and verify your business online — the more you add, the better the match.
              </p>

              <Inp label="Business Name" value={name} onChange={setName} placeholder="e.g. Pizza Palace" />

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>INDUSTRY</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: industry ? "#e8eaf0" : "rgba(255,255,255,0.3)", fontSize: 14, outline: "none" }}>
                  <option value="">Select your industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <Inp label="Website URL (optional)" value={website} onChange={setWebsite} placeholder="https://yourbusiness.com" />
              <Inp label="Phone Number (recommended for verification)" value={phone} onChange={setPhone} placeholder="+44 20 1234 5678" type="tel" />
              <Inp label="Business Address (optional)" value={address} onChange={setAddress} placeholder="123 High Street, London, EC1A 1BB" />

              <button
                onClick={() => { patch({ industry, name, onboarding_step: 2 }); setStep(2); }}
                disabled={!name || !industry}
                style={{ ...btnPrimary, opacity: !name || !industry ? 0.5 : 1, cursor: !name || !industry ? "not-allowed" : "pointer" }}
              >
                Next: Add Social Profiles →
              </button>
            </div>
          )}

          {/* ── STEP 2: Social Profiles ── */}
          {step === 2 && (
            <div>
              <h2 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Social profiles</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                Your AI agent can pull information from your social pages and keep the knowledge base updated as you post.
              </p>

              <Inp label="Instagram Handle" value={instagram} onChange={setInstagram} placeholder="yourbusiness" prefix="@" />
              <Inp label="Facebook Page" value={facebook} onChange={setFacebook} placeholder="yourbusiness" prefix="fb.com/" />

              <div style={{ background: "rgba(79,255,176,0.06)", border: "1px solid rgba(79,255,176,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                💡 Even without social handles, we'll research your business using your website, phone, and address.
              </div>

              <button onClick={() => setStep(3)} style={btnPrimary}>
                🔍 Research My Business →
              </button>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
            </div>
          )}

          {/* ── STEP 3: Researching ── */}
          {step === 3 && (
            <div>
              <h2 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Researching your business…</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                We're scanning multiple sources to build your AI knowledge base.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {researchProgress.map((msg, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e8eaf0",
                    animation: "fadeIn 0.3s ease",
                  }}>
                    {msg}
                  </div>
                ))}
                {!researchDone && (
                  <div style={{ display: "flex", gap: 6, padding: "10px 14px" }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FFFB0", opacity: 0.6, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                )}
              </div>

              {researchDone && (
                <button onClick={() => setStep(4)} style={btnPrimary}>
                  See What We Found →
                </button>
              )}

              <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
                @keyframes pulse { 0%,100% { opacity:0.3; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.2); } }
              `}</style>
            </div>
          )}

          {/* ── STEP 4: Verify & Confirm ── */}
          {step === 4 && (
            <div>
              <h2 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Is this your business?</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 20 }}>
                We found the following information. Confirm it's correct before we build your knowledge base.
              </p>

              {/* Business verification card */}
              {businessCard && (
                <div style={{ background: "rgba(79,255,176,0.06)", border: "1px solid rgba(79,255,176,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ color: "#4FFFB0", fontWeight: 700, fontSize: 16 }}>{businessCard.name || name}</div>
                      {businessCard.description && (
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{businessCard.description}</div>
                      )}
                    </div>
                    {businessCard.rating && (
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ color: "#F59E0B", fontWeight: 800, fontSize: 20 }}>★ {businessCard.rating}</div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Google rating</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    {businessCard.address && (
                      <div style={{ color: "rgba(255,255,255,0.6)" }}>📍 {businessCard.address}</div>
                    )}
                    {businessCard.phone && (
                      <div style={{ color: "rgba(255,255,255,0.6)" }}>📞 {businessCard.phone}</div>
                    )}
                    {businessCard.website && (
                      <div style={{ color: "rgba(255,255,255,0.6)" }}>🌐 {businessCard.website}</div>
                    )}
                    {businessCard.hours.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 4 }}>OPENING HOURS</div>
                        {businessCard.hours.map((h, i) => (
                          <div key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{h}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 4 }}>Sources:</span>
                    {businessCard.sources.map(s => <SourceBadge key={s} src={s} />)}
                    {businessCard.verified_via_google && (
                      <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                        ✓ Google Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!businessCard && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#F59E0B" }}>
                  ⚠️ Couldn't find your business on Google. Please check the knowledge items below and add details in your dashboard.
                </div>
              )}

              {/* Knowledge items */}
              {aiItems.length > 0 && (
                <>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 10 }}>
                    {aiPowered ? "✨ AI extracted the following knowledge — uncheck anything that's wrong:" : "📋 Knowledge items — review before saving:"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, maxHeight: 320, overflowY: "auto" }}>
                    {aiItems.map((item, idx) => (
                      <div key={idx} style={{
                        background: item.approved ? "rgba(79,255,176,0.04)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${item.approved ? "rgba(79,255,176,0.15)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 10, padding: "10px 12px",
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={item.approved}
                            onChange={e => {
                              const updated = [...aiItems];
                              updated[idx] = { ...updated[idx], approved: e.target.checked };
                              setAiItems(updated);
                            }}
                            style={{ marginTop: 3, accentColor: "#4FFFB0", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ color: item.approved ? "#4FFFB0" : "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                              <SourceBadge src={item.source} />
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}>
                              {item.content.slice(0, 180)}{item.content.length > 180 ? "…" : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={confirmAndSave}
                disabled={saving || aiItems.filter(i => i.approved).length === 0}
                style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : `✓ Yes, that's my business — Save ${aiItems.filter(i => i.approved).length} items →`}
              </button>
              <button onClick={() => { setStep(1); setResearchDone(false); setResearchProgress([]); }} style={btnSecondary}>
                ← Details are wrong — let me edit
              </button>
            </div>
          )}

          {/* ── STEP 5: Configure Agent ── */}
          {step === 5 && (
            <div>
              <h2 style={{ color: "#e8eaf0", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Configure your AI agent</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
                Give your agent a name and set up where urgent alerts should go.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>AGENT NAME</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {["Aria", "Max", "Luna", "Nova", "Kai"].map(n => (
                    <button key={n} onClick={() => setAgentName(n)} style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                      background: agentName === n ? "rgba(79,255,176,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${agentName === n ? "#4FFFB0" : "rgba(255,255,255,0.1)"}`,
                      color: agentName === n ? "#4FFFB0" : "rgba(255,255,255,0.5)",
                    }}>{n}</button>
                  ))}
                </div>
                <input
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Or type a custom name…"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <Inp label="Your Email (for urgent escalation alerts)" value={escalationEmail} onChange={setEscalationEmail} placeholder="you@yourbusiness.com" type="email" />

              <button
                onClick={() => { patch({ agent_name: agentName, escalation_email: escalationEmail, onboarding_step: 6 }); setStep(6); }}
                disabled={!agentName}
                style={{ ...btnPrimary, opacity: !agentName ? 0.5 : 1 }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 6: Go Live ── */}
          {step === 6 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
              <h2 style={{ color: "#4FFFB0", fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                {agentName} is ready!
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                Your AI agent is trained and ready to handle conversations.
              </p>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, textAlign: "left" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 10, fontFamily: "monospace" }}>NEXT STEPS:</div>
                {[
                  "Add the widget embed code to your website",
                  "Connect WhatsApp or Facebook Messenger",
                  "Upload product catalogues or menus to the Knowledge Base",
                  "Set up your brand voice in Settings",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                    <span style={{ color: "#4FFFB0", flexShrink: 0 }}>→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
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
