"use client";

import { useApi } from "./ui";

type Insights = { open_jobs: number; eligible_jobs: number; strong_matches: number; closing_this_week: number };

/** Four headline numbers for the student. Reloads when the agent changes data. */
export default function StatsStrip({ refreshKey }: { refreshKey: number }) {
  const { data, error } = useApi<Insights>("/api/insights", refreshKey);
  if (error) return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;

  const stats = [
    { label: "Open jobs", value: data?.open_jobs, hint: "deadline not passed" },
    { label: "You are eligible for", value: data?.eligible_jobs, hint: "CGPA + branch rule" },
    { label: "Strong matches", value: data?.strong_matches, hint: "all required skills" },
    { label: "Good fits closing ≤ 7 days", value: data?.closing_this_week, hint: "score ≥ 50", warn: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">{s.label}</p>
          <p className={`text-2xl font-semibold tabular-nums ${s.warn && (s.value ?? 0) > 0 ? "text-rose-600" : ""}`}>
            {s.value ?? "–"}
          </p>
          <p className="text-[11px] text-slate-400">{s.hint}</p>
        </div>
      ))}
    </div>
  );
}
