"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const CHAT_STEPS = [
  { from: "customer", text: "مرحبا، هل يمكنني حجز موعد؟", lang: "AR" },
  { from: "agent", text: "أهلاً! بالتأكيد. ما التاريخ المناسب لك؟", lang: "AR" },
  { from: "customer", text: "Tomorrow at 3pm please", lang: "EN" },
  { from: "agent", text: "Perfect! Appointment booked for tomorrow at 3 PM. You'll receive a confirmation shortly. 📅", lang: "EN" },
  { from: "customer", text: "Also, do you have the Pro plan available?", lang: "EN" },
  { from: "agent", text: "Yes! The Pro plan is $97/mo. Want me to send you a payment link right now? 💳", lang: "EN" },
];

function ChatBubble({ msg, visible }: { msg: typeof CHAT_STEPS[0]; visible: boolean }) {
  const isAgent = msg.from === "agent";
  return (
    <div style={{
      display: "flex", justifyContent: isAgent ? "flex-start" : "flex-end",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "all 0.4s ease", marginBottom: 10,
    }}>
      {isAgent && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", marginRight: 8, flexShrink: 0,
          background: "linear-gradient(135deg, #6366F1, #10B981)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 700,
        }}>AI</div>
      )}
      <div style={{
        maxWidth: "75%", padding: "9px 14px", borderRadius: isAgent ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: isAgent ? "#fff" : "#6366F1",
        color: isAgent ? "#1E293B" : "#fff",
        fontSize: 13, lineHeight: 1.5,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        direction: msg.lang === "AR" ? "rtl" : "ltr",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

export default function Hero() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= CHAT_STEPS.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 1400);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 50%, #F0FDF4 100%)",
      paddingTop: 80, position: "relative", overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", top: "15%", right: "5%", width: 500, height: 500,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "10%", left: "0%", width: 400, height: 400,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "60px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", width: "100%" }}>

        {/* Left — copy */}
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            <span style={{ color: "#6366F1", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
              AI AGENT PLATFORM FOR BUSINESSES
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 4.5vw, 54px)", fontWeight: 800, color: "#0F172A",
            lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 20px",
          }}>
            The AI Agent That<br />
            <span style={{ color: "#6366F1" }}>Runs Your Business</span><br />
            While You Sleep
          </h1>

          <p style={{ fontSize: 18, color: "#64748B", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 480 }}>
            Deploy a custom AI that handles customer chats, books appointments,
            recovers abandoned carts, and captures leads — across WhatsApp,
            your website, and Facebook — in under 30 minutes.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <Link href="/login" style={{
              padding: "14px 28px", borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              color: "#fff", fontSize: 16, fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              transition: "transform 0.15s",
            }}>
              Start Free Trial — No CC Required
            </Link>
            <a href="#features" style={{
              padding: "14px 24px", borderRadius: 10, border: "1px solid #E2E8F0",
              color: "#475569", fontSize: 16, fontWeight: 500, textDecoration: "none",
              background: "#fff", transition: "all 0.15s",
            }}>
              See Features →
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex" }}>
              {["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6"].map((c, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: "50%", background: c,
                  border: "2px solid #fff", marginLeft: i > 0 ? -10 : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                }}>{["A","M","S","R","J"][i]}</div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} style={{ color: "#F59E0B", fontSize: 14 }}>{s}</span>
                ))}
              </div>
              <span style={{ color: "#64748B", fontSize: 13 }}>
                Trusted by <strong style={{ color: "#0F172A" }}>500+ businesses</strong> in 30 countries
              </span>
            </div>
          </div>
        </div>

        {/* Right — animated chat mock */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 340, borderRadius: 24,
            background: "#0F172A",
            boxShadow: "0 32px 80px rgba(15,23,42,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}>
            {/* Phone top bar */}
            <div style={{
              background: "#1E293B", padding: "14px 20px",
              display: "flex", alignItems: "center", gap: 10,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #6366F1, #10B981)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 14,
              }}>AI</div>
              <div>
                <div style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 600 }}>Aria — Business Assistant</div>
                <div style={{ color: "#10B981", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                  Online · replies instantly
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div style={{ padding: "16px 14px", minHeight: 300, background: "#F8FAFC" }}>
              {CHAT_STEPS.map((msg, i) => (
                <ChatBubble key={i} msg={msg} visible={i < visibleCount} />
              ))}
              {/* Typing indicator */}
              {visibleCount < CHAT_STEPS.length && (
                <div style={{ display: "flex", gap: 4, padding: "8px 14px" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#CBD5E1",
                      animation: `bounce 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              background: "#fff", padding: "12px 14px",
              borderTop: "1px solid #E2E8F0",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <div style={{
                flex: 1, background: "#F8FAFC", border: "1px solid #E2E8F0",
                borderRadius: 20, padding: "8px 14px", color: "#94A3B8", fontSize: 13,
              }}>Type a message...</div>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "#6366F1",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </div>
            </div>

            {/* Powered by */}
            <div style={{ background: "#1E293B", padding: "8px", textAlign: "center" }}>
              <span style={{ color: "#475569", fontSize: 10, letterSpacing: 0.5 }}>Powered by NexusAI</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @media (max-width: 768px) {
          section > div { grid-template-columns: 1fr !important; }
          section > div > div:last-child { display: none !important; }
        }
      `}</style>
    </section>
  );
}
