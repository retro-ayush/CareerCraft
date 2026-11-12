import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { Toaster } from "@/components/cc/toast";
import { THEME_SCRIPT } from "@/components/cc/ThemeToggle";
import { isSignedIn } from "@/lib/session";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains" });

/**
 * Absolute base for link-preview URLs (crawlers such as WhatsApp need absolute og:image URLs).
 * NEXT_PUBLIC_SITE_URL wins; otherwise Vercel's production domain; otherwise the known deployment.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://careercrafts-two.vercel.app");

const TITLE = "CareerCraft · AI Job Match Agent";
const DESCRIPTION = "Find jobs you're ready for today. CareerCraft matches students to jobs they're eligible for, explains skill gaps and builds a shortlist.";
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "CareerCraft: find jobs you're ready for today", type: "image/png" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "CareerCraft",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "CareerCraft",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07080e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = await isSignedIn();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a saved light theme before first paint (dark is the default). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <AppShell authed={authed}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
