"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl } from "@/utils/api";
const API = getApiUrl();

function ResetPasswordForm() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState("");
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const t = params.get("token");
        if (!t) { setError("Invalid or missing reset token."); return; }
        setToken(t);
    }, [params]);

    const submit = async () => {
        if (!password || password !== confirm) { setError("Passwords do not match"); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Reset failed");
            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#080814", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 420 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>◆</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#e8eaf0" }}>NEXUS<span style={{ color: "#4FFFB0" }}>AI</span></div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 4 }}>Set your new password</div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 28 }}>
                    {success ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                            <div style={{ color: "#4FFFB0", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Password updated!</div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Redirecting you to sign in...</div>
                        </div>
                    ) : (
                        <>
                            {["New Password", "Confirm Password"].map((label, i) => (
                                <div key={label} style={{ marginBottom: 16 }}>
                                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6, fontFamily: "monospace" }}>{label.toUpperCase()}</label>
                                    <input type="password"
                                        value={i === 0 ? password : confirm}
                                        onChange={e => i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)}
                                        placeholder={i === 0 ? "Min 8 chars, 1 number, 1 special char" : ""}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e8eaf0", fontSize: 14, outline: "none" }}
                                    />
                                </div>
                            ))}

                            {error && <div style={{ background: "rgba(255,94,94,0.1)", border: "1px solid rgba(255,94,94,0.3)", color: "#FF5E5E", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

                            <button onClick={submit} disabled={loading || !token} style={{ width: "100%", background: "#4FFFB0", border: "none", borderRadius: 10, padding: 12, color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                                {loading ? "Updating..." : "Set New Password →"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}
