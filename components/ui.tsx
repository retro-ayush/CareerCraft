"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/** Small fetch hook: loads JSON from an API route and reloads when `key` changes. */
export function useApi<T>(url: string, key: unknown = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json as T);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load, key]);

  return { data, error, loading, reload: load, setData };
}

/** Returns `value` only after it stops changing for `ms` (used for search-as-you-type). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ---------------------------------- Toasts --------------------------------- */

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

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setItems);
    };
  }, []);
  const icon = {
    success: <CheckCircle2 size={16} className="text-good" />,
    error: <XCircle size={16} className="text-bad" />,
    info: <Info size={16} className="text-blue" />,
  };
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 left-5 z-[60] flex flex-col items-end gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className="glass animate-toast pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl py-2.5 pl-3 pr-4 text-[13px] text-fg shadow-[0_16px_40px_-12px_rgb(0_0_0/0.7)]"
        >
          {icon[t.tone]}
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Display pieces ----------------------------- */

const ACRONYMS = new Set(["etl", "sql", "bi", "aws", "gcp", "css", "html", "api", "apis", "ci/cd", "ml", "ai", "ui", "ux", "llm", "nlp", "dsa", "qa"]);
/** "power bi" -> "Power BI", "etl" -> "ETL", "react native" -> "React Native". */
export function prettySkill(skill: string) {
  return skill
    .split(" ")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Animates a number towards `value`. */
export function CountUp({ value, ms = 700, decimals = 0, suffix = "" }: { value: number | undefined; ms?: number; decimals?: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value == null) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  if (value == null) return <span className="skeleton inline-block h-[0.85em] w-[1.6em] align-middle" />;
  return (
    <>
      {shown.toFixed(decimals)}
      {suffix}
    </>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function scoreTone(score: number) {
  if (score >= 75) return { text: "text-good", bar: "bg-good", stroke: "var(--color-good)" };
  if (score >= 50) return { text: "text-warn", bar: "bg-warn", stroke: "var(--color-warn)" };
  return { text: "text-bad", bar: "bg-bad", stroke: "var(--color-bad)" };
}

/** Circular match score indicator. */
export function ScoreRing({ score, size = 52, stroke = 4, muted = false }: { score: number; size?: number; stroke?: number; muted?: boolean }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setP(score));
    return () => cancelAnimationFrame(t);
  }, [score]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title={`Match score ${score} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={muted ? "var(--color-faint)" : tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <span className={`absolute font-mono font-semibold tabular-nums ${muted ? "text-muted" : "text-fg"}`} style={{ fontSize: size * 0.28 }}>
        {score}
      </span>
    </div>
  );
}

/** Linear score bar for compact rows. */
export function ScoreBar({ score, wide = false }: { score: number; wide?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(score));
    return () => cancelAnimationFrame(t);
  }, [score]);
  const tone = scoreTone(score);
  return (
    <div className={`flex items-center gap-2.5 ${wide ? "w-full" : ""}`} title={`Match score ${score} of 100`}>
      <div className={`h-1.5 overflow-hidden rounded-full bg-white/[0.06] ${wide ? "flex-1" : "w-16"}`}>
        <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`} style={{ width: `${w}%` }} />
      </div>
      <span className={`font-mono text-xs font-medium tabular-nums ${tone.text}`}>{score}%</span>
    </div>
  );
}

export function DeadlineChip({ days }: { days: number }) {
  const cls =
    days < 0 ? "border-edge text-muted" : days <= 5 ? "border-bad/25 bg-bad/10 text-bad" : days <= 10 ? "border-warn/25 bg-warn/10 text-warn" : "border-edge text-fg-2";
  const label = days < 0 ? "Closed" : days === 0 ? "Closes today" : `${days}d left`;
  return (
    <span className={`chip font-mono tabular-nums ${cls}`}>
      {days >= 0 && days <= 5 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function SkillChip({ skill, tone = "neutral" }: { skill: string; tone?: "good" | "missing" | "neutral" }) {
  const cls =
    tone === "good"
      ? "border-good/20 bg-good/10 text-good"
      : tone === "missing"
        ? "border-dashed border-warn/35 bg-warn/[0.06] text-warn"
        : "border-edge bg-white/[0.03] text-fg-2";
  return <span className={`chip ${cls}`}>{skill}</span>;
}

/** Deterministic monogram "logo" for a company (no external logos in the data). */
const LOGO_TINTS = [
  "from-violet/30 to-violet/5 text-violet",
  "from-blue/30 to-blue/5 text-blue",
  "from-good/25 to-good/5 text-good",
  "from-plum/30 to-plum/5 text-plum",
  "from-warn/25 to-warn/5 text-warn",
];
export function CompanyLogo({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const idx = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % LOGO_TINTS.length;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border border-edge bg-gradient-to-br font-semibold ${LOGO_TINTS[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  children,
  action,
  icon,
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel animate-enter ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-edge bg-raised text-fg-2">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="animate-enter m-4 flex items-start gap-2.5 rounded-xl border border-bad/20 bg-bad/10 px-3.5 py-3 text-sm text-bad">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="animate-enter flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-edge bg-raised text-muted">{icon}</span>
      <p className="mt-4 text-[15px] font-medium">{title}</p>
      {children && <div className="mt-1.5 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  );
}

/** Toggle button used for filters. */
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition active:scale-95 ${
        active ? "bg-violet/15 text-fg shadow-[inset_0_0_0_1px_rgb(139_124_246/0.45)]" : "text-muted hover:bg-white/[0.04] hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="animate-enter flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
