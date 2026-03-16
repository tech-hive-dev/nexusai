"use client";
import { useEffect, useState } from "react";
import { API_URL as api } from "@/utils/api";

interface Recovery {
  id: string;
  customer_name: string;
  cart_total: number;
  currency: string;
  messages_sent: number;
  status: string;
  recovered_at: string | null;
  created_at: string;
  cart_data: { items?: { title: string; quantity: number; price: string }[] };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    in_progress: { bg: "rgba(99,102,241,0.15)", color: "#818CF8" },
    recovered: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
    abandoned: { bg: "rgba(100,116,139,0.15)", color: "#64748B" },
    failed: { bg: "rgba(239,68,68,0.15)", color: "#EF4444" },
  };
  const c = colors[status] || colors.in_progress;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

export default function CartRecovery() {
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, recovered: 0, revenue: 0, rate: 0 });

  const token = typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";

  useEffect(() => {
    fetch(`${api}/api/cart-recovery/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const list: Recovery[] = data.recoveries || [];
        setRecoveries(list);

        const recovered = list.filter((r) => r.status === "recovered");
        const revenue = recovered.reduce((sum, r) => sum + (r.cart_total || 0), 0);
        setStats({
          total: list.length,
          recovered: recovered.length,
          revenue,
          rate: list.length ? Math.round((recovered.length / list.length) * 100) : 0,
        });
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Total Sequences", value: stats.total, color: "#6366F1" },
    { label: "Carts Recovered", value: stats.recovered, color: "#10B981" },
    { label: "Revenue Recovered", value: `$${stats.revenue.toLocaleString()}`, color: "#4FFFB0" },
    { label: "Recovery Rate", value: `${stats.rate}%`, color: stats.rate >= 20 ? "#10B981" : "#FF6B35" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 22 }}>Cart Recovery</h2>
        <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>
          Automated 3-step sequences to recover abandoned carts via WhatsApp
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "16px 18px",
          }}>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        fontSize: 13,
        color: "#94A3B8",
      }}>
        <span style={{ color: "#818CF8", fontWeight: 600 }}>How it works: </span>
        When a customer abandons their Shopify/WooCommerce cart, NexusAI automatically sends 3 personalised WhatsApp messages —
        immediately, after 1 hour, and after 24 hours — with a discount offer if needed.
        Connect your store in <span style={{ color: "#4FFFB0" }}>Channels → Shopify</span> to activate.
      </div>

      {/* Recovery list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Loading…</div>
      ) : recoveries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p style={{ color: "#64748B", fontWeight: 500 }}>No cart recoveries yet</p>
          <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
            Connect your Shopify or WooCommerce store to start recovering abandoned carts automatically
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recoveries.map((r) => {
            const items = r.cart_data?.items || [];
            return (
              <div key={r.id} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}>
                <div>
                  <div style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                    {r.customer_name || "Anonymous"}
                  </div>
                  {items.length > 0 && (
                    <div style={{ color: "#475569", fontSize: 12 }}>
                      {items.slice(0, 2).map((it) => `${it.title} ×${it.quantity}`).join(", ")}
                      {items.length > 2 && ` +${items.length - 2} more`}
                    </div>
                  )}
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleDateString()} · {r.messages_sent}/3 messages sent
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 16 }}>
                      {r.currency} {r.cart_total?.toFixed(2)}
                    </div>
                    {r.recovered_at && (
                      <div style={{ color: "#10B981", fontSize: 11, marginTop: 2 }}>
                        Recovered {new Date(r.recovered_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
