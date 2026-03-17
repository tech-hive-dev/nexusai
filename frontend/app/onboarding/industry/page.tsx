"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL as API } from "@/utils/api";
const token = () => localStorage.getItem("nexusai_token");

const INDUSTRIES = [
  {
    id: "restaurant",
    name: "Restaurant / Food",
    icon: "🍽️",
    description: "Menu inquiries, reservations, delivery orders, opening hours, allergens.",
    tags: ["Reservations", "Menu", "Delivery"],
  },
  {
    id: "salon",
    name: "Salon & Beauty",
    icon: "💅",
    description: "Appointment booking, service pricing, aftercare advice, rebooking reminders.",
    tags: ["Bookings", "Pricing", "Aftercare"],
  },
  {
    id: "real_estate",
    name: "Real Estate",
    icon: "🏠",
    description: "Property listings, viewing bookings, mortgage info, buyer/renter qualification.",
    tags: ["Viewings", "Listings", "Lead Qualification"],
  },
  {
    id: "clinic",
    name: "Clinic / Healthcare",
    icon: "🏥",
    description: "Appointment scheduling, fees, insurance, symptoms triage, follow-ups.",
    tags: ["Appointments", "Fees", "Insurance"],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    icon: "🛒",
    description: "Product info, order tracking, returns, shipping, cart recovery.",
    tags: ["Orders", "Returns", "Shipping"],
  },
  {
    id: "trades",
    name: "Trades",
    icon: "🔧",
    description: "Job descriptions, call-out fees, availability, warranties, instant quotes.",
    tags: ["Quotes", "Availability", "Bookings"],
  },
];

export default function IndustrySelector() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const router = useRouter();

  const apply = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/tenants/industry-template`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ industry: selected }),
      });
      setApplied(true);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  if (applied) {
    return (
      <div style={{ minHeight: "100vh", background: "#080814", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#4FFFB0", marginBottom: 8 }}>Template Applied!</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
            Your knowledge base has been pre-loaded with industry-specific FAQs and your agent persona has been configured.
            You can customise it further in the Knowledge Base section.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "#4FFFB0", border: "none", borderRadius: 10, padding: "12px 32px", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080814", padding: "40px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#e8eaf0", marginBottom: 6 }}>
            NEXUS<span style={{ color: "#4FFFB0" }}>AI</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e8eaf0", marginBottom: 8 }}>
            Choose your industry template
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            Pre-load your agent with industry-specific knowledge so it's ready to answer questions from day one.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
          {INDUSTRIES.map((ind) => {
            const active = selected === ind.id;
            return (
              <div
                key={ind.id}
                onClick={() => setSelected(ind.id)}
                style={{
                  background: active ? "rgba(79,255,176,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(79,255,176,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 14,
                  padding: 20,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  outline: active ? "2px solid #4FFFB0" : "none",
                  outlineOffset: 2,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>{ind.icon}</div>
                <div style={{ color: active ? "#4FFFB0" : "#e8eaf0", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  {ind.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                  {ind.description}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ind.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: active ? "rgba(79,255,176,0.12)" : "rgba(255,255,255,0.05)",
                        color: active ? "#4FFFB0" : "rgba(255,255,255,0.4)",
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "11px 24px",
              color: "rgba(255,255,255,0.4)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Skip for now
          </button>
          <button
            onClick={apply}
            disabled={!selected || loading}
            style={{
              background: selected ? "#4FFFB0" : "rgba(79,255,176,0.2)",
              border: "none",
              borderRadius: 10,
              padding: "11px 32px",
              color: selected ? "#000" : "rgba(255,255,255,0.3)",
              fontWeight: 800,
              fontSize: 14,
              cursor: selected ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {loading ? "Applying template…" : "Apply Template →"}
          </button>
        </div>
      </div>
    </div>
  );
}
