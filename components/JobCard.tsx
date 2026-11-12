"use client";

import { useState } from "react";
import { Ban, Bookmark, BookmarkCheck, Briefcase, ChevronDown, Loader2, MapPin, Wallet } from "lucide-react";
import type { JobMatch } from "@/lib/careermatch";
import { CompanyLogo, DeadlineChip, ScoreRing, SkillChip, toast } from "./ui";

/** Saves a job to the shortlist through the existing API. Returns true on success. */
export async function saveJob(job_id: number) {
  const res = await fetch("/api/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok) {
    toast(`Saved job #${job_id} to your shortlist`);
    window.dispatchEvent(new Event("shortlist:changed"));
  } else toast(json.error ?? "Could not save", "error");
  return res.ok;
}

export default function JobCard({ job: j, saved, onSaved, index = 0 }: { job: JobMatch; saved: boolean; onSaved?: () => void; index?: number }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await saveJob(j.job_id);
    setSaving(false);
    if (ok) onSaved?.();
  }

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      className={`panel animate-enter group flex flex-col p-5 transition duration-300 hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-[0_20px_40px_-24px_rgb(0_0_0/0.8)] ${
        !j.eligible ? "opacity-60 hover:opacity-90" : ""
      } ${open ? "border-violet/30" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <CompanyLogo name={j.company} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-muted">{j.company}</p>
          <h3 className="mt-0.5 truncate text-[15.5px] font-semibold tracking-[-0.01em]">{j.title}</h3>
        </div>
        <ScoreRing score={j.match_score} muted={!j.eligible} />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-2">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-muted" /> {j.city} · {j.work_mode}
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase size={13} className="text-muted" /> {j.job_type}
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet size={13} className="text-muted" /> {j.salary_lpa}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {j.matched_skills.map((s) => (
          <SkillChip key={s} skill={s} tone="good" />
        ))}
        {j.missing_required.map((s) => (
          <SkillChip key={s} skill={s} tone="missing" />
        ))}
      </div>

      {j.eligible ? (
        <p className={`mt-3 text-[12.5px] ${j.missing_required.length ? "text-warn" : "text-good"}`}>
          {j.missing_required.length ? `Missing ${j.missing_required.length} required skill${j.missing_required.length > 1 ? "s" : ""}` : "You meet every required skill"}
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-bad">
          <Ban size={13} className="mt-0.5 shrink-0" /> Not eligible: {j.ineligible_reasons.join("; ")}
        </p>
      )}

      {/* Expandable breakdown */}
      <div className={`grid transition-all duration-300 ${open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="space-y-2.5 rounded-xl border border-edge bg-raised/60 p-4">
            <p className="eyebrow">Score breakdown</p>
            <Breakdown label="Required skills" value={j.breakdown.required} max={70} color="bg-violet" />
            <Breakdown label="Nice-to-have" value={j.breakdown.nice_to_have} max={20} color="bg-blue" />
            <Breakdown label="Preferred city" value={j.breakdown.location} max={10} color="bg-good" />
            {j.missing_nice_to_have.length > 0 && (
              <div className="pt-1.5">
                <p className="mb-1.5 text-[12px] text-muted">Bonus skills you could add</p>
                <div className="flex flex-wrap gap-1.5">
                  {j.missing_nice_to_have.map((s) => (
                    <SkillChip key={s} skill={`+ ${s}`} />
                  ))}
                </div>
              </div>
            )}
            <p className="pt-1 text-[12px] text-muted">
              Apply by <span className="font-mono text-fg-2">{j.apply_by}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <DeadlineChip days={j.days_left} />
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="btn-ghost !px-3 !py-1.5 text-[12.5px]">
            {open ? "Hide" : "Details"}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {j.eligible &&
            (saved ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-good/20 bg-good/10 px-3 py-1.5 text-[12.5px] text-good">
                <BookmarkCheck size={14} /> Saved
              </span>
            ) : (
              <button onClick={save} disabled={saving} className="btn !px-3 !py-1.5 text-[12.5px]">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                Save
              </button>
            ))}
        </div>
      </div>
    </article>
  );
}

function Breakdown({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-3 text-[12.5px]">
      <span className="w-28 shrink-0 text-fg-2">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-[width] duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-mono tabular-nums text-fg">
        {Math.round(value)}
        <span className="text-muted">/{max}</span>
      </span>
    </div>
  );
}
