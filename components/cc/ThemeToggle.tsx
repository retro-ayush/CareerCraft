"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const KEY = "cc-theme";

/** Inline script for <head>: applies a saved light theme before first paint. Dark is the default. */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

type Theme = "dark" | "light";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function setTheme(theme: Theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
}

/** Icon button that flips between dark and light. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn("grid size-10 place-items-center rounded-card text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink", className)}
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

/** Two-option segmented control for the settings page. */
export function ThemeSelect() {
  const theme = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-card border border-border bg-surface p-1">
      {(["dark", "light"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => setTheme(t)}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-[6px] px-3 text-small transition-colors",
            theme === t ? "bg-surface-2 font-medium text-ink" : "text-ink-muted hover:text-ink"
          )}
        >
          {t === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          {t === "dark" ? "Dark" : "Light"}
        </button>
      ))}
    </div>
  );
}
