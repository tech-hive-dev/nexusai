import Link from "next/link";

const LINKS = {
  Product: [
    ["Features", "#features"],
    ["Pricing", "#pricing"],
    ["Integrations", "#integrations"],
    ["Changelog", "#"],
    ["API Docs", "#"],
  ],
  "For Agencies": [
    ["Reseller Program", "#agencies"],
    ["White-Label", "#agencies"],
    ["Agency Pricing", "#agencies"],
    ["Partner Portal", "/reseller/login"],
  ],
  Company: [
    ["About", "#"],
    ["Blog", "#"],
    ["Careers", "#"],
    ["Press Kit", "#"],
  ],
  Legal: [
    ["Privacy Policy", "#"],
    ["Terms of Service", "#"],
    ["GDPR", "#"],
    ["Cookie Policy", "#"],
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: "#0F172A", color: "#fff", padding: "64px 24px 32px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Top row */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #6366F1, #10B981)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 16,
              }}>N</div>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
                Nexus<span style={{ color: "#818CF8" }}>AI</span>
              </span>
            </div>
            <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.7, marginBottom: 20, maxWidth: 260 }}>
              The autonomous AI agent platform for businesses. Deploy in 30 minutes. Handle every customer conversation, automatically.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {["Twitter", "LinkedIn", "YouTube"].map(s => (
                <a key={s} href="#" style={{
                  width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#64748B", fontSize: 12, textDecoration: "none", fontWeight: 600,
                }}>{s[0]}</a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <div style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 13, marginBottom: 16, letterSpacing: 0.3 }}>{category}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([label, href]) => (
                  <a key={label} href={href} style={{ color: "#64748B", fontSize: 14, textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#94A3B8")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
                  >{label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ color: "#475569", fontSize: 13 }}>
            © {new Date().getFullYear()} NexusAI. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Cookies"].map(l => (
              <a key={l} href="#" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            Built with ❤️ for businesses worldwide
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
