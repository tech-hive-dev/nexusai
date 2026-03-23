"use client";
import { useEffect, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  owner_email: string;
  owner_name: string;
  plan: string;
  plan_status: string;
  is_active: boolean;
  conversation_count: number;
  conversation_limit: number;
  onboarding_completed: boolean;
  applied_template_id: string | null;
  created_at: string | null;
};

type Stats = {
  total_tenants: number;
  total_conversations: number;
  by_plan: Record<string, number>;
  by_status: Record<string, number>;
};

const PLAN_COLORS: Record<string, string> = {
  starter: "#6366F1",
  growth: "#10B981",
  business: "#F59E0B",
  enterprise: "#EF4444",
};

const STATUS_COLORS: Record<string, string> = {
  trial: "#F59E0B",
  active: "#10B981",
  suspended: "#EF4444",
  cancelled: "#64748B",
};

export default function AdminPanel() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ type: "delete" | "reset"; tenant: Tenant } | null>(null);
  const [editPlan, setEditPlan] = useState<{ tenant: Tenant; plan: string; status: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const headers = useCallback(() => ({ "X-Admin-Key": key }), [key]);

  async function fetchAll(adminKey?: string) {
    const k = adminKey || key;
    setLoading(true);
    setError("");
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`, { headers: { "X-Admin-Key": k } }),
        fetch(`${API}/api/admin/tenants?limit=200${planFilter ? `&plan=${planFilter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`, {
          headers: { "X-Admin-Key": k },
        }),
      ]);
      if (statsRes.status === 403 || tenantsRes.status === 403) {
        setError("Invalid admin key");
        setAuthed(false);
        return;
      }
      const statsData = await statsRes.json();
      const tenantsData = await tenantsRes.json();
      setStats(statsData);
      setTenants(tenantsData.tenants || []);
      setTotal(tenantsData.total || 0);
      setAuthed(true);
    } catch {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setKey(keyInput);
    fetchAll(keyInput);
  }

  useEffect(() => {
    if (authed) fetchAll();
  }, [search, planFilter]);

  async function handleDelete() {
    if (!confirm || confirm.type !== "delete") return;
    setActionLoading(true);
    try {
      await fetch(`${API}/api/admin/tenants/${confirm.tenant.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      setSuccessMsg(`${confirm.tenant.name} deleted.`);
      setConfirm(null);
      fetchAll();
    } catch {
      setError("Delete failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm || confirm.type !== "reset") return;
    setActionLoading(true);
    try {
      await fetch(`${API}/api/admin/tenants/${confirm.tenant.id}/reset`, {
        method: "POST",
        headers: headers(),
      });
      setSuccessMsg(`${confirm.tenant.name} reset — KB cleared, onboarding restarted.`);
      setConfirm(null);
      fetchAll();
    } catch {
      setError("Reset failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdatePlan() {
    if (!editPlan) return;
    setActionLoading(true);
    try {
      await fetch(`${API}/api/admin/tenants/${editPlan.tenant.id}`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ plan: editPlan.plan, plan_status: editPlan.status }),
      });
      setSuccessMsg(`Plan updated for ${editPlan.tenant.name}.`);
      setEditPlan(null);
      fetchAll();
    } catch {
      setError("Update failed");
    } finally {
      setActionLoading(false);
    }
  }

  function badge(label: string, colorMap: Record<string, string>) {
    const color = colorMap[label] || "#64748B";
    return (
      <span style={{
        display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: `${color}22`, color, border: `1px solid ${color}44`,
      }}>{label}</span>
    );
  }

  // ─── Login screen ───────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: "#1E293B", borderRadius: 16, padding: 40, width: 360, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366F1, #10B981)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22 }}>N</div>
            <h1 style={{ color: "#F1F5F9", fontSize: 20, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>NexusAI Platform Management</p>
          </div>
          <input
            type="password"
            placeholder="Admin key"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  // ─── Main panel ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "system-ui, sans-serif", color: "#F1F5F9" }}>

      {/* Topbar */}
      <nav style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>N</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Admin Panel</span>
          <span style={{ color: "#475569", fontSize: 13, marginLeft: 4 }}>— Platform Management</span>
        </div>
        <button onClick={() => { setAuthed(false); setKey(""); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#94A3B8", fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>
          Sign out
        </button>
      </nav>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 24px" }}>

        {/* Success banner */}
        {successMsg && (
          <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#10B981", fontSize: 14, display: "flex", justifyContent: "space-between" }}>
            {successMsg}
            <button onClick={() => setSuccessMsg("")} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Stats */}
        {stats && stats.total_tenants !== undefined && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Total Users", value: stats.total_tenants ?? 0, color: "#818CF8" },
              { label: "Conversations", value: (stats.total_conversations ?? 0).toLocaleString(), color: "#10B981" },
              { label: "Trial", value: (stats.by_status?.["trial"]) ?? 0, color: "#F59E0B" },
              { label: "Active", value: (stats.by_status?.["active"]) ?? 0, color: "#10B981" },
              { label: "Suspended", value: (stats.by_status?.["suspended"]) ?? 0, color: "#EF4444" },
              { label: "Starter plan", value: (stats.by_plan?.["starter"]) ?? 0, color: "#6366F1" },
              { label: "Growth plan", value: (stats.by_plan?.["growth"]) ?? 0, color: "#10B981" },
              { label: "Business plan", value: (stats.by_plan?.["business"]) ?? 0, color: "#F59E0B" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1E293B", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 8, background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9", fontSize: 13 }}
          />
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 8, background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", color: planFilter ? "#F1F5F9" : "#64748B", fontSize: 13 }}
          >
            <option value="">All plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="business">Business</option>
          </select>
          <button onClick={() => fetchAll()} style={{ padding: "9px 18px", borderRadius: 8, background: "#334155", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontSize: 13, cursor: "pointer" }}>
            Refresh
          </button>
          <span style={{ color: "#475569", fontSize: 13, alignSelf: "center" }}>{total} users</span>
        </div>

        {/* Table */}
        {error && <div style={{ color: "#EF4444", marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Loading…</div>
          ) : tenants.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>No tenants found</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Business", "Owner", "Plan", "Status", "Conversations", "Template", "Onboarded", "Joined", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, color: "#F1F5F9" }}>{t.name}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{t.slug}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ color: "#CBD5E1" }}>{t.owner_email}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{t.owner_name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{badge(t.plan, PLAN_COLORS)}</td>
                    <td style={{ padding: "12px 16px" }}>{badge(t.plan_status, STATUS_COLORS)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ color: t.conversation_count >= t.conversation_limit * 0.9 ? "#EF4444" : "#CBD5E1" }}>
                        {t.conversation_count} / {t.conversation_limit}
                      </div>
                      <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "#0F172A", width: 80 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(100, (t.conversation_count / t.conversation_limit) * 100)}%`, background: t.conversation_count >= t.conversation_limit * 0.9 ? "#EF4444" : "#10B981" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: t.applied_template_id ? "#10B981" : "#475569", fontSize: 12 }}>
                      {t.applied_template_id || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {t.onboarding_completed
                        ? <span style={{ color: "#10B981", fontSize: 12 }}>✓ Yes</span>
                        : <span style={{ color: "#F59E0B", fontSize: 12 }}>Pending</span>}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569", fontSize: 12, whiteSpace: "nowrap" }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setEditPlan({ tenant: t, plan: t.plan, status: t.plan_status })}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818CF8", fontSize: 11, cursor: "pointer" }}
                        >Edit plan</button>
                        <button
                          onClick={() => setConfirm({ type: "reset", tenant: t })}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontSize: 11, cursor: "pointer" }}
                        >Reset</button>
                        <button
                          onClick={() => setConfirm({ type: "delete", tenant: t })}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 11, cursor: "pointer" }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm modal — Delete or Reset */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#1E293B", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", border: `1px solid ${confirm.type === "delete" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{confirm.type === "delete" ? "🗑️" : "🔄"}</div>
            <h2 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              {confirm.type === "delete" ? "Delete account?" : "Reset account?"}
            </h2>
            {confirm.type === "delete" ? (
              <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6 }}>
                This permanently deletes <strong style={{ color: "#F1F5F9" }}>{confirm.tenant.name}</strong> and all their data (knowledge base, conversations, leads). The owner can re-register with the same email.
              </p>
            ) : (
              <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6 }}>
                This clears the knowledge base and resets onboarding for <strong style={{ color: "#F1F5F9" }}>{confirm.tenant.name}</strong>. Their account and conversation history are kept.
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={confirm.type === "delete" ? handleDelete : handleReset}
                disabled={actionLoading}
                style={{ flex: 1, padding: "11px", borderRadius: 8, background: confirm.type === "delete" ? "#EF4444" : "#F59E0B", color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? "Working…" : confirm.type === "delete" ? "Yes, delete" : "Yes, reset"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: "11px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan modal */}
      {editPlan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#1E293B", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", border: "1px solid rgba(99,102,241,0.3)" }}>
            <h2 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Edit Plan</h2>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>{editPlan.tenant.name}</p>

            <label style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PLAN</label>
            <select
              value={editPlan.plan}
              onChange={e => setEditPlan({ ...editPlan, plan: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9", fontSize: 14, marginBottom: 14 }}
            >
              <option value="starter">Starter (500 convos)</option>
              <option value="growth">Growth (2,000 convos)</option>
              <option value="business">Business (10,000 convos)</option>
            </select>

            <label style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STATUS</label>
            <select
              value={editPlan.status}
              onChange={e => setEditPlan({ ...editPlan, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9", fontSize: 14, marginBottom: 20 }}
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleUpdatePlan}
                disabled={actionLoading}
                style={{ flex: 1, padding: "11px", borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditPlan(null)}
                style={{ flex: 1, padding: "11px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
