"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Copy, FileText, Inbox, RefreshCw, Trash2 } from "lucide-react";
import { api, endpoints, notifyShortlistChanged } from "@/lib/apiClient";
import { APPLICATION_STATUSES as STATUSES } from "@/lib/constants";
import type { ApplicationStatus as Status, ShortlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, StatusBadge } from "@/components/ShortlistPanel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DeadlineTag } from "@/components/cc/DeadlineTag";
import { FadeIn } from "@/components/cc/FadeIn";
import { MatchScore } from "@/components/cc/MatchScore";
import { PageHeader } from "@/components/cc/Panel";
import { EmptyState, ErrorState, Skeleton } from "@/components/cc/states";
import { toast } from "@/components/cc/toast";
import { useApi } from "@/components/cc/hooks";
import { fmtDate, plural } from "@/components/cc/format";

/** Application tracker: drag cards between status columns; click a card for details and the cover note. */
export default function ShortlistPage() {
  const { data, error, loading, reload, setData } = useApi<{ shortlist: ShortlistItem[] }>(endpoints.shortlist);
  const items = data?.shortlist ?? [];
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const open = items.find((i) => i.job_id === openId) ?? null;

  /** Optimistically update local state, then sync with the server (rolls back on failure). */
  async function setStatus(job_id: number, status: Status) {
    const prev = data;
    const item = items.find((i) => i.job_id === job_id);
    if (!item || item.status === status) return;
    setData({ shortlist: items.map((i) => (i.job_id === job_id ? { ...i, status } : i)) });
    try {
      await api.shortlist.update(job_id, { status });
      toast(status === "offer" ? `Offer from ${item.company} recorded` : `${item.company} moved to ${STATUS_STYLE[status].label}`, status === "rejected" ? "info" : "success");
    } catch (err) {
      setData(prev); // roll back the optimistic move
      toast(err instanceof Error ? err.message : "Could not update status", "error");
    }
  }

  async function remove(job_id: number) {
    const prev = data;
    setOpenId(null);
    setData({ shortlist: items.filter((i) => i.job_id !== job_id) });
    try {
      await api.shortlist.remove(job_id);
      toast(`Removed job #${job_id}`, "info");
      notifyShortlistChanged();
    } catch (err) {
      setData(prev);
      toast(err instanceof Error ? err.message : "Could not remove", "error");
    }
  }

  const active = items.filter((i) => i.status !== "rejected").length;
  const firstLoad = loading && !data;

  return (
    <div className="space-y-6">
      <PageHeader title="My shortlist" subtitle={`${plural(active, "active application")}. Drag a card, or open it, to update its status.`}>
        <Button onClick={() => reload()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} /> Refresh
        </Button>
      </PageHeader>

      {/* Pipeline summary */}
      <dl className="grid grid-cols-5 divide-x divide-border rounded-panel border border-border bg-surface">
        {STATUSES.map((st) => {
          const n = items.filter((i) => i.status === st).length;
          return (
            <div key={st} className="px-2 py-4 text-center">
              <dd className={cn("font-mono text-[20px] font-bold leading-7 tabular-nums md:text-stat", n ? STATUS_STYLE[st].text : "text-ink-muted")}>{firstLoad ? "–" : n}</dd>
              <dt className="truncate text-[12px] text-ink-muted md:text-small">{STATUS_STYLE[st].label}</dt>
            </div>
          );
        })}
      </dl>

      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-panel border border-border bg-surface">
          <EmptyState
            icon={<Inbox size={20} />}
            title="Your shortlist is empty"
            action={
              <Button asChild>
                <Link href="/jobs">Explore jobs</Link>
              </Button>
            }
          >
            Shortlist roles from your matches, or ask the assistant: &ldquo;Find jobs in Chennai that match my skills and save the top 3.&rdquo;
          </EmptyState>
        </div>
      )}

      {(firstLoad || items.length > 0) && (
        <div className="thin-scroll -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
          {STATUSES.map((st) => {
            const col = items.filter((i) => i.status === st);
            const isOver = overCol === st && dragId != null;
            const S = STATUS_STYLE[st];
            return (
              <section
                key={st}
                aria-label={S.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(st);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId != null) setStatus(dragId, st);
                  setDragId(null);
                  setOverCol(null);
                }}
                className={cn(
                  "flex min-h-[420px] w-[272px] shrink-0 snap-start flex-col rounded-panel border p-2 transition-colors xl:w-auto",
                  isOver ? "border-accent bg-accent-soft" : "border-border bg-surface"
                )}
              >
                <header className="flex items-center justify-between px-2 pb-3 pt-2">
                  <span className={cn("flex items-center gap-2 text-small font-medium", S.text === "text-accent" ? "text-accent" : "text-ink")}>
                    <S.icon size={16} />
                    {S.label}
                  </span>
                  <span className="font-mono text-small tabular-nums text-ink-muted">{col.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2">
                  {firstLoad && <Skeleton className="h-32 w-full rounded-card" />}
                  {col.map((s, i) => (
                    <FadeIn key={s.job_id} index={i}>
                      <article
                        draggable
                        onDragStart={(e) => {
                          setDragId(s.job_id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverCol(null);
                        }}
                        className={cn(
                          "group relative cursor-grab rounded-card border border-border bg-surface p-3 transition-colors hover:bg-surface-2 active:cursor-grabbing",
                          dragId === s.job_id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            {/* The title button opens the details; it stretches over the card so the whole card is clickable. */}
                            <button
                              type="button"
                              onClick={() => setOpenId(s.job_id)}
                              className="text-left text-small font-medium text-ink after:absolute after:inset-0 after:rounded-card after:content-['']"
                            >
                              {s.title}
                            </button>
                            <p className="truncate text-[12px] leading-4 text-ink-muted">{s.company}</p>
                          </div>
                          {s.match_score != null && <MatchScore score={s.match_score} size="sm" className="flex-col items-end gap-0" />}
                        </div>
                        <div className="mt-3">
                          <div className="space-y-1">
                            <DeadlineTag days={s.days_left} className="text-[12px]" />
                            <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                              <CalendarDays size={14} /> Saved {fmtDate(s.saved_at)}
                              {s.cover_note && (
                                <>
                                  <FileText size={14} className="ml-1" /> <span>Note</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {/* Touch screens can't drag, so offer a select there. Sits above the stretched title button. */}
                        <Select
                          value={s.status}
                          onChange={(e) => setStatus(s.job_id, e.target.value as Status)}
                          className="relative z-10 mt-3 h-9 text-small xl:hidden"
                          aria-label={`Status for ${s.title}`}
                        >
                          {STATUSES.map((x) => (
                            <option key={x} value={x}>
                              {STATUS_STYLE[x].label}
                            </option>
                          ))}
                        </Select>
                      </article>
                    </FadeIn>
                  ))}
                  {!firstLoad && col.length === 0 && (
                    <div className={cn("grid flex-1 place-items-center rounded-card border border-dashed text-small", isOver ? "border-accent text-ink" : "border-border text-ink-muted")}>
                      {isOver ? "Drop here" : "No jobs"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={open != null} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <DetailPanel key={open.job_id} item={open} onStatus={(st) => setStatus(open.job_id, st)} onRemove={() => remove(open.job_id)} />}
      </Dialog>
    </div>
  );
}

function DetailPanel({ item, onStatus, onRemove }: { item: ShortlistItem; onStatus: (s: Status) => void; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <DialogContent side="right">
      <div className="border-b border-border p-6 pr-16">
        <p className="text-small text-ink-muted">
          {item.company} · Job #{item.job_id}
        </p>
        <DialogTitle className="mt-1">{item.title}</DialogTitle>
        <DialogDescription className="mt-2">
          {item.city} · {item.work_mode} · {item.job_type}
        </DialogDescription>
      </div>

      <div className="thin-scroll flex-1 space-y-6 overflow-y-auto p-6">
        <dl className="grid grid-cols-3 gap-3">
          <div className="rounded-card border border-border p-3">
            <dt className="sr-only">Match score</dt>
            <dd>{item.match_score != null ? <MatchScore score={item.match_score} className="items-start" /> : <span className="text-small text-ink-muted">Not scored</span>}</dd>
          </div>
          <div className="rounded-card border border-border p-3">
            <dt className="text-[12px] text-ink-muted">Apply by</dt>
            <dd className="mt-1 font-mono text-small text-ink">{item.apply_by}</dd>
            <dd className="mt-1">
              <DeadlineTag days={item.days_left} className="text-[12px]" />
            </dd>
          </div>
          <div className="rounded-card border border-border p-3">
            <dt className="text-[12px] text-ink-muted">Saved on</dt>
            <dd className="mt-1 text-small text-ink">{fmtDate(item.saved_at)}</dd>
            <dd className="mt-2">
              <StatusBadge status={item.status} />
            </dd>
          </div>
        </dl>

        <div>
          <h3 id="status-label" className="mb-3 font-sans text-small font-medium text-ink">
            Status
          </h3>
          <div role="radiogroup" aria-labelledby="status-label" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUSES.map((st) => {
              const on = item.status === st;
              const S = STATUS_STYLE[st];
              return (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onStatus(st)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-card border px-3 text-small transition-colors",
                    on ? "border-accent bg-accent-soft font-medium text-ink" : "border-border text-ink-muted hover:bg-surface-2 hover:text-ink"
                  )}
                >
                  <S.icon size={16} />
                  {S.label}
                </button>
              );
            })}
          </div>
        </div>

        {item.reason && (
          <div>
            <h3 className="mb-2 font-sans text-small font-medium text-ink">Why it was saved</h3>
            <p className="text-body text-ink-muted">{item.reason}</p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-sans text-small font-medium text-ink">Cover note</h3>
            {item.cover_note && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(item.cover_note ?? "");
                  toast("Cover note copied", "info");
                }}
              >
                <Copy /> Copy
              </Button>
            )}
          </div>
          {item.cover_note ? (
            <p className="whitespace-pre-wrap rounded-card border border-border bg-surface-2 p-4 text-body text-ink">{item.cover_note}</p>
          ) : (
            <p className="rounded-card border border-dashed border-border p-4 text-small text-ink-muted">
              No cover note yet. Ask the assistant: &ldquo;Write a cover note for job #{item.job_id} and save it.&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-small text-ink">Remove this job from your shortlist?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={onRemove}>
              <Trash2 /> Remove
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 /> Remove from shortlist
          </Button>
        )}
      </div>
    </DialogContent>
  );
}
