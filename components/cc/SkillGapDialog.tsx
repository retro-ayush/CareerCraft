"use client";

import Link from "next/link";
import { Ban, MessageSquareText } from "lucide-react";
import type { JobMatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DeadlineTag } from "./DeadlineTag";
import { MatchScore } from "./MatchScore";
import { SkillChip } from "./SkillChip";
import { prettySkill } from "./format";

/** The skill gap view for one job: what the student has, what is missing, and how the score is built. */
export function SkillGapDialog({ job: j, open, onOpenChange, preview = false }: { job: JobMatch; open: boolean; onOpenChange: (open: boolean) => void; preview?: boolean }) {
  const askHref = `/?ask=${encodeURIComponent(
    j.missing_required.length
      ? `How do I close my skill gaps for job #${j.job_id} (${j.title})? I'm missing ${j.missing_required.map(prettySkill).join(", ")}.`
      : `Am I ready to apply for job #${j.job_id} (${j.title})?`
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6 pr-16">
          <div className="min-w-0">
            <DialogTitle>{j.title}</DialogTitle>
            <DialogDescription className="mt-1">
              {j.company} · {j.city} · {j.work_mode}
            </DialogDescription>
          </div>
          <MatchScore score={j.match_score} muted={!j.eligible} />
        </div>

        <div className="thin-scroll space-y-6 overflow-y-auto p-6">
          {!j.eligible && (
            <p className="flex items-start gap-2 rounded-card border border-border bg-surface-2 p-3 text-small text-ink">
              <Ban size={20} className="shrink-0 text-ink-muted" />
              <span>
                <span className="font-medium">Not eligible yet.</span> {j.ineligible_reasons.join("; ")}
              </span>
            </p>
          )}

          <Section title="Required skills to add" count={j.missing_required.length}>
            {j.missing_required.length ? (
              <Chips skills={j.missing_required} variant="gap" />
            ) : (
              <p className="text-small text-ink-muted">You have every required skill for this role.</p>
            )}
          </Section>

          {j.missing_nice_to_have.length > 0 && (
            <Section title="Nice-to-have skills to add" count={j.missing_nice_to_have.length}>
              <Chips skills={j.missing_nice_to_have} variant="gap" />
            </Section>
          )}

          <Section title="Skills you have" count={j.matched_skills.length}>
            {j.matched_skills.length ? <Chips skills={j.matched_skills} variant="have" /> : <p className="text-small text-ink-muted">None of the listed skills yet.</p>}
          </Section>

          <Section title="How the score is built">
            <div className="space-y-3">
              <Bar label="Required skills" value={j.breakdown.required} max={70} />
              <Bar label="Nice-to-have" value={j.breakdown.nice_to_have} max={20} />
              <Bar label="Preferred city" value={j.breakdown.location} max={10} />
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-2 text-small text-ink-muted">
            <span>
              Apply by <span className="font-mono text-ink">{j.apply_by}</span>
            </span>
            <DeadlineTag days={j.days_left} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {!preview && (
            <Button asChild>
              <Link href={askHref}>
                <MessageSquareText /> Ask the assistant
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 font-sans text-small font-medium text-ink">
        {title}
        {count != null && <span className="font-mono text-ink-muted">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

function Chips({ skills, variant }: { skills: string[]; variant: "have" | "gap" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <SkillChip key={s} skill={s} variant={variant} />
      ))}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-small">
      <span className="text-ink-muted">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right font-mono tabular-nums text-ink">
        {Math.round(value)}
        <span className="text-ink-muted">/{max}</span>
      </span>
    </div>
  );
}
