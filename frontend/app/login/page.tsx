"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL as API } from "@/utils/api";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", business_name: "", full_name: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (mode === "forgot") {
        const res = await fetch(`${API}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await res.json();
        setSuccess(data.message || "Reset link sent!");
        setLoading(false);
        return;
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, business_name: form.business_name, full_name: form.full_name };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          const err = data.detail[0];
          const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : "";
          throw new Error(field ? `${field}: ${err.msg}` : err.msg);
        }
        throw new Error(data.detail || "Something went wrong");
      }

      localStorage.setItem("nexusai_token", data.access_token);
      if (mode === "register") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      console.error("Fetch error:", e);
      // Improve visibility of connectivity issues
      const msg = e.message === "Failed to fetch"
        ? `Connectivity Error: Could not reach the backend API at ${API}. Please check your connection or environment vars.`
        : e.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inp = (field: string, label: string, type = "text", hint?: string) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6, fontFamily: "monospace", letterSpacing: 0.5 }}>{label.toUpperCase()}</label>
      <input type={type} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
        onKeyDown={e => e.key === "Enter" && submit()}
        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}
      />
      {hint && <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080814", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>◆</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#e8eaf0" }}>NEXUS<span style={{ color: "#4FFFB0" }}>AI</span></div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 4 }}>
            {mode === "login" ? "Sign in to your dashboard" : mode === "register" ? "Start your 14-day free trial" : "Reset your password"}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 28 }}>
          {mode === "register" && inp("business_name", "Business Name")}
          {mode === "register" && inp("full_name", "Your Name")}
          {inp("email", "Email", "email")}
          {mode !== "forgot" && inp("password", "Password", "password", mode === "register" ? "At least 8 chars, 1 number, 1 special character" : undefined)}

          {/* Forgot password link — only in login mode */}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
              <button onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4FFFB0",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: 0.8,
                  textDecoration: "underline",
                  textUnderlineOffset: 3
                }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div style={{ background: "rgba(255,94,94,0.1)", border: "1px solid rgba(255,94,94,0.3)", color: "#FF5E5E", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {success && <div style={{ background: "rgba(79,255,176,0.1)", border: "1px solid rgba(79,255,176,0.3)", color: "#4FFFB0", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>✓ {success}</div>}

          <button onClick={submit} disabled={loading} style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: "12px", color: "#000", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In →" : mode === "register" ? "Create Free Account →" : "Send Reset Link →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 20, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            {mode === "forgot" ? (
              <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                style={{ background: "none", border: "none", color: "#4FFFB0", cursor: "pointer", fontSize: 13 }}>← Back to Sign In</button>
            ) : mode === "login" ? (
              <>Don't have an account? <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: "#4FFFB0", cursor: "pointer", fontSize: 13 }}>Sign up free</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#4FFFB0", cursor: "pointer", fontSize: 13 }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
