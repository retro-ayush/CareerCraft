import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CareerCraft · Job Match Agent",
  description: "An AI job search assistant that matches students to eligible jobs, explains skill gaps and builds a shortlist.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
