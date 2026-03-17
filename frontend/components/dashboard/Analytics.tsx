"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { API_URL as API } from "@/utils/api";
const token = () => typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "";

function KpiCard({ label, value, color = "#4FFFB0", sub, alert = false }: any) {
  return (
    <div style={{
      background: alert ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${alert ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
      borderTop: `3px solid ${alert ? "#EF4444" : color}`,
      borderRadius: 12, padding: "18px 20px",
    }}>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", letterSpacing: 0.5, marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: alert ? "#EF4444" : color, fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const LEAD_COLORS: Record<string, string> = { hot: "#EF4444", warm: "#F59E0B", cold: "#6366F1" };

export default function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`${API}/api/analytics/metrics?days=${days}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/analytics/campaigns`, { headers }).then(r => r.json()),
    ]).then(([m, c]) => {
      setMetrics(m);
      setCampaigns(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 60 }}>Loading analytics…</div>;
  if (!metrics) return null;

  const leadDonut = Object.entries(metrics.leads || {}).map(([k, v]) => ({ name: k, value: v as number }));
  const sentimentData = (metrics.sentiment_trend || []).map((d: any) => ({ ...d, pct: d.positive_pct }));
  const lostRevenue = metrics.estimated_lost_revenue ?? 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Analytics</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Business intelligence and ROI tracking.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                background: days === d ? "rgba(79,255,176,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${days === d ? "rgba(79,255,176,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: days === d ? "#4FFFB0" : "rgba(255,255,255,0.5)",
                padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12,
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Total Leads" value={metrics.total_leads ?? 0} color="#4FFFB0" />
        <KpiCard label="Conversion Rate" value={`${metrics.conversion_rate ?? 0}%`} color="#4FFFB0" />
        <KpiCard label="Hot Leads" value={metrics.leads?.hot ?? 0} color="#EF4444" />
        <KpiCard
          label="Est. Lost Revenue"
          value={`£${lostRevenue.toFixed(0)}`}
          alert={lostRevenue > 0}
          sub={lostRevenue > 0 ? `${metrics.unconverted_hot_leads} unconverted hot leads` : "All hot leads followed up"}
        />
        <KpiCard
          label="Avg Response Time"
          value={metrics.avg_response_seconds != null ? `${Math.round(metrics.avg_response_seconds)}s` : "—"}
          color="#F59E0B"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Lead Score Distribution */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Lead Score Distribution</div>
          {leadDonut.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leadDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {leadDonut.map((entry) => (
                    <Cell key={entry.name} fill={LEAD_COLORS[entry.name] || "#888"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontSize: 13 }}>No leads in this period</div>
          )}
        </div>

        {/* Sentiment Trend */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Positive Sentiment Trend (%)</div>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sentimentData}>
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                  formatter={(v: any) => [`${v}%`, "Positive"]} />
                <Area type="monotone" dataKey="pct" stroke="#4FFFB0" fill="rgba(79,255,176,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontSize: 13 }}>No sentiment data yet</div>
          )}
        </div>
      </div>

      {/* Top Unanswered Questions */}
      {(metrics.top_unanswered_questions || []).length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Top Unanswered Questions (Knowledge Gaps)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Question</th>
                <th style={{ textAlign: "right", padding: "6px 10px" }}>Asked</th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_unanswered_questions.map((q: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 10px", color: "#e8eaf0", fontSize: 13 }}>{q.query}</td>
                  <td style={{ padding: "8px 10px", color: "#F59E0B", fontFamily: "monospace", fontSize: 13, textAlign: "right" }}>{q.frequency}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaign Performance */}
      {campaigns.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Campaign Performance</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase" }}>
                {["Campaign", "Status", "Sent", "Delivered", "Replied", "Reply Rate"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px 10px", color: "#e8eaf0", fontSize: 13 }}>{c.name}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ background: "#4FFFB022", color: "#4FFFB0", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}>{c.status}</span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{c.sent}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{c.delivered}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{c.replied}</td>
                  <td style={{ padding: "8px 10px", color: "#4FFFB0", fontFamily: "monospace", fontSize: 13 }}>{c.reply_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
