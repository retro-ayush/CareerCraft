"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BarChart3, Check, CircleCheck, CircleDashed, MapPin, Pencil, Plus, Sparkles, Target } from "lucide-react";
import { api, endpoints } from "@/lib/apiClient";
import type { Insights, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { FadeIn } from "@/components/cc/FadeIn";
import { PageHeader, Panel } from "@/components/cc/Panel";
import { SkillChip } from "@/components/cc/SkillChip";
import { EmptyState, ErrorState, Skeleton } from "@/components/cc/states";
import { toast } from "@/components/cc/toast";
import { useApi } from "@/components/cc/hooks";
import { initials, plural, prettySkill } from "@/components/cc/format";

/** Profile: identity, academics, editable skills and cities, completion, skill gap analysis. */
export default function ProfilePage() {
  const [refresh, setRefresh] = useState(0);
  const profile = useApi<{ profile: Profile }>(endpoints.profile, refresh);
  const insights = useApi<Insights>(endpoints.insights, refresh);
  const [newSkill, setNewSkill] = useState("");
  const [cities, setCities] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const p = profile.data?.profile;
  const plan = insights.data?.skill_plan.top_skills_to_learn ?? [];
  const maxRequired = Math.max(1, ...plan.map((s) => s.required_in_jobs + s.nice_to_have_in_jobs));

  const checks = p
    ? [
        { ok: Boolean(p.name), label: "Name" },
        { ok: Boolean(p.degree && p.branch), label: "Degree and branch" },
        { ok: p.cgpa > 0, label: "CGPA" },
        { ok: p.skills.length >= 5, label: "At least 5 skills" },
        { ok: p.preferred_cities.length > 0, label: "Preferred locations" },
        { ok: Boolean(p.interests), label: "Interests" },
      ]
    : [];
  const completion = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : 0;

  async function patch(fields: Parameters<typeof api.profile.update>[0], success?: string) {
    setSaving(true);
    try {
      await api.profile.update(fields);
      if (success) toast(success);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setSaving(false);
      setRefresh((r) => r + 1);
    }
  }

  function addSkill(skill: string) {
    const s = skill.trim();
    if (!p || !s) return;
    if (p.skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      toast(`${s} is already on your profile`, "info");
      return;
    }
    patch({ skills: [...p.skills, s] }, `Added ${s}. Every job has been re-scored.`);
    setNewSkill("");
  }

  const stats = [
    { label: "CGPA", value: p ? String(p.cgpa) : undefined },
    { label: "Profile complete", value: p ? `${completion}%` : undefined },
    { label: "Strong matches", value: insights.data ? String(insights.data.strong_matches) : undefined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="Your academic details and skills drive every match score." />
      {profile.error && <ErrorState message={profile.error} onRetry={profile.reload} />}

      {/* Identity + key numbers */}
      <section className="flex flex-col gap-6 rounded-panel border border-border bg-surface p-5 md:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          {p ? (
            <span className="grid size-16 shrink-0 place-items-center rounded-panel border border-border bg-surface-2 font-display text-h2 font-bold text-ink">{initials(p.name)}</span>
          ) : (
            <Skeleton className="size-16 rounded-panel" />
          )}
          <div className="min-w-0">
            {p ? (
              <>
                <h2 className="text-h2 font-semibold text-ink">{p.name}</h2>
                <p className="mt-1 text-small text-ink-muted">
                  {p.degree} · {p.branch} · Class of {p.grad_year}
                </p>
                <p className="mt-1 font-mono text-[12px] text-ink-muted">Student ID {p.id}</p>
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 lg:w-[420px]">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card border border-border p-3">
              <dt className="text-[12px] text-ink-muted">{s.label}</dt>
              <dd className="mt-1 font-mono text-stat font-bold tabular-nums text-ink">{s.value ?? <Skeleton className="h-8 w-12" />}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          <Panel icon={<Sparkles size={20} />} title="Skills" subtitle="Changing skills re-scores every job instantly">
            <div className="space-y-4 px-5 pb-5">
              <ul className="flex flex-wrap gap-2" aria-label="Your skills">
                {p?.skills.map((s) => (
                  <li key={s}>
                    <SkillChip skill={s} variant="have" removeDisabled={saving} onRemove={() => patch({ skills: p.skills.filter((x) => x !== s) }, `Removed ${s}`)} />
                  </li>
                ))}
                {!p && !profile.error && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill(newSkill);
                }}
                className="space-y-2"
              >
                <Label htmlFor="new-skill">Add a skill</Label>
                <div className="flex gap-2">
                  <Input id="new-skill" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="e.g. docker" />
                  <Button type="submit" variant="primary" size="lg" disabled={saving || !newSkill.trim()} className="h-11">
                    <Plus /> Add
                  </Button>
                </div>
              </form>
            </div>
          </Panel>

          <Panel
            icon={<MapPin size={20} />}
            title="Preferred locations"
            action={
              p &&
              cities === null && (
                <Button size="sm" variant="ghost" onClick={() => setCities(p.preferred_cities.join(", "))}>
                  <Pencil /> Edit
                </Button>
              )
            }
          >
            <div className="px-5 pb-5">
              {p && cities === null && (
                <div className="flex flex-wrap gap-2">
                  {p.preferred_cities.length ? (
                    p.preferred_cities.map((c) => (
                      <SkillChip key={c} skill={c} variant="neutral" className="text-ink">
                        <MapPin size={14} className="text-ink-muted" />
                      </SkillChip>
                    ))
                  ) : (
                    <span className="text-small text-ink-muted">None set</span>
                  )}
                </div>
              )}
              {cities !== null && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    patch({ preferred_cities: cities.split(",").map((c) => c.trim()).filter(Boolean) }, "Preferred locations updated");
                    setCities(null);
                  }}
                  className="space-y-3"
                >
                  <Label htmlFor="cities">Cities, separated by commas</Label>
                  <Input id="cities" autoFocus value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Chennai, Bengaluru" />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      <Check /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCities(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Panel>

          <Panel icon={<CircleCheck size={20} />} title="Profile completion" subtitle={p ? `${completion}% complete` : undefined}>
            <ul className="space-y-2 px-5 pb-5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5 text-small">
                  {c.ok ? <CircleCheck size={20} className="text-accent" aria-label="Done" /> : <CircleDashed size={20} className="text-ink-muted" aria-label="Missing" />}
                  <span className={c.ok ? "text-ink" : "text-ink-muted"}>{c.label}</span>
                </li>
              ))}
              {p?.interests && <li className="pt-2 text-small text-ink-muted">Interests: {p.interests}</li>}
            </ul>
          </Panel>
        </div>

        {/* Right column: skill gaps */}
        <div className="space-y-6">
          <Panel
            icon={<BarChart3 size={20} />}
            title="Skill gap analysis"
            subtitle={`How often each missing skill appears across ${insights.data?.skill_plan.jobs_considered ?? "–"} eligible jobs`}
          >
            <div className="space-y-3 px-5 pb-5">
              {insights.error && <ErrorState message={insights.error} onRetry={insights.reload} />}
              {insights.loading && !insights.data && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              {plan.map((s, i) => {
                const reqPct = (s.required_in_jobs / maxRequired) * 100;
                const nicePct = (s.nice_to_have_in_jobs / maxRequired) * 100;
                return (
                  <FadeIn key={s.skill} index={i} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 sm:grid-cols-[120px_1fr_auto]">
                    <span className="truncate text-small text-ink">{prettySkill(s.skill)}</span>
                    <div
                      className="flex h-6 overflow-hidden rounded-input bg-surface-2"
                      role="img"
                      aria-label={`${prettySkill(s.skill)}: required in ${s.required_in_jobs} jobs, nice-to-have in ${s.nice_to_have_in_jobs}`}
                    >
                      <div className="h-full bg-warn" style={{ width: `${reqPct}%` }} />
                      <div className="h-full border-l border-surface bg-warn/40" style={{ width: `${nicePct}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono text-small tabular-nums text-ink">+{s.avg_score_gain} avg</span>
                  </FadeIn>
                );
              })}
              {plan.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[12px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-warn" /> Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-warn/40" /> Nice-to-have
                  </span>
                  <span>+N avg = average score gain per job</span>
                </div>
              )}
              {!insights.loading && !insights.error && plan.length === 0 && (
                <EmptyState icon={<CircleCheck size={20} />} title="No skill gaps" className="py-8">
                  You already cover every skill your eligible jobs ask for.
                </EmptyState>
              )}
            </div>
          </Panel>

          {plan.length > 0 && (
            <Panel icon={<Target size={20} />} title="Most valuable skills to learn" subtitle="Ranked by how many jobs each one unlocks">
              <ol className="space-y-1 px-2 pb-3">
                {plan.slice(0, 5).map((s, i) => (
                  <FadeIn as="li" key={s.skill} index={i} className="flex flex-col gap-3 rounded-card p-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center">
                    <span className="grid size-10 shrink-0 place-items-center rounded-card border border-border font-mono text-small font-bold text-ink">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SkillChip skill={s.skill} variant="gap" />
                        {s.jobs_fully_unlocked > 0 && <span className="text-small font-medium text-ink">Unlocks {plural(s.jobs_fully_unlocked, "job")}</span>}
                      </div>
                      <p className="mt-1.5 truncate text-small text-ink-muted">
                        Required in {s.required_in_jobs} · e.g. {s.example_jobs.join(", ")}
                      </p>
                    </div>
                    <Button size="sm" disabled={saving} onClick={() => addSkill(s.skill)} title="Mark as learned and add it to your profile">
                      <Check /> I learned it
                    </Button>
                  </FadeIn>
                ))}
              </ol>
            </Panel>
          )}

          {plan.length > 0 && (
            <Panel icon={<Sparkles size={20} />} title="Try a what-if" subtitle="Ask the assistant how your matches change if you learn a skill">
              <div className="grid gap-3 px-5 pb-5 md:grid-cols-3">
                {plan.slice(0, 3).map((s) => (
                  <Link
                    key={s.skill}
                    href={`/?ask=${encodeURIComponent(`What if I learn ${s.skill}? How do my matches change?`)}`}
                    className="flex flex-col justify-between rounded-card border border-border p-4 transition-colors hover:bg-surface-2"
                  >
                    <div>
                      <p className="font-medium text-ink">Learn {prettySkill(s.skill)}</p>
                      <p className="mt-1 text-small text-ink-muted">
                        +{s.avg_score_gain} average score across {s.required_in_jobs + s.nice_to_have_in_jobs} jobs
                        {s.jobs_fully_unlocked ? `, fully unlocks ${s.jobs_fully_unlocked}` : ""}.
                      </p>
                    </div>
                    <span className="mt-4 flex items-center gap-1 text-small font-medium text-ink">
                      Ask the assistant <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
