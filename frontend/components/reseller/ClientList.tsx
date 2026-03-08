"use client";
import { useState } from "react";

interface Client {
  id: string;
  tenant_id: string;
  business_name: string;
  slug: string;
  plan: string;
  plan_status: string;
  conversation_count: number;
  retail_price: number;
  wholesale_price: number;
  margin: number;
  custom_domain: string | null;
  created_at: string;
}

interface Props {
  clients: Client[];
  onRefresh: () => void;
}

export default function ClientList({ clients, onRefresh }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(clientId: string) {
    if (!confirm("Remove this client? The tenant account will remain but the reseller link will be removed.")) return;
    setDeleting(clientId);
    try {
      const token = localStorage.getItem("reseller_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reseller/clients/${clientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  }

  if (clients.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "#475569" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#94A3B8" }}>No clients yet</p>
        <p style={{ fontSize: 14, marginTop: 8 }}>Create your first client to get started</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Business", "Plan", "Conversations", "Retail", "Wholesale", "Margin", "Status", ""].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#64748B", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "14px 16px" }}>
                <div style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 14 }}>{c.business_name}</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{c.slug}</div>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <span style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  {c.plan}
                </span>
              </td>
              <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: 14 }}>{c.conversation_count.toLocaleString()}</td>
              <td style={{ padding: "14px 16px", color: "#F1F5F9", fontSize: 14, fontWeight: 600 }}>${c.retail_price}/mo</td>
              <td style={{ padding: "14px 16px", color: "#64748B", fontSize: 14 }}>${c.wholesale_price}/mo</td>
              <td style={{ padding: "14px 16px" }}>
                <span style={{ color: "#10B981", fontWeight: 700, fontSize: 14 }}>+${c.margin}/mo</span>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: c.plan_status === "active" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: c.plan_status === "active" ? "#10B981" : "#F59E0B",
                }}>
                  {c.plan_status}
                </span>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                >
                  {deleting === c.id ? "…" : "Remove"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
