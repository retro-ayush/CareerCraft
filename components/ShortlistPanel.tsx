"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, FileText } from "lucide-react";
import type { ShortlistItem } from "@/lib/shortlist";
import { Card, CompanyLogo, DeadlineChip, ErrorBox, EmptyState, ScoreBar, Skeleton } from "./ui";

export const STATUS_STYLE: Record<string, { dot: string; text: string; soft: string; label: string }> = {
  saved: { dot: "bg-muted", text: "text-fg-2", soft: "bg-white/[0.06]", label: "Saved" },
  applied: { dot: "bg-blue", text: "text-blue", soft: "bg-blue/12", label: "Applied" },
  interviewing: { dot: "bg-plum", text: "text-plum", soft: "bg-plum/12", label: "Interviewing" },
  offer: { dot: "bg-good", text: "text-good", soft: "bg-good/12", label: "Offer" },
  rejected: { dot: "bg-bad", text: "text-bad", soft: "bg-bad/12", label: "Rejected" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.saved;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium ${s.soft} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** Compact live shortlist for the dashboard. Newly saved jobs are highlighted briefly. */
export default function ShortlistPanel({ items, loading, error }: { items: ShortlistItem[] | null; loading: boolean; error: string }) {
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!items) return;
    const ids = items.map((s) => s.job_id);
    if (seen.current) {
      const added = ids.filter((id) => !seen.current!.has(id));
      if (added.length) {
        setFresh(new Set(added));
        setTimeout(() => setFresh(new Set()), 3000);
      }
    }
    seen.current = new Set(ids);
  }, [items]);

  const list = items ?? [];

  return (
    <Card
      icon={<Bookmark size={16} />}
      title="Live shortlist"
      subtitle="Updates when the agent saves a job"
      action={
        <Link href="/shortlist" className="group flex items-center gap-1 whitespace-nowrap text-[12.5px] text-muted transition hover:text-fg">
          Tracker <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      }
    >
      {error && <ErrorBox message={error} />}
      {loading && !items && (
        <div className="space-y-4 px-5 pb-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!error && items && list.length === 0 && (
        <EmptyState icon={<Bookmark size={20} />} title="Nothing saved yet">
          Ask the assistant to find and save your best matches.
        </EmptyState>
      )}
      <ul className="thin-scroll max-h-[300px] space-y-1 overflow-y-auto px-2.5 pb-3">
        {list.map((s) => (
          <li
            key={s.job_id}
            className={`animate-enter rounded-xl px-2.5 py-2.5 transition ${fresh.has(s.job_id) ? "bg-good/10 ring-1 ring-good/30" : "hover:bg-white/[0.03]"}`}
          >
            <div className="flex items-start gap-3">
              <CompanyLogo name={s.company} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{s.title}</p>
                <p className="truncate text-[12px] text-muted">
                  {s.company} · {s.city}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={s.status} />
                  <DeadlineChip days={s.days_left} />
                  {s.cover_note && (
                    <span className="chip border-edge text-fg-2">
                      <FileText size={11} /> Note
                    </span>
                  )}
                  {fresh.has(s.job_id) && <span className="text-[11px] font-medium text-good">Just added</span>}
                </div>
              </div>
              {s.match_score != null && <ScoreBar score={s.match_score} />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
