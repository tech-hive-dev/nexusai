"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", business_name: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, business_name: form.business_name, full_name: form.full_name };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      localStorage.setItem("nexusai_token", data.access_token);
      if (mode === "register" || !data.tenant?.onboarding_completed) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = (field: string, label: string, type = "text") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6, fontFamily: "monospace", letterSpacing: 0.5 }}>{label.toUpperCase()}</label>
      <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
        onKeyDown={e => e.key === "Enter" && submit()}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080814", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>◆</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#e8eaf0" }}>NEXUS<span style={{ color: "#4FFFB0" }}>AI</span></div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 4 }}>
            {mode === "login" ? "Sign in to your dashboard" : "Start your 14-day free trial"}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 28 }}>
          {mode === "register" && inp("business_name", "Business Name")}
          {mode === "register" && inp("full_name", "Your Name")}
          {inp("email", "Email", "email")}
          {inp("password", "Password", "password")}

          {error && <div style={{ background: "rgba(255,94,94,0.1)", border: "1px solid rgba(255,94,94,0.3)", color: "#FF5E5E", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button onClick={submit} disabled={loading} style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: "12px", color: "#000", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 20, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{ background: "none", border: "none", color: "#4FFFB0", cursor: "pointer", fontSize: 13 }}>
              {mode === "login" ? "Sign up free" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
