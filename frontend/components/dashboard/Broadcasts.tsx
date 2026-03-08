"use client";
import { useEffect, useState } from "react";

interface Broadcast {
  id: string;
  name: string;
  type: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    draft:     { bg: "rgba(100,116,139,0.15)", color: "#64748B" },
    scheduled: { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
    sending:   { bg: "rgba(99,102,241,0.15)",  color: "#818CF8" },
    sent:      { bg: "rgba(16,185,129,0.15)",  color: "#10B981" },
    failed:    { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  };
  const c = colors[status] || colors.draft;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {status}
    </span>
  );
}

export default function Broadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "whatsapp", content: "", subject: "" });
  const [creating, setCreating] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";
  const api = process.env.NEXT_PUBLIC_API_URL;

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/broadcasts/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBroadcasts(data.broadcasts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBroadcasts(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch(`${api}/api/broadcasts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ name: "", type: "whatsapp", content: "", subject: "" });
      fetchBroadcasts();
    } finally {
      setCreating(false);
    }
  }

  async function sendNow(id: string) {
    await fetch(`${api}/api/broadcasts/${id}/send`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    fetchBroadcasts();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 22 }}>Broadcasts</h2>
          <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>Send bulk WhatsApp or email campaigns to your customers</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + New Campaign
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Loading…</div>
      ) : broadcasts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
          <p style={{ fontWeight: 500, color: "#64748B" }}>No campaigns yet</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Create your first broadcast to reach all your customers at once</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {broadcasts.map(b => (
            <div key={b.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 15 }}>{b.name}</div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 2 }}>
                  {b.type.toUpperCase()} · {b.recipient_count} recipients
                  {b.sent_at && ` · Sent ${new Date(b.sent_at).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {b.status === "sent" && (
                  <span style={{ color: "#10B981", fontSize: 13, fontWeight: 500 }}>{b.sent_count} delivered</span>
                )}
                <StatusBadge status={b.status} />
                {b.status === "draft" && (
                  <button onClick={() => sendNow(b.id)} style={{ padding: "6px 16px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, color: "#818CF8", fontSize: 13, cursor: "pointer" }}>
                    Send Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 480 }}>
            <h3 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>New Campaign</h3>
            <form onSubmit={handleCreate}>
              {[
                { label: "Campaign Name", key: "name", type: "text", placeholder: "Black Friday Sale" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", color: "#94A3B8", fontSize: 13, marginBottom: 6 }}>{f.label}</label>
                  <input required type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8eaf0", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#94A3B8", fontSize: 13, marginBottom: 6 }}>Channel</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8eaf0", fontSize: 14 }}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: "#94A3B8", fontSize: 13, marginBottom: 6 }}>Message</label>
                <textarea required value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="Hi {{name}}, we have an exciting offer for you…"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8eaf0", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Use {"{{name}}"} to personalize with customer name</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#64748B", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg, #6366F1, #4F46E5)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  {creating ? "Creating…" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
