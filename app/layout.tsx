import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { Toaster } from "@/components/cc/toast";
import { THEME_SCRIPT } from "@/components/cc/ThemeToggle";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "CareerCraft · AI Job Match Agent",
  description: "An AI job search assistant that matches students to eligible jobs, explains skill gaps and builds a shortlist.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07080e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a saved light theme before first paint (dark is the default). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
