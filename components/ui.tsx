"use client";

import { useCallback, useEffect, useState } from "react";

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

  return { data, error, loading, reload: load };
}

export function scoreColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${scoreColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function DeadlineChip({ days }: { days: number }) {
  const cls =
    days < 0 ? "bg-slate-100 text-slate-500" : days <= 5 ? "bg-rose-50 text-rose-700" : days <= 10 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  const label = days < 0 ? "Closed" : days === 0 ? "Closes today" : `${days}d left`;
  return <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function SkillChip({ skill, tone = "neutral" }: { skill: string; tone?: "good" | "missing" | "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "missing"
        ? "bg-rose-50 text-rose-700 border-rose-200 border-dashed"
        : "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${cls}`}>{skill}</span>;
}

export function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <p className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>;
}
