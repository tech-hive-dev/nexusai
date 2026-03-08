const TESTIMONIALS = [
  {
    name: "Ahmed Al-Rashidi",
    role: "Owner, Al-Rashidi Clinic",
    location: "Dubai, UAE",
    avatar: "A",
    avatarColor: "#6366F1",
    stars: 5,
    quote: "We went from missing 40% of appointment requests to zero. The AI handles Arabic and English seamlessly — even voice messages. Our patients love it.",
    metric: "40% more appointments",
  },
  {
    name: "Sarah Mensah",
    role: "Founder, StyleHaus",
    location: "Lagos, Nigeria",
    avatar: "S",
    avatarColor: "#10B981",
    stars: 5,
    quote: "Abandoned cart recovery alone paid for the subscription 10x over in the first month. Customers get a WhatsApp message with exactly what they left behind. Magic.",
    metric: "10x ROI month one",
  },
  {
    name: "Marco Delgado",
    role: "CEO, Delgado Auto",
    location: "Mexico City, Mexico",
    avatar: "M",
    avatarColor: "#F59E0B",
    stars: 5,
    quote: "Our sales team was spending 6 hours a day answering the same questions. Now NexusAI handles 87% of inquiries and books test drives automatically. Game changer.",
    metric: "87% queries automated",
  },
  {
    name: "Priya Sharma",
    role: "Director, EduFirst Academy",
    location: "Bangalore, India",
    avatar: "P",
    avatarColor: "#EF4444",
    stars: 5,
    quote: "Students ask questions at midnight. The AI answers instantly, collects their contact info, and schedules a call. Our lead conversion jumped from 12% to 34%.",
    metric: "12% → 34% conversion",
  },
  {
    name: "James Okonkwo",
    role: "Owner, Okonkwo Electronics",
    location: "Accra, Ghana",
    avatar: "J",
    avatarColor: "#8B5CF6",
    stars: 5,
    quote: "I was skeptical about AI, but the setup took 25 minutes. The agent knows my entire product catalog, checks live inventory, and sends payment links. It's like having a full-time employee.",
    metric: "Setup in 25 minutes",
  },
  {
    name: "Fatima Al-Zaabi",
    role: "Founder, Bloom Salon",
    location: "Abu Dhabi, UAE",
    avatar: "F",
    avatarColor: "#EC4899",
    stars: 5,
    quote: "The weekly WhatsApp report is brilliant — I never have to log into a dashboard. Every Monday I get a summary of conversations, bookings, and revenue. I feel in control.",
    metric: "100% visibility, 0 logins",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
      {"★★★★★".slice(0, count).split("").map((s, i) => (
        <span key={i} style={{ color: "#F59E0B", fontSize: 16 }}>{s}</span>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section style={{ padding: "100px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", background: "#FFF7ED", color: "#F97316",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600,
            letterSpacing: 0.5, marginBottom: 16,
          }}>CUSTOMER STORIES</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0F172A", margin: "0 0 16px", letterSpacing: -0.8 }}>
            Businesses Across 30 Countries<br />Trust NexusAI
          </h2>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16,
              padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16,
            }}>
              <Stars count={t.stars} />
              <p style={{ fontSize: 15, color: "#1E293B", lineHeight: 1.7, margin: 0, fontStyle: "italic", flex: 1 }}>
                "{t.quote}"
              </p>
              {/* Metric badge */}
              <div style={{
                display: "inline-flex", alignSelf: "flex-start",
                background: "#EEF2FF", color: "#6366F1", borderRadius: 20,
                padding: "4px 12px", fontSize: 12, fontWeight: 600,
              }}>{t.metric}</div>
              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid #E2E8F0" }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", background: t.avatarColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}>{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: "#64748B", fontSize: 12 }}>{t.role}</div>
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
