import type { Metadata } from "next";
import { AppProvider } from "@/context/AppContext";
import { GlassProvider } from "@/context/GlassContext";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AapdaWatch AI — Disaster Intelligence Platform",
  description:
    "AI-Powered Disaster Information Classification and Incident Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <AppProvider>
          <GlassProvider>
            <AppShell>{children}</AppShell>
          </GlassProvider>
        </AppProvider>
      </body>
    </html>
  );
}
