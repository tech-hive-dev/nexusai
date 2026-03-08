"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ChannelStrip from "@/components/landing/ChannelStrip";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Integrations from "@/components/landing/Integrations";
import Pricing from "@/components/landing/Pricing";
import ResellerBanner from "@/components/landing/ResellerBanner";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("nexusai_token");
    if (token) {
      router.push("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #10B981)" }} />
      </div>
    );
  }

  return (
    <main style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Navbar />
      <Hero />
      <ChannelStrip />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Integrations />
      <Pricing />
      <ResellerBanner />
      <FinalCTA />
      <Footer />
    </main>
  );
}
