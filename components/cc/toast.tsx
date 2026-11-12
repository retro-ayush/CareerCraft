"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { id: number; text: string; tone: "success" | "error" | "info" };
let toastListeners: ((t: Toast[]) => void)[] = [];
let toasts: Toast[] = [];
let nextId = 1;

/** Show a notification in the bottom-right corner. Callable from anywhere. */
export function toast(text: string, tone: Toast["tone"] = "success") {
  const t = { id: nextId++, text, tone };
  toasts = [...toasts.slice(-2), t];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l(toasts));
  }, 3600);
}

const ICONS = {
  success: <CircleCheck size={20} className="shrink-0 text-accent" />,
  error: <CircleX size={20} className="shrink-0 text-danger" />,
  info: <Info size={20} className="shrink-0 text-ink-muted" />,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setItems);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-card border border-border-strong bg-surface-2 px-4 py-3 text-small text-ink"
          >
            {ICONS[t.tone]}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
