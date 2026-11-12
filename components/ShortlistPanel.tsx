"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, CircleX, FileText, MessagesSquare, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShortlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeadlineTag } from "./cc/DeadlineTag";
import { MatchScore } from "./cc/MatchScore";
import { Panel } from "./cc/Panel";
import { EmptyState, ErrorState, Skeleton } from "./cc/states";

/** Each status has its own icon and label, so it is never told apart by colour alone. Only "offer" uses the accent. */
export const STATUS_STYLE: Record<string, { label: string; icon: LucideIcon; text: string }> = {
  saved: { label: "Saved", icon: Bookmark, text: "text-ink-muted" },
  applied: { label: "Applied", icon: Send, text: "text-ink" },
  interviewing: { label: "Interviewing", icon: MessagesSquare, text: "text-ink" },
  offer: { label: "Offer", icon: BadgeCheck, text: "text-accent" },
  rejected: { label: "Rejected", icon: CircleX, text: "text-ink-muted" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.saved;
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2 text-[12px] font-medium", s.text)}>
      <s.icon size={14} />
      {s.label}
    </span>
  );
}

/** Compact live shortlist for the dashboard. Newly saved jobs are highlighted briefly. */
export default function ShortlistPanel({ items, loading, error, onRetry }: { items: ShortlistItem[] | null; loading: boolean; error: string; onRetry?: () => void }) {
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
    <Panel
      icon={<Bookmark size={20} />}
      title="Shortlist"
      subtitle="Updates when the assistant saves a job"
      action={
        <Link href="/shortlist" className="flex items-center gap-1 whitespace-nowrap rounded-card py-1 text-small text-ink-muted transition-colors hover:text-ink">
          Tracker <ArrowRight size={16} />
        </Link>
      }
    >
      {error && <ErrorState message={error} onRetry={onRetry} className="mx-5 mb-5" />}
      {loading && !items && (
        <div className="space-y-4 px-5 pb-5" role="status" aria-label="Loading shortlist">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {!error && items && list.length === 0 && (
        <EmptyState
          icon={<Bookmark size={20} />}
          title="Nothing saved yet"
          action={
            <Button asChild size="sm">
              <Link href="/jobs">Explore jobs</Link>
            </Button>
          }
        >
          Shortlist roles from your matches, or ask the assistant to save your best ones.
        </EmptyState>
      )}
      {list.length > 0 && (
        <ul className="thin-scroll max-h-[320px] space-y-1 overflow-y-auto px-2 pb-3">
          {list.map((s) => (
            <li key={s.job_id} className={cn("rounded-card px-3 py-3 transition-colors", fresh.has(s.job_id) ? "bg-accent-soft" : "hover:bg-surface-2")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small font-medium text-ink">{s.title}</p>
                  <p className="truncate text-small text-ink-muted">
                    {s.company} · {s.city}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StatusBadge status={s.status} />
                    <DeadlineTag days={s.days_left} className="text-[12px]" />
                    {s.cover_note && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                        <FileText size={14} /> Note
                      </span>
                    )}
                    {fresh.has(s.job_id) && <span className="text-[12px] font-medium text-ink">Just added</span>}
                  </div>
                </div>
                {s.match_score != null && <MatchScore score={s.match_score} size="sm" className="flex-col items-end gap-0" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
