"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 16, marginTop: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", rows = 0 }: any) {
  const style = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    padding: "9px 12px", color: "#e8eaf0", fontSize: 13, outline: "none",
    resize: rows ? "vertical" : "none", fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
        {label.toUpperCase()}
      </label>
      {rows ? (
        <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={style} />
      ) : (
        <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div>
        <div style={{ color: "#e8eaf0", fontSize: 13, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "#4FFFB0" : "rgba(255,255,255,0.1)",
          position: "relative", transition: "background 0.2s", flexShrink: 0, marginLeft: 16,
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: 9,
          background: checked ? "#0F172A" : "rgba(255,255,255,0.5)",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

export default function Settings() {
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [blockedInput, setBlockedInput] = useState("");
  const [vocabKey, setVocabKey] = useState("");
  const [vocabVal, setVocabVal] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorStrategy, setCompetitorStrategy] = useState("");

  useEffect(() => {
    fetch(`${API}/api/tenants/settings`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setForm({
        ...d,
        blocked_topics: d.blocked_topics || [],
        vocabulary_overrides: d.vocabulary_overrides || {},
        competitor_playbook: d.competitor_playbook || [],
      }))
      .catch(() => {});
  }, []);

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  const save = async () => {
    await fetch(`${API}/api/tenants/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_name: form.agent_name,
        agent_persona: form.agent_persona,
        escalation_email: form.escalation_email,
        brand_color: form.brand_color,
        language_default: form.language_default,
        hide_ai_identity: form.hide_ai_identity,
        blocked_topics: form.blocked_topics || [],
        vocabulary_overrides: form.vocabulary_overrides || {},
        competitor_playbook: form.competitor_playbook || [],
        weekly_report_enabled: form.weekly_report_enabled,
        owner_whatsapp_number: form.owner_whatsapp_number,
        slack_webhook_url: form.slack_webhook_url,
        google_review_url: form.google_review_url,
        pii_detection_enabled: form.pii_detection_enabled,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBlocked = () => {
    const t = blockedInput.trim();
    if (!t) return;
    set("blocked_topics", [...(form.blocked_topics || []), t]);
    setBlockedInput("");
  };

  const removeBlocked = (topic: string) =>
    set("blocked_topics", (form.blocked_topics || []).filter((x: string) => x !== topic));

  const addVocab = () => {
    if (!vocabKey.trim() || !vocabVal.trim()) return;
    set("vocabulary_overrides", { ...(form.vocabulary_overrides || {}), [vocabKey.trim()]: vocabVal.trim() });
    setVocabKey(""); setVocabVal("");
  };

  const removeVocab = (key: string) => {
    const v = { ...(form.vocabulary_overrides || {}) };
    delete v[key];
    set("vocabulary_overrides", v);
  };

  const addCompetitor = () => {
    if (!competitorName.trim()) return;
    set("competitor_playbook", [...(form.competitor_playbook || []), { name: competitorName.trim(), strategy: competitorStrategy.trim() }]);
    setCompetitorName(""); setCompetitorStrategy("");
  };

  const removeCompetitor = (name: string) =>
    set("competitor_playbook", (form.competitor_playbook || []).filter((c: any) => c.name !== name));

  const inputStyle = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "8px 12px", color: "#e8eaf0", fontSize: 13, outline: "none",
  };

  const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 24, marginBottom: 20 };

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Agent Settings</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>Customize your AI agent's personality and behavior.</p>

      {/* Basic settings */}
      <div style={card}>
        <SectionLabel>IDENTITY</SectionLabel>
        <Field label="Agent Name" value={form.agent_name} onChange={(v: string) => set("agent_name", v)} placeholder="e.g. Aria, Max, Luna" />
        <Field label="Agent Persona" value={form.agent_persona} onChange={(v: string) => set("agent_persona", v)}
          rows={3} placeholder="e.g. Friendly, professional, concise. Always suggest upsells when appropriate." />
        <Field label="Default Language" value={form.language_default} onChange={(v: string) => set("language_default", v)} placeholder="en" />
        <Field label="Escalation Email" value={form.escalation_email} onChange={(v: string) => set("escalation_email", v)} type="email" placeholder="your@email.com" />
        <Field label="Brand Color (hex)" value={form.brand_color} onChange={(v: string) => set("brand_color", v)} placeholder="#4FFFB0" />
      </div>

      {/* Brand Voice */}
      <div style={card}>
        <SectionLabel>BRAND VOICE GUARDRAILS</SectionLabel>
        <Toggle
          label="Never Reveal AI Identity"
          description="Agent will never confirm it is an AI when asked"
          checked={!!form.hide_ai_identity}
          onChange={(v: boolean) => set("hide_ai_identity", v)}
        />

        {/* Blocked topics */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
            BLOCKED TOPICS
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={blockedInput} onChange={e => setBlockedInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addBlocked()}
              placeholder="e.g. politics, refunds, pricing"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addBlocked} style={{ ...inputStyle, cursor: "pointer", padding: "8px 16px", color: "#4FFFB0" }}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(form.blocked_topics || []).map((t: string) => (
              <span key={t} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                {t}
                <button onClick={() => removeBlocked(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
          {(form.blocked_topics || []).length === 0 && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No blocked topics yet</div>}
        </div>

        {/* Vocabulary overrides */}
        <div>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
            VOCABULARY OVERRIDES (replace word → with)
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={vocabKey} onChange={e => setVocabKey(e.target.value)} placeholder="Replace..." style={{ ...inputStyle, flex: 1 }} />
            <input value={vocabVal} onChange={e => setVocabVal(e.target.value)} placeholder="With..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addVocab} style={{ ...inputStyle, cursor: "pointer", padding: "8px 16px", color: "#4FFFB0" }}>Add</button>
          </div>
          {Object.entries(form.vocabulary_overrides || {}).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "#e8eaf0", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 8px" }}>{k}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
              <span style={{ color: "#4FFFB0", background: "rgba(79,255,176,0.08)", borderRadius: 6, padding: "3px 8px" }}>{v as string}</span>
              <button onClick={() => removeVocab(k)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Playbook */}
      <div style={card}>
        <SectionLabel>COMPETITOR PLAYBOOK</SectionLabel>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 12 }}>
          When a competitor is mentioned, the agent uses this strategy to handle objections.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={competitorName} onChange={e => setCompetitorName(e.target.value)} placeholder="Competitor name" style={{ ...inputStyle, flex: 1 }} />
          <input value={competitorStrategy} onChange={e => setCompetitorStrategy(e.target.value)} placeholder="Response strategy" style={{ ...inputStyle, flex: 2 }} />
          <button onClick={addCompetitor} style={{ ...inputStyle, cursor: "pointer", padding: "8px 16px", color: "#4FFFB0" }}>Add</button>
        </div>
        {(form.competitor_playbook || []).map((c: any) => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ color: "#C084FC", fontWeight: 600, fontSize: 13, minWidth: 80 }}>{c.name}</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, flex: 1 }}>{c.strategy}</span>
            <button onClick={() => removeCompetitor(c.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}>✕</button>
          </div>
        ))}
        {(form.competitor_playbook || []).length === 0 && <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No competitor rules yet</div>}
      </div>

      {/* Notifications */}
      <div style={card}>
        <SectionLabel>NOTIFICATIONS & REPORTS</SectionLabel>
        <Toggle
          label="Weekly Performance Report"
          description="Receive a weekly AI-generated summary via WhatsApp every Monday at 9am"
          checked={!!form.weekly_report_enabled}
          onChange={(v: boolean) => set("weekly_report_enabled", v)}
        />
        <Field label="Your WhatsApp Number (for reports)" value={form.owner_whatsapp_number} onChange={(v: string) => set("owner_whatsapp_number", v)} placeholder="+1234567890" />
        <Field label="Slack Webhook URL" value={form.slack_webhook_url} onChange={(v: string) => set("slack_webhook_url", v)} placeholder="https://hooks.slack.com/services/..." />
        <Field label="Google Review URL" value={form.google_review_url} onChange={(v: string) => set("google_review_url", v)} placeholder="https://g.page/r/.../review" />
      </div>

      {/* Privacy */}
      <div style={card}>
        <SectionLabel>PRIVACY & COMPLIANCE</SectionLabel>
        <Toggle
          label="PII Detection"
          description="Automatically detect and redact credit cards, SSNs, and passwords in messages"
          checked={!!form.pii_detection_enabled}
          onChange={(v: boolean) => set("pii_detection_enabled", v)}
        />
      </div>

      <button
        onClick={save}
        style={{
          background: saved ? "rgba(79,255,176,0.2)" : "rgba(79,255,176,0.15)",
          border: `1px solid ${saved ? "rgba(79,255,176,0.5)" : "rgba(79,255,176,0.3)"}`,
          color: "#4FFFB0", borderRadius: 8, padding: "11px 24px",
          cursor: "pointer", fontSize: 14, fontWeight: 700, width: "100%",
        }}
      >
        {saved ? "✓ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
