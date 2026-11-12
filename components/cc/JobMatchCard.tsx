"use client";

import { useState } from "react";
import { Ban, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { api, notifyShortlistChanged } from "@/lib/apiClient";
import type { JobMatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeadlineTag } from "./DeadlineTag";
import { MatchScore } from "./MatchScore";
import { SkillChip } from "./SkillChip";
import { SkillGapDialog } from "./SkillGapDialog";
import { toast } from "./toast";

/** Saves a job to the shortlist through the existing API. Returns true on success. */
export async function saveJob(job_id: number): Promise<boolean> {
  try {
    await api.shortlist.add(job_id);
    toast(`Saved job #${job_id} to your shortlist`);
    notifyShortlistChanged();
    return true;
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save", "error");
    return false;
  }
}

/**
 * One scored job: role, company · location · mode, match score, skill chips, then Shortlist + See skill gaps.
 * `onShortlist` overrides the save action (the landing page preview uses it to point visitors at sign-in).
 */
export function JobMatchCard({
  job: j,
  saved = false,
  onSaved,
  onShortlist,
  preview = false,
  className,
}: {
  job: JobMatch;
  saved?: boolean;
  onSaved?: () => void;
  onShortlist?: () => void;
  preview?: boolean;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [gapsOpen, setGapsOpen] = useState(false);

  const listed = j.matched_skills.length + j.missing_required.length + j.missing_nice_to_have.length;

  async function shortlist() {
    if (onShortlist) return onShortlist();
    setSaving(true);
    const ok = await saveJob(j.job_id);
    setSaving(false);
    if (ok) onSaved?.();
  }

  return (
    <article className={cn("flex flex-col gap-4 rounded-card border border-border bg-surface p-5 transition-colors hover:bg-surface-2", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-h2 font-semibold text-ink">{j.title}</h3>
          <p className="mt-1 text-small text-ink-muted">
            {j.company} · {j.city} · {j.work_mode}
          </p>
        </div>
        <MatchScore score={j.match_score} muted={!j.eligible} />
      </div>

      {(j.matched_skills.length > 0 || j.missing_required.length > 0) && (
        <ul className="flex flex-wrap gap-2" aria-label="Skills">
          {j.matched_skills.map((s) => (
            <li key={s}>
              <SkillChip skill={s} variant="have" />
            </li>
          ))}
          {j.missing_required.map((s) => (
            <li key={s}>
              <SkillChip skill={s} variant="gap" />
            </li>
          ))}
        </ul>
      )}

      {j.eligible ? (
        <p className="text-small text-ink">
          You match {j.matched_skills.length} of {listed} listed skills
          {j.missing_required.length === 0 && <span className="text-ink-muted">, including every required one</span>}
        </p>
      ) : (
        <p className="flex items-start gap-2 text-small text-ink-muted">
          <Ban size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium text-ink">Not eligible:</span> {j.ineligible_reasons.join("; ")}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-muted">
        <span>{j.job_type}</span>
        <span className="font-mono">{j.salary_lpa}</span>
        <DeadlineTag days={j.days_left} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {j.eligible &&
          (saved ? (
            <Button disabled>
              <BookmarkCheck /> Shortlisted
            </Button>
          ) : (
            <Button variant="primary" onClick={shortlist} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Bookmark />}
              {saving ? "Saving" : "Shortlist"}
            </Button>
          ))}
        <Button onClick={() => setGapsOpen(true)}>See skill gaps</Button>
      </div>

      <SkillGapDialog job={j} open={gapsOpen} onOpenChange={setGapsOpen} preview={preview} />
    </article>
  );
}
