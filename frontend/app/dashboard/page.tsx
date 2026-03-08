"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Overview from "@/components/dashboard/Overview";
import Conversations from "@/components/dashboard/Conversations";
import Leads from "@/components/dashboard/Leads";
import KnowledgeBase from "@/components/dashboard/KnowledgeBase";
import Channels from "@/components/dashboard/Channels";
import Settings from "@/components/dashboard/Settings";
import EmbedCode from "@/components/dashboard/EmbedCode";
import Broadcasts from "@/components/dashboard/Broadcasts";
import Templates from "@/components/dashboard/Templates";
import Billing from "@/components/dashboard/Billing";
import CartRecovery from "@/components/dashboard/CartRecovery";
import Integrations from "@/components/dashboard/Integrations";

const VIEWS: Record<string, React.ComponentType> = {
  overview: Overview,
  conversations: Conversations,
  leads: Leads,
  knowledge: KnowledgeBase,
  channels: Channels,
  settings: Settings,
  embed: EmbedCode,
  broadcasts: Broadcasts,
  "cart-recovery": CartRecovery,
  templates: Templates,
  billing: Billing,
  integrations: Integrations,
};

export default function Dashboard() {
  const [view, setView] = useState("overview");
  const [tenant, setTenant] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("nexusai_token");
    if (!token) { router.push("/login"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) {
          setTenant(data.tenant);
          if (!data.tenant.onboarding_completed) {
            router.push("/onboarding");
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, []);

  const ActiveView = VIEWS[view] || Overview;

  if (!tenant) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080814]">
        <div className="text-center">
          <div className="text-3xl mb-3">◆</div>
          <div className="text-[#4FFFB0] text-sm font-mono">Loading NexusAI...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080814]">
      <Sidebar activeView={view} setView={setView} tenant={tenant} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <ActiveView />
        </div>
      </main>
    </div>
  );
}
