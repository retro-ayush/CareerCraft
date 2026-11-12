"use client";

import { motion } from "framer-motion";

/** Subtle fade + 6px slide-up on mount (180ms). `index` staggers list items, capped so long lists stay quick. */
export function FadeIn({ children, className, index = 0, as = "div" }: { children: React.ReactNode; className?: string; index?: number; as?: "div" | "li" | "section" }) {
  const Comp = motion[as];
  return (
    <Comp className={className} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}>
      {children}
    </Comp>
  );
}
