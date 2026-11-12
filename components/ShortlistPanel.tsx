"use client";

import Link from "next/link";
import type { ShortlistItem } from "@/lib/shortlist";
import { Card, DeadlineChip, ErrorBox, ScoreBar, useApi } from "./ui";

const STATUS_STYLE: Record<string, string> = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-50 text-blue-700",
  interviewing: "bg-violet-50 text-violet-700",
  offer: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${STATUS_STYLE[status] ?? ""}`}>{status}</span>;
}

/** Compact live shortlist next to the chat. */
export default function ShortlistPanel({ refreshKey }: { refreshKey: number }) {
  const { data, error, loading } = useApi<{ shortlist: ShortlistItem[] }>("/api/shortlist", refreshKey);
  const items = data?.shortlist ?? [];

  return (
    <Card
      title="My Shortlist"
      subtitle="Live from Supabase. Updates when the agent saves a job."
      action={<Link href="/shortlist" className="text-xs text-indigo-600 hover:underline">Open tracker →</Link>}
    >
      {error && <ErrorBox message={error} />}
      {!error && !loading && items.length === 0 && (
        <p className="p-4 text-sm text-slate-500">No jobs saved yet. Ask the agent to find and save your best matches.</p>
      )}
      <ul className="divide-y divide-slate-100">
        {items.map((s) => (
          <li key={s.job_id} className="space-y-1 px-4 py-2.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-slate-500">#{s.job_id} · {s.company} · {s.city}</p>
              </div>
              {s.match_score != null && <ScoreBar score={s.match_score} />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={s.status} />
              <DeadlineChip days={s.days_left} />
              {s.cover_note && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">cover note</span>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
