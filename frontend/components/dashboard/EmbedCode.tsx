// EmbedCode.tsx
"use client";
import { useEffect, useState } from "react";
import { API_URL as API } from "@/utils/api";
const token = () => localStorage.getItem("nexusai_token");

export default function EmbedCode() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/tenants/embed-code`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setCode(d.code)).catch(() => { });
  }, []);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Embed Your Chat Widget</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
        Paste this code just before the {"</body>"} tag on your website to add the chat widget.
      </p>
      <div style={{ background: "#0B0E1A", border: "1px solid rgba(79,255,176,0.2)", borderRadius: 12, padding: 20, position: "relative" }}>
        <pre style={{ color: "#4FFFB0", fontSize: 13, fontFamily: "monospace", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
          {code || "Loading..."}
        </pre>
        <button onClick={copy} style={{ position: "absolute", top: 12, right: 12, background: copied ? "rgba(79,255,176,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${copied ? "rgba(79,255,176,0.4)" : "rgba(255,255,255,0.15)"}`, color: copied ? "#4FFFB0" : "rgba(255,255,255,0.6)", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { platform: "WordPress", icon: "🌐", desc: "Paste in Appearance → Theme Editor → footer.php" },
          { platform: "Shopify", icon: "🛒", desc: "Online Store → Themes → Edit code → theme.liquid" },
          { platform: "Squarespace", icon: "🔷", desc: "Settings → Advanced → Code Injection → Footer" },
          { platform: "Wix", icon: "⭕", desc: "Settings → Custom Code → Add code to body" },
        ].map(p => (
          <div key={p.platform} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
            <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.platform}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
