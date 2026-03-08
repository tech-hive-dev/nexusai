// Leads.tsx
"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetch(`${API}/api/leads/`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setLeads).catch(() => {});
  }, []);
  const filtered = leads.filter(l =>
    !search || [l.name, l.email, l.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const chColor: any = { whatsapp: "#25D366", website: "#4FFFB0", facebook: "#1877F2", instagram: "#E1306C" };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Leads & CRM</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 20 }}>Every customer who chatted with your agent.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, outline: "none" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, alignSelf: "center" }}>{filtered.length} leads</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontFamily: "monospace", fontSize: 13 }}>No leads yet. Leads are captured automatically during conversations.</div>}
        {filtered.map(l => (
          <div key={l.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(79,255,176,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4FFFB0", fontWeight: 800, fontSize: 15 }}>
              {(l.name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 14 }}>{l.name || "Anonymous"}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>
                {[l.email, l.phone].filter(Boolean).join(" · ") || "No contact info yet"}
              </div>
            </div>
            <span style={{ background: (chColor[l.channel] || "#888") + "20", color: chColor[l.channel] || "#888", padding: "3px 10px", borderRadius: 5, fontSize: 11, fontFamily: "monospace" }}>
              {l.channel?.toUpperCase()}
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{new Date(l.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
