// KnowledgeBase.tsx
"use client";
import { useEffect, useState, useRef } from "react";
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => localStorage.getItem("nexusai_token");

export default function KnowledgeBase() {
  const [sources, setSources] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("website");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    fetch(`${API}/api/knowledge/sources`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json()).then(setSources).catch(() => {});

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const addSource = async () => {
    if (!url || !name) return;
    setLoading(true);
    await fetch(`${API}/api/knowledge/sources`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type, name, url }),
    });
    setUrl(""); setName(""); setLoading(false); load();
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    setLoading(true);
    await fetch(`${API}/api/knowledge/sources/upload`, {
      method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: fd,
    });
    setLoading(false); load();
  };

  const statusColor: any = { indexed: "#4FFFB0", processing: "#FFD166", pending: "#FFD166", failed: "#FF5E5E" };
  const typeIcon: any = { website: "🌐", pdf: "📄", excel: "📊", youtube: "🎬", manual: "📝" };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Knowledge Base</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
        Add sources so your AI agent learns about your business.
      </p>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ color: "#4FFFB0", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, marginBottom: 14 }}>ADD SOURCE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, marginBottom: 10 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            <option value="website">🌐 Website URL</option>
            <option value="youtube">🎬 YouTube Video</option>
            <option value="manual">📝 Manual Text</option>
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Source name (e.g. Homepage)" style={inputStyle} />
          <button onClick={addSource} disabled={loading} style={btnStyle}>
            {loading ? "Adding..." : "+ Add"}
          </button>
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder={type === "website" ? "https://yoursite.com" : type === "youtube" ? "https://youtube.com/watch?v=..." : "Paste your FAQ text here..."}
          style={{ ...inputStyle, width: "100%" }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Or upload a file:</span>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: "none" }} onChange={uploadFile} />
          <button onClick={() => fileRef.current?.click()} style={{ ...btnStyle, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
            📎 PDF / Excel / CSV
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sources.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontFamily: "monospace", fontSize: 13 }}>No sources yet. Add your first one above ↑</div>}
        {sources.map((s) => (
          <div key={s.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 22 }}>{typeIcon[s.type] || "📄"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>
                {s.chunk_count} chunks · {s.url?.slice(0, 50)}
              </div>
            </div>
            <span style={{ background: (statusColor[s.status] || "#888") + "20", border: `1px solid ${statusColor[s.status] || "#888"}40`, color: statusColor[s.status] || "#888", padding: "3px 10px", borderRadius: 5, fontSize: 11, fontFamily: "monospace" }}>
              {s.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, outline: "none",
};
const btnStyle: React.CSSProperties = {
  background: "rgba(79,255,176,0.15)", border: "1px solid rgba(79,255,176,0.3)",
  color: "#4FFFB0", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
  whiteSpace: "nowrap",
};
