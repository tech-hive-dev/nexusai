"use client";
import { useState } from "react";

const NAV_GROUPS = [
  {
    label: "CORE",
    items: [
      { id: "overview", icon: "◈", label: "Overview" },
      { id: "conversations", icon: "◉", label: "Conversations" },
      { id: "playground", icon: "🧪", label: "AI Playground" },
      { id: "leads", icon: "◆", label: "Leads & CRM" },
    ],
  },
  {
    label: "REVENUE",
    items: [
      { id: "quotes", icon: "📋", label: "Quotes" },
      { id: "broadcasts", icon: "📢", label: "Broadcasts" },
      { id: "cart-recovery", icon: "🛒", label: "Cart Recovery" },
      { id: "analytics", icon: "📊", label: "Analytics" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { id: "knowledge", icon: "⬡", label: "Knowledge Base" },
      { id: "templates", icon: "🏪", label: "Templates" },
    ],
  },
  {
    label: "CONNECT",
    items: [
      { id: "channels", icon: "◎", label: "Channels" },
      { id: "integrations", icon: "🔌", label: "Integrations" },
      { id: "embed", icon: "⟨/⟩", label: "Embed Code" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { id: "billing", icon: "💳", label: "Billing" },
      { id: "settings", icon: "⚙", label: "Settings" },
    ],
  },
];

export default function Sidebar({ activeView, setView, tenant }: any) {
  const [collapsed, setCollapsed] = useState(false);

  const logout = () => {
    localStorage.removeItem("nexusai_token");
    window.location.href = "/login";
  };

  const usagePct = tenant
    ? Math.round((tenant.conversation_count / tenant.conversation_limit) * 100)
    : 0;

  return (
    <aside style={{
      width: collapsed ? 60 : 224,
      minHeight: "100vh",
      background: "#0B0E1A",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      flexDirection: "column",
      padding: collapsed ? "20px 8px" : "20px 12px",
      transition: "width 0.2s ease",
      flexShrink: 0,
    }}>

      {/* Logo + collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 8 }}>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5, color: "#e8eaf0" }}>
              NEXUS<span style={{ color: "#4FFFB0" }}>AI</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1, fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tenant?.name || "Loading…"}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c: boolean) => !c)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: 4, marginLeft: collapsed ? "auto" : 0, lineHeight: 1 }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", letterSpacing: 1, padding: "10px 12px 4px" }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "10px 0" : "9px 12px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    background: active ? "rgba(79,255,176,0.1)" : "transparent",
                    color: active ? "#4FFFB0" : "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.12s",
                    borderLeft: active && !collapsed ? "2px solid #4FFFB0" : "2px solid transparent",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                  <span style={{ fontSize: 15, minWidth: 18, textAlign: "center" }}>{item.icon}</span>
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Usage meter */}
      {!collapsed && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>USAGE</span>
            <span style={{ color: usagePct > 80 ? "#FF6B35" : "#4FFFB0", fontFamily: "monospace", fontSize: 11 }}>
              {tenant?.conversation_count?.toLocaleString()}/{tenant?.conversation_limit?.toLocaleString()}
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(usagePct, 100)}%`,
              background: usagePct > 95 ? "#EF4444" : usagePct > 80 ? "#FF6B35" : "#4FFFB0",
              borderRadius: 2,
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5, fontFamily: "monospace", textTransform: "uppercase" }}>
            {tenant?.plan} plan · {usagePct}% used
          </div>
          {usagePct >= 80 && (
            <button
              onClick={() => setView("billing")}
              style={{ marginTop: 8, width: "100%", padding: "5px 0", background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 6, color: "#FF6B35", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
            >
              Upgrade Plan →
            </button>
          )}
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={logout}
        title={collapsed ? "Sign out" : undefined}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.35)",
          borderRadius: 8,
          padding: collapsed ? "10px 0" : "8px 12px",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
      >
        <span>⎋</span>
        {!collapsed && "Sign Out"}
      </button>
    </aside>
  );
}
