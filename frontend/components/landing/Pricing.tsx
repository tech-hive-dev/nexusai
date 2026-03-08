"use client";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "$97",
    period: "/mo",
    color: "#6366F1",
    bg: "#EEF2FF",
    desc: "Perfect for small businesses getting started with AI",
    features: [
      "1 AI Agent",
      "2 Channels (website + 1 social)",
      "500 conversations/month",
      "Lead capture & basic CRM",
      "Knowledge base (up to 50 sources)",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$247",
    period: "/mo",
    color: "#10B981",
    bg: "#ECFDF5",
    desc: "For growing businesses that want full automation",
    features: [
      "1 AI Agent",
      "5 Channels",
      "2,000 conversations/month",
      "Full CRM + broadcast campaigns",
      "Appointment & order management",
      "Abandoned cart recovery",
      "Payment collection in chat",
      "Priority support",
      "Custom agent persona",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Business",
    price: "$497",
    period: "/mo",
    color: "#F59E0B",
    bg: "#FFFBEB",
    desc: "For high-volume businesses needing full power",
    features: [
      "3 AI Agents",
      "Unlimited channels",
      "10,000 conversations/month",
      "White-label option available",
      "CRM integrations (HubSpot, Salesforce)",
      "Multi-agent team support",
      "SLA guarantee",
      "Dedicated onboarding call",
      "Weekly strategy review",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const COMPARISON = [
  { feature: "AI conversations/month", starter: "500", growth: "2,000", business: "10,000" },
  { feature: "Channels", starter: "2", growth: "5", business: "Unlimited" },
  { feature: "Knowledge base sources", starter: "50", growth: "Unlimited", business: "Unlimited" },
  { feature: "Abandoned cart recovery", starter: "—", growth: "✓", business: "✓" },
  { feature: "Payment in chat (Stripe)", starter: "—", growth: "✓", business: "✓" },
  { feature: "Broadcast campaigns", starter: "—", growth: "✓", business: "✓" },
  { feature: "Voice message support", starter: "—", growth: "✓", business: "✓" },
  { feature: "Human takeover", starter: "✓", growth: "✓", business: "✓" },
  { feature: "Analytics dashboard", starter: "Basic", growth: "Advanced", business: "Full + Export" },
  { feature: "Team members", starter: "1", growth: "3", business: "Unlimited" },
  { feature: "API access", starter: "—", growth: "—", business: "✓" },
  { feature: "White-label option", starter: "—", growth: "—", business: "✓ Add-on" },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", background: "#EEF2FF", color: "#6366F1",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, marginBottom: 16,
          }}>PRICING</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px", letterSpacing: -0.8 }}>
            Simple Pricing, Serious Results
          </h2>
          <p style={{ fontSize: 18, color: "#64748B", maxWidth: 480, margin: "0 auto" }}>
            Start free. 14-day trial on any plan. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
          {PLANS.map((plan, i) => (
            <div key={i} style={{
              background: plan.highlight ? "#fff" : "#F8FAFC",
              border: `2px solid ${plan.highlight ? plan.color : "#E2E8F0"}`,
              borderRadius: 20, padding: "36px 28px",
              position: "relative",
              boxShadow: plan.highlight ? "0 16px 48px rgba(16,185,129,0.15)" : "none",
              transform: plan.highlight ? "scale(1.02)" : "scale(1)",
            }}>
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: plan.color, color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "5px 16px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: 0.5,
                }}>MOST POPULAR</div>
              )}

              <div style={{
                display: "inline-block", background: plan.bg, color: plan.color,
                borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                marginBottom: 12,
              }}>{plan.name}</div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: "#0F172A", letterSpacing: -2 }}>{plan.price}</span>
                <span style={{ color: "#94A3B8", fontSize: 16 }}>{plan.period}</span>
              </div>

              <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>{plan.desc}</p>

              <Link href="/login" style={{
                display: "block", textAlign: "center", padding: "13px 20px", borderRadius: 10,
                background: plan.highlight ? plan.color : "transparent",
                border: `2px solid ${plan.color}`,
                color: plan.highlight ? "#fff" : plan.color,
                fontSize: 15, fontWeight: 600, textDecoration: "none",
                marginBottom: 28, transition: "all 0.15s",
              }}>{plan.cta}</Link>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: plan.color + "20", flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 14, color: "#475569" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: "auto", marginBottom: 40 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#F8FAFC", borderRadius: 16, overflow: "hidden", border: "1px solid #E2E8F0" }}>
            <thead>
              <tr style={{ background: "#fff", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "16px 20px", textAlign: "left", color: "#94A3B8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>FEATURE</th>
                {PLANS.map(p => (
                  <th key={p.name} style={{ padding: "16px 20px", textAlign: "center", color: p.color, fontSize: 14, fontWeight: 700 }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", background: i % 2 === 0 ? "#fff" : "transparent" }}>
                  <td style={{ padding: "13px 20px", color: "#475569", fontSize: 13 }}>{row.feature}</td>
                  {[row.starter, row.growth, row.business].map((val, j) => (
                    <td key={j} style={{ padding: "13px 20px", textAlign: "center", color: val === "✓" ? "#10B981" : val === "—" ? "#CBD5E1" : "#0F172A", fontSize: 13, fontWeight: val === "✓" ? 700 : 400 }}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Money-back guarantee */}
        <div style={{ textAlign: "center", color: "#64748B", fontSize: 14 }}>
          🛡️ <strong style={{ color: "#0F172A" }}>14-day free trial</strong> on all plans · No credit card required · Cancel anytime ·
          <strong style={{ color: "#0F172A" }}> 30-day money-back guarantee</strong>
        </div>
      </div>
    </section>
  );
}
