import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { Toaster } from "@/components/ui";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "CareerCraft · AI Job Match Agent",
  description: "An AI job search assistant that matches students to eligible jobs, explains skill gaps and builds a shortlist.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07080e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
