"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.95)" : "#fff",
      backdropFilter: "blur(12px)",
      borderBottom: scrolled ? "1px solid #E2E8F0" : "1px solid transparent",
      transition: "all 0.2s",
      padding: "0 24px",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", height: 64, gap: 8 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginRight: 32 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366F1, #10B981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16,
          }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", letterSpacing: -0.5 }}>
            Nexus<span style={{ color: "#6366F1" }}>AI</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }} className="desktop-nav">
          {[["Features", "#features"], ["Pricing", "#pricing"], ["Integrations", "#integrations"], ["For Agencies", "#agencies"]].map(([label, href]) => (
            <a key={label} href={href} style={{
              padding: "6px 14px", borderRadius: 8, color: "#475569", fontSize: 14, fontWeight: 500,
              textDecoration: "none", transition: "all 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#0F172A") && (e.currentTarget.style.background = "#F1F5F9")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569") && (e.currentTarget.style.background = "transparent")}
            >{label}</a>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/login" style={{
            padding: "8px 16px", borderRadius: 8, color: "#475569", fontSize: 14,
            fontWeight: 500, textDecoration: "none", border: "1px solid #E2E8F0",
            transition: "all 0.15s",
          }}>Login</Link>
          <Link href="/login" style={{
            padding: "8px 20px", borderRadius: 8,
            background: "linear-gradient(135deg, #6366F1, #4F46E5)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            textDecoration: "none", boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            transition: "all 0.15s",
          }}>Start Free Trial →</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: "none", background: "none", border: "none", cursor: "pointer",
            padding: 8, color: "#475569",
          }}
          className="mobile-menu-btn"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          borderTop: "1px solid #E2E8F0", padding: "12px 24px 20px",
          display: "flex", flexDirection: "column", gap: 4, background: "#fff",
        }}>
          {[["Features", "#features"], ["Pricing", "#pricing"], ["Integrations", "#integrations"], ["For Agencies", "#agencies"]].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{
              padding: "10px 12px", color: "#475569", fontSize: 15, textDecoration: "none",
              borderRadius: 8, fontWeight: 500,
            }}>{label}</a>
          ))}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/login" style={{ padding: "10px 16px", textAlign: "center", borderRadius: 8, border: "1px solid #E2E8F0", color: "#475569", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Login</Link>
            <Link href="/login" style={{ padding: "10px 16px", textAlign: "center", borderRadius: 8, background: "#6366F1", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Start Free Trial →</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
