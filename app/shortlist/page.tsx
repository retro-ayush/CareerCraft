"use client";

import { useState } from "react";
import type { ShortlistItem } from "@/lib/shortlist";
import { StatusBadge } from "@/components/ShortlistPanel";
import { DeadlineChip, ErrorBox, ScoreBar, useApi } from "@/components/ui";

const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;

/** Application tracker: status pipeline, deadlines and saved cover notes. */
export default function ShortlistPage() {
  const [refresh, setRefresh] = useState(0);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const { data, error, loading } = useApi<{ shortlist: ShortlistItem[] }>("/api/shortlist", refresh);
  const items = data?.shortlist ?? [];

  async function call(method: "PATCH" | "DELETE", body?: object, query = "") {
    const res = await fetch(`/api/shortlist${query}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) alert((await res.json()).error ?? "Failed");
    setRefresh((r) => r + 1);
  }

  const counts = STATUSES.map((s) => ({ s, n: items.filter((i) => i.status === s).length }));

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2">
        {counts.map(({ s, n }) => (
          <div key={s} className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-2xl font-semibold tabular-nums">{n}</p>
            <p className="text-xs capitalize text-slate-500">{s}</p>
          </div>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Your shortlist is empty. Ask the agent: “Find jobs in Chennai that match my skills and save the top 3.”
        </p>
      )}

      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.job_id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-slate-500">
                  #{s.job_id} · {s.company} · {s.city} · {s.work_mode} · {s.job_type}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <StatusBadge status={s.status} />
                  <DeadlineChip days={s.days_left} />
                  <span className="text-xs text-slate-400">apply by {s.apply_by}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.match_score != null && <ScoreBar score={s.match_score} />}
                <select
                  value={s.status}
                  onChange={(e) => call("PATCH", { job_id: s.job_id, status: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm capitalize"
                >
                  {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
                <button
                  onClick={() => confirm("Remove from shortlist?") && call("DELETE", undefined, `?job_id=${s.job_id}`)}
                  className="text-xs text-slate-400 hover:text-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>
            {s.reason && <p className="mt-2 text-sm text-slate-600">Why: {s.reason}</p>}
            {s.cover_note ? (
              <div className="mt-2">
                <button onClick={() => setOpenNote(openNote === s.job_id ? null : s.job_id)} className="text-xs text-indigo-600 hover:underline">
                  {openNote === s.job_id ? "Hide cover note" : "Show cover note"}
                </button>
                {openNote === s.job_id && (
                  <div className="mt-1 space-y-2">
                    <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{s.cover_note}</p>
                    <button onClick={() => navigator.clipboard.writeText(s.cover_note ?? "")} className="text-xs text-slate-500 hover:text-slate-900">
                      Copy
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No cover note yet. Ask the agent: “Write a cover note for job #{s.job_id} and save it.”</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
