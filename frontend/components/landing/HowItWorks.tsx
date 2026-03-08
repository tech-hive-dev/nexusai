const STEPS = [
  {
    n: "01",
    title: "Connect Your Data",
    desc: "Paste your website URL, upload PDFs, add your product catalog. Our AI ingests everything in under 20 minutes.",
    details: ["Website auto-crawl", "PDF & Excel upload", "YouTube transcripts", "Manual Q&A entry"],
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  {
    n: "02",
    title: "Deploy Your Agent",
    desc: "Copy one script tag to your website, enter your WhatsApp token, connect Facebook — you're live across every channel.",
    details: ["Website embed (1 line of code)", "WhatsApp Business API", "Facebook & Instagram", "Shopify app install"],
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    n: "03",
    title: "Watch It Work",
    desc: "Your AI handles conversations 24/7. Monitor everything from your dashboard. Jump in anytime with human takeover.",
    details: ["Live conversation dashboard", "Real-time analytics", "Human takeover button", "Weekly WhatsApp reports"],
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
];

export default function HowItWorks() {
  return (
    <section style={{ padding: "100px 24px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", background: "#F0FDF4", color: "#10B981",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, marginBottom: 16,
          }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px", letterSpacing: -0.8 }}>
            Live in 30 Minutes, Not 30 Days
          </h2>
          <p style={{ fontSize: 18, color: "#64748B", maxWidth: 500, margin: "0 auto" }}>
            No developers needed. No complex setup. Three steps and your AI agent is handling real customer conversations.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, position: "relative" }}>
          {/* Connector line (desktop) */}
          <div style={{
            position: "absolute", top: 56, left: "16.66%", right: "16.66%",
            height: 2, background: "linear-gradient(90deg, #6366F1, #10B981, #F59E0B)",
            opacity: 0.3, pointerEvents: "none",
          }} />

          {STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Step number circle */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: step.bg, border: `3px solid ${step.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24, position: "relative", zIndex: 1,
              }}>
                <span style={{ fontWeight: 800, fontSize: 22, color: step.color }}>{step.n}</span>
              </div>

              {/* Card */}
              <div style={{
                background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
                padding: "28px 24px", width: "100%",
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.65, margin: "0 0 20px" }}>{step.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {step.details.map((d, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: step.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke={step.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, color: "#475569" }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
