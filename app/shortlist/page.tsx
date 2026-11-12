"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Copy, FileText, GripVertical, Inbox, MapPin, RefreshCw, Trash2, X } from "lucide-react";
import { api, endpoints, notifyShortlistChanged } from "@/lib/apiClient";
import { APPLICATION_STATUSES as STATUSES } from "@/lib/constants";
import type { ApplicationStatus as Status, ShortlistItem } from "@/lib/types";
import { STATUS_STYLE, StatusBadge } from "@/components/ShortlistPanel";
import { CompanyLogo, DeadlineChip, EmptyState, ErrorBox, PageHeader, ScoreBar, ScoreRing, Skeleton, toast, useApi } from "@/components/ui";


function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

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
      toast(status === "offer" ? `Offer from ${item.company}! Congratulations 🎉` : `${item.company} moved to ${STATUS_STYLE[status].label}`, status === "rejected" ? "info" : "success");
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

  return (
    <div className="space-y-6">
      <PageHeader title="My shortlist" subtitle={`${active} active application${active === 1 ? "" : "s"} · drag a card to update its status`}>
        <button onClick={() => reload()} className="btn-ghost text-[13px]">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      {/* Pipeline summary */}
      <div className="animate-enter grid grid-cols-5 gap-1 rounded-2xl border border-edge bg-panel p-1">
        {STATUSES.map((st) => {
          const n = items.filter((i) => i.status === st).length;
          return (
            <div key={st} className="rounded-xl px-2 py-2.5 text-center">
              <p className={`text-[20px] font-semibold tabular-nums ${n ? STATUS_STYLE[st].text : "text-faint"}`}>{n}</p>
              <p className="truncate text-[11.5px] text-muted">{STATUS_STYLE[st].label}</p>
            </div>
          );
        })}
      </div>

      {error && <ErrorBox message={error} />}
      {!loading && !error && items.length === 0 && (
        <div className="panel">
          <EmptyState icon={<Inbox size={20} />} title="Your shortlist is empty">
            Ask the assistant: &ldquo;Find jobs in Chennai that match my skills and save the top 3.&rdquo;
          </EmptyState>
        </div>
      )}

      <div className="thin-scroll -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
        {STATUSES.map((st, ci) => {
          const col = items.filter((i) => i.status === st);
          const isOver = overCol === st && dragId != null;
          return (
            <section
              key={st}
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
              style={{ animationDelay: `${ci * 50}ms` }}
              className={`animate-enter flex min-h-[420px] w-[272px] shrink-0 snap-start flex-col rounded-2xl border p-2 transition duration-200 xl:w-auto ${
                isOver ? "border-violet/50 bg-violet/[0.06] shadow-[0_0_0_4px_rgb(139_124_246/0.08)]" : "border-edge bg-panel/60"
              }`}
            >
              <header className="flex items-center justify-between px-2 pb-2.5 pt-1.5">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[st].dot}`} />
                  {STATUS_STYLE[st].label}
                </span>
                <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted">{col.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {loading && !data && <Skeleton className="h-28 w-full rounded-xl" />}
                {col.map((s) => (
                  <article
                    key={s.job_id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(s.job_id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onClick={() => setOpenId(s.job_id)}
                    className={`animate-enter group cursor-grab rounded-xl border border-edge bg-raised p-3 transition duration-200 hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-[0_12px_28px_-16px_rgb(0_0_0/0.9)] active:cursor-grabbing ${
                      dragId === s.job_id ? "rotate-[1.5deg] scale-[0.98] opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <CompanyLogo name={s.company} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium leading-snug">{s.title}</p>
                        <p className="truncate text-[12px] text-muted">{s.company}</p>
                      </div>
                      <GripVertical size={15} className="hidden shrink-0 text-faint transition group-hover:text-muted xl:block" />
                    </div>
                    {s.match_score != null && (
                      <div className="mt-3">
                        <ScoreBar score={s.match_score} wide />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1 text-[11.5px] text-muted">
                        <CalendarDays size={12} /> {fmtDate(s.saved_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {s.cover_note && <FileText size={13} className="text-violet" aria-label="Has cover note" />}
                        <DeadlineChip days={s.days_left} />
                      </div>
                    </div>
                    {/* Touch screens can't drag, so offer a select there. */}
                    <select
                      value={s.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setStatus(s.job_id, e.target.value as Status)}
                      className="field mt-2.5 !rounded-lg !py-1.5 text-[12px] xl:hidden"
                      aria-label="Change status"
                    >
                      {STATUSES.map((x) => (
                        <option key={x} value={x}>
                          {STATUS_STYLE[x].label}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
                {!loading && col.length === 0 && (
                  <div
                    className={`grid flex-1 place-items-center rounded-xl border border-dashed text-[12px] transition ${
                      isOver ? "border-violet/60 text-violet" : "border-edge text-faint"
                    }`}
                  >
                    {isOver ? "Drop here" : "No jobs"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {open && <DetailPanel item={open} onClose={() => setOpenId(null)} onStatus={(st) => setStatus(open.job_id, st)} onRemove={() => remove(open.job_id)} />}
    </div>
  );
}

function DetailPanel({ item, onClose, onStatus, onRemove }: { item: ShortlistItem; onClose: () => void; onStatus: (s: Status) => void; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Rendered into <body> so the backdrop covers the sidebar too.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="animate-drawer relative flex h-full w-full max-w-[460px] flex-col border-l border-edge bg-panel shadow-[-24px_0_64px_-24px_rgb(0_0_0/0.8)]">
        <div className="flex items-start gap-4 border-b border-edge p-6">
          <CompanyLogo name={item.company} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">
              {item.company} · Job #{item.job_id}
            </p>
            <h2 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-[-0.02em]">{item.title}</h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-fg-2">
              <MapPin size={13} className="text-muted" /> {item.city} · {item.work_mode} · {item.job_type}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted transition hover:bg-white/[0.05] hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="thin-scroll flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-edge bg-raised/60 p-3">
              {item.match_score != null ? <ScoreRing score={item.match_score} size={56} /> : <span className="text-muted">–</span>}
              <p className="mt-1.5 text-[11.5px] text-muted">Match</p>
            </div>
            <div className="rounded-xl border border-edge bg-raised/60 p-3">
              <p className="text-[11.5px] text-muted">Apply by</p>
              <p className="mt-1 font-mono text-[13px]">{item.apply_by}</p>
              <div className="mt-2">
                <DeadlineChip days={item.days_left} />
              </div>
            </div>
            <div className="rounded-xl border border-edge bg-raised/60 p-3">
              <p className="text-[11.5px] text-muted">Saved on</p>
              <p className="mt-1 text-[13px]">{fmtDate(item.saved_at)}</p>
              <div className="mt-2">
                <StatusBadge status={item.status} />
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2.5">Status</p>
            <div className="grid grid-cols-5 gap-1 rounded-xl border border-edge bg-raised/50 p-1">
              {STATUSES.map((st) => {
                const on = item.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => onStatus(st)}
                    className={`truncate rounded-lg px-1 py-2 text-[11.5px] transition active:scale-95 ${on ? `${STATUS_STYLE[st].soft} ${STATUS_STYLE[st].text} font-medium` : "text-muted hover:bg-white/[0.04] hover:text-fg"}`}
                  >
                    {STATUS_STYLE[st].label}
                  </button>
                );
              })}
            </div>
          </div>

          {item.reason && (
            <div>
              <p className="eyebrow mb-2">Why it was saved</p>
              <p className="text-[14px] leading-relaxed text-fg-2">{item.reason}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Cover note</p>
              {item.cover_note && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.cover_note ?? "");
                    toast("Cover note copied", "info");
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-fg-2 transition hover:bg-white/[0.05] hover:text-fg"
                >
                  <Copy size={12} /> Copy
                </button>
              )}
            </div>
            {item.cover_note ? (
              <p className="whitespace-pre-wrap rounded-xl border border-edge bg-raised/60 p-4 text-[14px] leading-relaxed text-fg-2">{item.cover_note}</p>
            ) : (
              <p className="rounded-xl border border-dashed border-edge p-4 text-[13px] text-muted">
                No cover note yet. Ask the assistant: &ldquo;Write a cover note for job #{item.job_id} and save it.&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-edge p-5">
          {confirming ? (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="flex-1 text-fg-2">Remove this job from your shortlist?</span>
              <button onClick={() => setConfirming(false)} className="btn-ghost !py-1.5 text-[12.5px]">
                Cancel
              </button>
              <button onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-xl bg-bad px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:brightness-110 active:scale-95">
                <Trash2 size={13} /> Remove
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-[13px] text-muted transition hover:text-bad">
              <Trash2 size={14} /> Remove from shortlist
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
