// Playground.tsx — in-dashboard AI chatbot tester
"use client";
import { useState, useRef, useEffect } from "react";
import { API_URL as API } from "@/utils/api";
const token = () => localStorage.getItem("nexusai_token");

interface Msg { role: "user" | "ai"; text: string; ts: string; }

export default function Playground() {
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [convId, setConvId] = useState<string | null>(null);
    const [slug, setSlug] = useState<string>("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // get tenant slug from /api/auth/me
    useEffect(() => {
        fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token()}` } })
            .then((r) => r.json())
            .then((d) => setSlug(d?.tenant?.slug || ""))
            .catch(() => { });
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

    const send = async () => {
        const txt = input.trim();
        if (!txt || !slug || loading) return;
        setInput("");
        const userMsg: Msg = { role: "user", text: txt, ts: new Date().toLocaleTimeString() };
        setMsgs((prev) => [...prev, userMsg]);
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/chat/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: txt,
                    tenant_slug: slug,
                    channel: "playground",
                    conversation_id: convId,
                    customer_external_id: "dashboard_preview",
                    customer_name: "Dashboard Test",
                }),
            });
            const data = await res.json();
            setConvId(data.conversation_id || convId);
            const aiMsg: Msg = { role: "ai", text: data.response || "(no response)", ts: new Date().toLocaleTimeString() };
            setMsgs((prev) => [...prev, aiMsg]);
        } catch {
            setMsgs((prev) => [...prev, { role: "ai", text: "Error: could not reach agent.", ts: new Date().toLocaleTimeString() }]);
        }
        setLoading(false);
    };

    const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

    const reset = () => { setMsgs([]); setConvId(null); };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>🧪 AI Playground</h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                        Test your AI agent exactly as your customers will see it.
                    </p>
                </div>
                {msgs.length > 0 && (
                    <button onClick={reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
                        🗑 Clear chat
                    </button>
                )}
            </div>

            {!slug && (
                <div style={{ background: "rgba(255,94,94,0.1)", border: "1px solid rgba(255,94,94,0.3)", borderRadius: 10, padding: 16, color: "#FF5E5E", fontSize: 13 }}>
                    ⚠️ Could not load your agent settings. Try refreshing the page.
                </div>
            )}

            {/* Chat window */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, display: "flex", flexDirection: "column", height: 480 }}>
                {/* Header */}
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: slug ? "#4FFFB0" : "#888" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                        {slug ? `Agent · ${slug}` : "Loading..."}
                    </span>
                    <span style={{ marginLeft: "auto", background: "#4FFFB020", border: "1px solid #4FFFB040", color: "#4FFFB0", fontSize: 10, fontFamily: "monospace", padding: "2px 8px", borderRadius: 4 }}>
                        PREVIEW
                    </span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {msgs.length === 0 && (
                        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 80, fontFamily: "monospace" }}>
                            Type a message below to test your AI agent ↓
                        </div>
                    )}
                    {msgs.map((m, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                            <div style={{
                                maxWidth: "75%",
                                background: m.role === "user" ? "rgba(79,255,176,0.15)" : "rgba(255,255,255,0.06)",
                                border: m.role === "user" ? "1px solid rgba(79,255,176,0.3)" : "1px solid rgba(255,255,255,0.1)",
                                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                padding: "10px 14px",
                            }}>
                                <div style={{ fontSize: 13, color: m.role === "user" ? "#4FFFB0" : "#e8eaf0", lineHeight: 1.5 }}>{m.text}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{m.ts}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px 12px 12px 2px", padding: "10px 18px" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, letterSpacing: 4 }}>···</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", display: "flex", gap: 10 }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Type a message and press Enter…"
                        rows={1}
                        style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", color: "#e8eaf0", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.4 }}
                    />
                    <button onClick={send} disabled={loading || !slug || !input.trim()} style={{ background: input.trim() && slug ? "#4FFFB0" : "rgba(79,255,176,0.1)", border: "none", color: input.trim() && slug ? "#0a0f1a" : "#4FFFB0", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                        ↑
                    </button>
                </div>
            </div>

            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 12, fontFamily: "monospace" }}>
                💡 This uses your live knowledge base. Add sources in Knowledge Base to improve responses.
            </p>
        </div>
    );
}
