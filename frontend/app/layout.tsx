import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusAI — AI Chat Agent Platform",
  description: "Deploy an AI agent for your business in 30 minutes",
};

import { PHProvider } from "@/components/providers/PostHogProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
