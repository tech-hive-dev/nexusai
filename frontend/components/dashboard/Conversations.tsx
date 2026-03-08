"use client";
import { useEffect, useState, useRef } from "react";
import { useConversationSocket } from "@/app/hooks/useConversationSocket";

const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => (typeof window !== "undefined" ? localStorage.getItem("nexusai_token") : "");

export default function Conversations() {
  const [convs, setConvs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [humanInput, setHumanInput] = useState("");
  const [takingOver, setTakingOver] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract tenant slug from JWT for WebSocket
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  useEffect(() => {
    const t = token();
    if (!t) return;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      setTenantSlug(payload.slug || null);
    } catch { }
  }, []);

  const { connected, lastEvent, sendHumanReply } = useConversationSocket(tenantSlug);

  // Load conversation list
  const loadConvs = () => {
    fetch(`${API}/api/chat/conversations`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then(setConvs)
      .catch(() => { });
  };
  useEffect(loadConvs, []);

  // Handle WebSocket events
  useEffect(() => {
    if (!lastEvent) return;

    // Always refresh list on any message or status change
    if (["new_message", "human_message", "takeover", "release"].includes(lastEvent.type)) {
      loadConvs();
    }

    if (selected?.id === lastEvent.conversation_id) {
      if (lastEvent.type === "new_message") {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: "user", content: lastEvent.message },
          { id: `a-${Date.now()}`, role: "assistant", content: lastEvent.response },
        ]);
      } else if (lastEvent.type === "human_message") {
        // Prevent double-adding if this tab sent the message
        // In a real app we'd use message IDs
        setMessages((prev) => {
          const lastOne = prev[prev.length - 1];
          if (lastOne?.content === lastEvent.content && lastOne?.isHuman) return prev;
          return [
            ...prev,
            {
              id: `h-${Date.now()}`,
              role: "assistant",
              content: lastEvent.content,
              isHuman: true,
              created_at: lastEvent.created_at
            },
          ];
        });
      } else if (lastEvent.type === "takeover") {
        setSelected(prev => ({ ...prev, status: "human", is_human_takeover: true }));
      } else if (lastEvent.type === "release") {
        setSelected(prev => ({ ...prev, status: "open", is_human_takeover: false }));
      }
    }
  }, [lastEvent]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConv = async (conv: any) => {
    setSelected(conv);
    setMessages([]);
    setHumanInput("");
    const r = await fetch(`${API}/api/chat/conversations/${conv.id}/messages`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const msgs = await r.json();
    setMessages(msgs);
  };

  const handleTakeover = async () => {
    if (!selected) return;
    setTakingOver(true);
    await fetch(`${API}/api/chat/conversations/${selected.id}/takeover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const updated = { ...selected, status: "human", is_human_takeover: true };
    setSelected(updated);
    setConvs((cs) => cs.map((c) => (c.id === selected.id ? { ...c, status: "human" } : c)));
    setTakingOver(false);
  };

  const handleRelease = async () => {
    if (!selected) return;
    await fetch(`${API}/api/chat/conversations/${selected.id}/release`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const updated = { ...selected, status: "open", is_human_takeover: false };
    setSelected(updated);
    setConvs((cs) => cs.map((c) => (c.id === selected.id ? { ...c, status: "open" } : c)));
  };

  const handleSendHuman = () => {
    const content = humanInput.trim();
    if (!content || !selected) return;
    setSending(true);
    setHumanInput("");
    sendHumanReply(selected.id, content);
    setMessages((prev) => [
      ...prev,
      { id: `h-${Date.now()}`, role: "assistant", content, isHuman: true },
    ]);
    setSending(false);
  };

  const statusColor: Record<string, string> = {
    open: "#4FFFB0", resolved: "#5BB8FF", escalated: "#FF5E5E", human: "#FFD166",
  };
  const sentColor: Record<string, string> = {
    negative: "#FF5E5E", positive: "#4FFFB0", neutral: "rgba(255,255,255,0.3)",
  };

  const isHumanMode = selected?.status === "human" || selected?.is_human_takeover;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
      {/* Conversation list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Conversations</h2>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 20, fontFamily: "monospace",
            background: connected ? "rgba(79,255,176,0.1)" : "rgba(255,255,255,0.05)",
            color: connected ? "#4FFFB0" : "#475569",
          }}>
            {connected ? "● LIVE" : "○ offline"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {convs.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40, fontFamily: "monospace", fontSize: 13 }}>
              No conversations yet. Share your widget link to start chatting!
            </div>
          )}
          {convs.map((c) => (
            <div
              key={c.id}
              onClick={() => openConv(c)}
              style={{
                background: selected?.id === c.id ? "rgba(79,255,176,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected?.id === c.id ? "rgba(79,255,176,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 14 }}>{c.customer_name}</span>
                  <span style={{ background: (statusColor[c.status] || "#888") + "20", color: statusColor[c.status] || "#888", padding: "1px 7px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>
                    {c.status.toUpperCase()}
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", padding: "1px 7px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>
                    {c.channel}
                  </span>
                  <span style={{ color: sentColor[c.sentiment] || "rgba(255,255,255,0.3)", fontSize: 11 }}>● {c.sentiment}</span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {c.last_message}
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
                {new Date(c.updated_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation detail */}
      {selected && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.customer_name}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                {selected.channel} · {selected.language || "en"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isHumanMode ? (
                <button
                  onClick={handleRelease}
                  style={{
                    padding: "6px 14px", background: "rgba(79,255,176,0.1)",
                    border: "1px solid rgba(79,255,176,0.3)", borderRadius: 8,
                    color: "#4FFFB0", fontSize: 12, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Hand back to AI ↩
                </button>
              ) : (
                <button
                  onClick={handleTakeover}
                  disabled={takingOver}
                  style={{
                    padding: "6px 14px", background: "rgba(255,209,102,0.1)",
                    border: "1px solid rgba(255,209,102,0.3)", borderRadius: 8,
                    color: "#FFD166", fontSize: 12, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {takingOver ? "Taking over…" : "Take Over"}
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Human mode banner */}
          {isHumanMode && (
            <div style={{
              background: "rgba(255,209,102,0.06)",
              borderBottom: "1px solid rgba(255,209,102,0.15)",
              padding: "7px 16px",
              fontSize: 12,
              color: "#FFD166",
            }}>
              👤 You are handling this conversation — AI is paused
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m: any) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: m.role === "user"
                    ? "rgba(79,255,176,0.15)"
                    : m.isHuman ? "rgba(255,209,102,0.15)" : "rgba(255,255,255,0.06)",
                  borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  padding: "10px 13px",
                  maxWidth: "80%",
                  fontSize: 13,
                  color: "#e8eaf0",
                  lineHeight: 1.55,
                }}>
                  {m.isHuman && (
                    <div style={{ fontSize: 10, color: "#FFD166", marginBottom: 4, fontFamily: "monospace" }}>YOU →</div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Human reply input */}
          {isHumanMode && (
            <div style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,209,102,0.15)",
              display: "flex",
              gap: 8,
            }}>
              <input
                value={humanInput}
                onChange={(e) => setHumanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendHuman()}
                placeholder="Reply as human agent… (Enter to send)"
                style={{
                  flex: 1, padding: "9px 12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,209,102,0.3)",
                  borderRadius: 8, color: "#e8eaf0", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={handleSendHuman}
                disabled={sending || !humanInput.trim()}
                style={{
                  padding: "9px 16px",
                  background: "rgba(255,209,102,0.15)",
                  border: "1px solid rgba(255,209,102,0.4)",
                  borderRadius: 8, color: "#FFD166", fontSize: 13,
                  cursor: humanInput.trim() ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
