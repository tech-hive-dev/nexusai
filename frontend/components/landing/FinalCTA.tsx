import Link from "next/link";

export default function FinalCTA() {
  return (
    <section style={{ padding: "100px 24px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          display: "inline-block", background: "#EEF2FF", color: "#6366F1",
          borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
          letterSpacing: 0.5, marginBottom: 24,
        }}>GET STARTED TODAY</div>

        <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "#0F172A", margin: "0 0 20px", letterSpacing: -1 }}>
          Ready to Automate Your<br />Customer Conversations?
        </h2>

        <p style={{ fontSize: 18, color: "#64748B", lineHeight: 1.7, margin: "0 0 40px" }}>
          Join 500+ businesses across 30 countries using NexusAI to handle support,
          capture leads, book appointments, and grow revenue — automatically.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          <Link href="/login" style={{
            padding: "16px 36px", borderRadius: 12,
            background: "linear-gradient(135deg, #6366F1, #4F46E5)",
            color: "#fff", fontSize: 17, fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(99,102,241,0.4)",
          }}>Start Your Free 14-Day Trial →</Link>
          <a href="#pricing" style={{
            padding: "16px 28px", borderRadius: 12, border: "2px solid #E2E8F0",
            color: "#475569", fontSize: 17, fontWeight: 600, textDecoration: "none",
            background: "#fff",
          }}>View Pricing</a>
        </div>

        <p style={{ color: "#94A3B8", fontSize: 14 }}>
          No credit card required · Setup in 30 minutes · Cancel anytime
        </p>

        {/* Trust badges */}
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", marginTop: 48 }}>
          {[
            { icon: "🔒", label: "SOC2 Type II" },
            { icon: "🇪🇺", label: "GDPR Compliant" },
            { icon: "⚡", label: "99.9% Uptime SLA" },
            { icon: "🌍", label: "50+ Languages" },
          ].map((badge, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>{badge.icon}</span>
              <span style={{ fontWeight: 500 }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
