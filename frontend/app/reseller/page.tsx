"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiUrl } from "@/utils/api";
import ClientList from "@/components/reseller/ClientList";
import CreateClientModal from "@/components/reseller/CreateClientModal";
import BillingDashboard from "@/components/reseller/BillingDashboard";

type View = "clients" | "billing";

export default function ResellerPortal() {
  const router = useRouter();
  const [view, setView] = useState<View>("clients");
  const [reseller, setReseller] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [successEmbed, setSuccessEmbed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("reseller_token");
    if (!token) { router.push("/reseller/login"); return; }
    const info = localStorage.getItem("reseller_info");
    if (info) setReseller(JSON.parse(info));
    fetchData(token);
  }, []);

  async function fetchData(token?: string) {
    const t = token || localStorage.getItem("reseller_token");
    if (!t) return;
    setLoading(true);
    try {
      const [clientsRes, analyticsRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/reseller/clients`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${getApiUrl()}/api/reseller/analytics`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (clientsRes.status === 401) { router.push("/reseller/login"); return; }
      const clientsData = await clientsRes.json();
      const analyticsData = await analyticsRes.json();
      setClients(clientsData.clients || []);
      setAnalytics(analyticsData);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("reseller_token");
    localStorage.removeItem("reseller_info");
    router.push("/reseller/login");
  }

  function handleClientCreated(data: { slug: string; embed_script: string }) {
    setShowCreate(false);
    setSuccessEmbed(data.embed_script);
    fetchData();
  }

  if (loading && !reseller) {
    return <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#818CF8", fontFamily: "monospace" }}>◆ Loading…</div>
    </div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Topbar */}
      <nav style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>N</div>
          <span style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 16 }}>Partner Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#64748B", fontSize: 14 }}>{reseller?.email}</span>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#94A3B8", fontSize: 13, padding: "6px 14px", cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ color: "#F1F5F9", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>
              {reseller?.company_name || reseller?.name || "Partner"} Dashboard
            </h1>
            <p style={{ color: "#64748B", fontSize: 15 }}>Manage your white-label clients and track revenue</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
          >
            + Add Client
          </button>
        </div>

        {/* Quick stats */}
        {analytics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
            {[
              { label: "Clients", value: analytics.total_clients, color: "#818CF8" },
              { label: "MRR", value: `$${analytics.total_mrr.toLocaleString()}`, color: "#10B981" },
              { label: "Your Margin", value: `$${analytics.total_margin.toLocaleString()}`, color: "#F59E0B" },
              { label: "Conversations", value: analytics.total_conversations.toLocaleString(), color: "#64748B" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1E293B", borderRadius: 10, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 0 }}>
          {([["clients", "Clients"], ["billing", "Billing & Pricing"]] as [View, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
              color: view === v ? "#818CF8" : "#475569",
              borderBottom: view === v ? "2px solid #6366F1" : "2px solid transparent",
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          {view === "clients" && (
            loading
              ? <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Loading clients…</div>
              : <ClientList clients={clients} onRefresh={fetchData} />
          )}
          {view === "billing" && analytics && <div style={{ padding: 24 }}><BillingDashboard analytics={analytics} /></div>}
        </div>
      </div>

      {/* Create client modal */}
      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={handleClientCreated}
        />
      )}

      {/* Success embed modal */}
      {successEmbed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#1E293B", borderRadius: 16, padding: 32, maxWidth: 540, width: "100%", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div style={{ color: "#10B981", fontSize: 32, marginBottom: 12 }}>✓</div>
            <h2 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Client Created!</h2>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 16 }}>Share this embed snippet with your client to add the chat widget to their website:</p>
            <div style={{ background: "#0F172A", borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 13, color: "#10B981", wordBreak: "break-all", marginBottom: 20 }}>
              {successEmbed}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(successEmbed); }}
              style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981", fontSize: 13, cursor: "pointer", marginRight: 12 }}
            >
              Copy Snippet
            </button>
            <button
              onClick={() => setSuccessEmbed(null)}
              style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontSize: 13, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
