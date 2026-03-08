"use client";

interface Analytics {
  total_clients: number;
  total_mrr: number;
  total_margin: number;
  total_conversations: number;
  avg_margin_per_client: number;
}

interface Props {
  analytics: Analytics;
}

export default function BillingDashboard({ analytics }: Props) {
  const stats = [
    { label: "Active Clients", value: analytics.total_clients.toString(), sub: "white-label accounts", color: "#6366F1" },
    { label: "Total MRR", value: `$${analytics.total_mrr.toLocaleString()}`, sub: "monthly recurring revenue", color: "#10B981" },
    { label: "Your Margin", value: `$${analytics.total_margin.toLocaleString()}`, sub: `$${analytics.avg_margin_per_client.toFixed(0)} avg/client`, color: "#F59E0B" },
    { label: "Total Conversations", value: analytics.total_conversations.toLocaleString(), sub: "across all clients", color: "#818CF8" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#1E293B", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 14 }}>{s.label}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Wholesale pricing info */}
      <div style={{ background: "#1E293B", borderRadius: 12, padding: 24, border: "1px solid rgba(99,102,241,0.3)" }}>
        <h3 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Your Wholesale Pricing</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { plan: "Starter", wholesale: "$49", retail: "$97+", clients: "500 conv/mo" },
            { plan: "Growth", wholesale: "$79", retail: "$197+", clients: "2,000 conv/mo" },
            { plan: "Business", wholesale: "$129", retail: "$397+", clients: "10,000 conv/mo" },
          ].map(p => (
            <div key={p.plan} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#818CF8", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{p.plan}</div>
              <div style={{ color: "#F1F5F9", fontWeight: 800, fontSize: 22 }}>{p.wholesale}<span style={{ color: "#64748B", fontWeight: 400, fontSize: 13 }}>/mo</span></div>
              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>Sell for {p.retail}</div>
              <div style={{ color: "#475569", fontSize: 12 }}>{p.clients}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "#475569", fontSize: 13, marginTop: 16 }}>
          Prices above are your cost. Set your own retail price per client for maximum margin.
        </p>
      </div>
    </div>
  );
}
