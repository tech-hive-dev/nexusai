"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";

function StatCard({ label, value, color, sub }: any) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: `3px solid ${color}`,
      borderRadius: 12,
      padding: "18px 20px",
    }}>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color, fontSize: 32, fontWeight: 800, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CHANNEL_COLORS: Record<string, string> = {
  website: "#4FFFB0",
  whatsapp: "#25D366",
  facebook: "#1877F2",
  instagram: "#E1306C",
  email: "#F59E0B",
  other: "#6366F1",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "8px 14px", fontSize: 13,
      }}>
        <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>
        <div style={{ color: "#4FFFB0", fontWeight: 700 }}>{payload[0].value} conversations</div>
      </div>
    );
  }
  return null;
};

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [ltvTrend, setLtvTrend] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`${API}/api/analytics/overview`, { headers }).then(r => r.json()),
      fetch(`${API}/api/analytics/trend?days=7`, { headers }).then(r => r.json()),
      fetch(`${API}/api/analytics/channels`, { headers }).then(r => r.json()),
      fetch(`${API}/api/analytics/ltv`, { headers }).then(r => r.json()),
    ]).then(([s, t, c, l]) => {
      setStats(s);
      setTrend(Array.isArray(t) ? t : []);
      setChannels(Array.isArray(c) ? c : []);
      setLtvTrend(l?.ltv_trend || []);
    }).catch(() => setStats({ total_conversations: 0, resolution_rate: 0, total_leads: 0, appointments_booked: 0 }));
  }, []);

  const planLimit = stats?.conversation_limit ?? 500;
  const planUsed = stats?.conversation_count ?? 0;
  const usagePct = Math.min(100, Math.round((planUsed / planLimit) * 100));
  const usageColor = usagePct >= 95 ? "#EF4444" : usagePct >= 80 ? "#F59E0B" : "#4FFFB0";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Dashboard Overview</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>Your AI agent performance at a glance</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Conversations" value={stats?.total_conversations ?? "—"} color="#4FFFB0" sub="Total all time" />
        <StatCard label="Resolution Rate" value={stats ? `${stats.resolution_rate}%` : "—"} color="#5BB8FF" sub="AI resolved" />
        <StatCard label="Leads Captured" value={stats?.total_leads ?? "—"} color="#C084FC" sub="With contact info" />
        <StatCard label="Appointments" value={stats?.appointments_booked ?? "—"} color="#FF8C42" sub="Booked by AI" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 24 }}>
        {/* 7-day trend */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 16 }}>
            7-DAY CONVERSATION TREND
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="count" stroke="#4FFFB0" strokeWidth={2}
                  dot={{ fill: "#4FFFB0", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#4FFFB0" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              No data yet — start chatting!
            </div>
          )}
        </div>

        {/* LTV Growth */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 16 }}>
            MONTHLY LTV GROWTH ($)
          </div>
          {ltvTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={ltvTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short' })} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="stepAfter" dataKey="total" stroke="#5BB8FF" strokeWidth={2}
                  dot={{ fill: "#5BB8FF", r: 3, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              Waiting for order data...
            </div>
          )}
        </div>

        {/* Channel breakdown */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 16 }}>
            CHANNEL BREAKDOWN
          </div>
          {channels.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={channels} dataKey="count" nameKey="channel"
                  cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                  paddingAngle={3}
                >
                  {channels.map((entry: any, index: number) => (
                    <Cell key={index} fill={CHANNEL_COLORS[entry.channel] || "#6366F1"} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(value: string) => <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
              No channel data yet
            </div>
          )}
        </div>
      </div>

      {/* Usage bar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5 }}>
            MONTHLY USAGE
          </div>
          <div style={{ color: usageColor, fontSize: 13, fontWeight: 700 }}>
            {planUsed} / {planLimit} conversations ({usagePct}%)
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
          <div style={{
            width: `${usagePct}%`, height: "100%",
            background: usagePct >= 95 ? "linear-gradient(90deg, #EF4444, #F97316)"
              : usagePct >= 80 ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                : "linear-gradient(90deg, #4FFFB0, #5BB8FF)",
            borderRadius: 6,
            transition: "width 0.6s ease",
          }} />
        </div>
        {usagePct >= 80 && (
          <div style={{ color: usageColor, fontSize: 12, marginTop: 8 }}>
            {usagePct >= 95 ? "⚠ Critical: upgrade now to avoid downtime" : "⚠ Approaching limit — consider upgrading your plan"}
          </div>
        )}
      </div>

      {/* Getting started tip */}
      <div style={{
        background: "rgba(79,255,176,0.07)",
        border: "1px solid rgba(79,255,176,0.2)",
        borderRadius: 12,
        padding: "20px 24px",
      }}>
        <div style={{ color: "#4FFFB0", fontSize: 11, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>
          ◆ GETTING STARTED
        </div>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#fff" }}>Next step:</strong> Go to <strong style={{ color: "#4FFFB0" }}>Knowledge Base</strong> and add your website URL,
          product PDFs, or FAQs. The more you add, the smarter your agent becomes.
          Then grab your <strong style={{ color: "#4FFFB0" }}>Embed Code</strong> and paste it on your website to go live!
        </p>
      </div>
    </div>
  );
}
