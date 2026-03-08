import Link from "next/link";

export default function ResellerBanner() {
  return (
    <section id="agencies" style={{
      padding: "80px 24px",
      background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", top: "-50%", right: "-10%", width: 600, height: 600,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-30%", left: "-5%", width: 400, height: 400,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{
              display: "inline-block", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)",
              color: "#A5B4FC", borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
              letterSpacing: 0.5, marginBottom: 20,
            }}>FOR DIGITAL AGENCIES</div>

            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", margin: "0 0 16px", letterSpacing: -0.8 }}>
              Resell NexusAI at<br />
              <span style={{ color: "#A5B4FC" }}>3–5× Margin</span> Under Your Brand
            </h2>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", maxWidth: 560, lineHeight: 1.7, margin: "0 0 32px" }}>
              Buy at $49/agent/month wholesale. Resell at $200–500/month under your own brand and domain.
              One agency with 20 clients = <strong style={{ color: "#fff" }}>$1,000/mo passive income</strong> for you.
            </p>

            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
              {[
                ["White-label dashboard", "Your logo, your domain, your brand"],
                ["Manage all clients", "One portal for all your customers"],
                ["Recurring revenue", "Monthly commissions, automatically"],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "#6366F1",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{title}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/login" style={{
              display: "inline-block", padding: "14px 32px", borderRadius: 10,
              background: "#6366F1", color: "#fff", fontSize: 16, fontWeight: 600,
              textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
            }}>Apply for Reseller Access →</Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 200 }}>
            {[
              { value: "$49", label: "Wholesale price per agent/mo" },
              { value: "5×", label: "Average reseller margin" },
              { value: "$10k+", label: "MRR possible with 10 agencies" },
            ].map((stat, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: "20px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#A5B4FC", letterSpacing: -1 }}>{stat.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
