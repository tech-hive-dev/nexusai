"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResellerLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reseller/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Login failed");
      }
      const data = await res.json();
      localStorage.setItem("reseller_token", data.token);
      localStorage.setItem("reseller_info", JSON.stringify(data.reseller));
      router.push("/reseller");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20 }}>N</div>
            <span style={{ fontWeight: 800, fontSize: 22, color: "#fff" }}>Nexus<span style={{ color: "#818CF8" }}>AI</span> <span style={{ color: "#64748B", fontWeight: 400, fontSize: 16 }}>Partners</span></span>
          </div>
        </div>

        <div style={{ background: "#1E293B", borderRadius: 16, padding: 32, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Partner Login</h1>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>Access your reseller dashboard</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#FCA5A5", fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                placeholder="you@company.com"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#94A3B8", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginTop: 20 }}>
            Not a partner yet?{" "}
            <Link href="/#agencies" style={{ color: "#818CF8", textDecoration: "none" }}>Apply here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
