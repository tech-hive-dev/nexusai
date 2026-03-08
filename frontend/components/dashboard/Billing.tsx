"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";

function UsageBar({ label, used, limit, color }: any) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{label.toUpperCase()}</span>
        <span style={{ fontWeight: 600 }}>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", height: 6, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function PlanCard({ name, price, features, isCurrent, color }: any) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: isCurrent ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 32,
      display: "flex",
      flexDirection: "column",
      position: "relative"
    }}>
      {isCurrent && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: color, color: "#000", fontSize: 10, fontWeight: 900,
          padding: "4px 12px", borderRadius: 20, letterSpacing: 1
        }}>
          CURRENT PLAN
        </div>
      )}
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{name}</div>
      <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>${price}<span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)" }}>/mo</span></div>

      <div style={{ flex: 1 }}>
        {features.map((f: string, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color }}>✓</span> {f}
          </div>
        ))}
      </div>

      <button style={{
        marginTop: 32,
        padding: "14px",
        borderRadius: 10,
        background: isCurrent ? "rgba(255,255,255,0.05)" : color,
        color: isCurrent ? "rgba(255,255,255,0.4)" : "#000",
        fontWeight: 700,
        border: "none",
        cursor: isCurrent ? "default" : "pointer",
        transition: "opacity 0.2s"
      }}>
        {isCurrent ? "Current Plan" : "Upgrade Now"}
      </button>
    </div>
  );
}

export default function Billing() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${token()}` }
    }).then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div style={{ padding: 40, color: "rgba(255,255,255,0.2)" }}>Loading billing details...</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Billing & Usage</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>Manage your subscription and monitor resource consumption</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <PlanCard
            name="Starter" price="0" color="#4FFFB0"
            features={["500 conversations/mo", "1 Knowledge Source", "Basic Analytics", "Standard Support"]}
            isCurrent={stats.conversation_limit <= 500}
          />
          <PlanCard
            name="Growth" price="49" color="#5BB8FF"
            features={["5,000 conversations/mo", "Unlimited Sources", "Advanced LTV Analytics", "Priority Support"]}
            isCurrent={stats.conversation_limit > 500 && stats.conversation_limit <= 5000}
          />
        </div>

        {/* Usage */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "rgba(255,255,255,0.7)" }}>CURRENT USAGE</h3>

          <UsageBar label="Conversations" used={stats.conversations_used || 0} limit={stats.conversation_limit} color="#4FFFB0" />
          <UsageBar label="Knowledge Sources" used={1} limit={10} color="#C084FC" />
          <UsageBar label="AI Search Tokens" used={12500} limit={50000} color="#F59E0B" />

          <div style={{
            marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Next billing date: April 1, 2026</div>
            <button style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
              fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer"
            }}>Manage via Stripe</button>
          </div>
        </div>
      </div>
    </div>
  );
}
