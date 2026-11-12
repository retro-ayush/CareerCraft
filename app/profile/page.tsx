"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BarChart3, Check, CircleCheck, CircleDashed, GraduationCap, Lightbulb, MapPin, Pencil, Plus, Sparkles, Target, X } from "lucide-react";
import type { Profile } from "@/lib/careermatch";
import { Card, CountUp, ErrorBox, PageHeader, Skeleton, prettySkill, toast, useApi } from "@/components/ui";

type SkillPlan = {
  jobs_considered: number;
  top_skills_to_learn: {
    skill: string;
    required_in_jobs: number;
    nice_to_have_in_jobs: number;
    jobs_fully_unlocked: number;
    avg_score_gain: number;
    example_jobs: string[];
  }[];
};

/** Ring used for CGPA and profile completion. */
function Ring({ value, max, label, display, color }: { value: number; max: number; label: string; display: React.ReactNode; color: string }) {
  const size = 108,
    stroke = 8,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </svg>
        <span className="absolute text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{display}</span>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">{label}</p>
    </div>
  );
}

/** Profile dashboard: identity, academics, editable skills and cities, completion, skill gap analysis. */
export default function ProfilePage() {
  const [refresh, setRefresh] = useState(0);
  const profile = useApi<{ profile: Profile }>("/api/profile", refresh);
  const insights = useApi<{ skill_plan: SkillPlan; strong_matches: number; eligible_jobs: number }>("/api/insights", refresh);
  const [newSkill, setNewSkill] = useState("");
  const [cities, setCities] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

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

  async function patch(body: object, success?: string) {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) toast((await res.json().catch(() => ({}))).error ?? "Could not save", "error");
    else if (success) toast(success);
    setRefresh((r) => r + 1);
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

  const initials = p
    ? p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
    : "";

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="Your academic details and skills drive every match score." />
      {profile.error && <ErrorBox message={profile.error} />}

      {/* Identity + rings */}
      <section className="panel animate-enter relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {p ? (
              <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet to-blue text-[24px] font-semibold text-white shadow-[0_12px_32px_-12px_rgb(116_97_240/0.9)]">
                {initials}
              </span>
            ) : (
              <Skeleton className="h-[72px] w-[72px] rounded-2xl" />
            )}
            <div className="min-w-0">
              {p ? (
                <>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{p.name}</h2>
                  <p className="mt-0.5 font-mono text-[12.5px] text-muted">Student ID {p.id}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2 text-[12.5px]">
                    <span className="chip border-edge bg-white/[0.03] text-fg-2">
                      <GraduationCap size={13} /> {p.degree} · {p.branch}
                    </span>
                    <span className="chip border-edge bg-white/[0.03] text-fg-2">Class of {p.grad_year}</span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-around gap-6 sm:justify-start">
            <Ring value={p?.cgpa ?? 0} max={10} label="CGPA" display={p ? p.cgpa : "–"} color="var(--color-violet)" />
            <Ring value={completion} max={100} label="Profile complete" display={p ? `${completion}%` : "–"} color="var(--color-good)" />
            <div className="hidden flex-col items-center sm:flex">
              <div className="grid h-[108px] w-[108px] place-items-center rounded-full border border-edge bg-raised/50">
                <span className="text-[28px] font-semibold tabular-nums text-blue">
                  <CountUp value={insights.data?.strong_matches} />
                </span>
              </div>
              <p className="mt-2 text-[12.5px] text-muted">Strong matches</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-5">
          <Card icon={<Sparkles size={16} />} title="Skills" subtitle="Changing skills re-scores every job instantly">
            <div className="space-y-4 px-5 pb-5">
              <div className="flex flex-wrap gap-1.5">
                {p?.skills.map((s) => (
                  <span key={s} className="animate-enter group inline-flex items-center gap-1 rounded-lg border border-good/20 bg-good/10 py-1 pl-2.5 pr-1 text-[12.5px] text-good transition hover:border-good/40">
                    {s}
                    <button
                      aria-label={`Remove ${s}`}
                      disabled={saving}
                      onClick={() => patch({ skills: p.skills.filter((x) => x !== s) }, `Removed ${s}`)}
                      className="rounded-md p-0.5 text-good/60 transition hover:bg-bad/15 hover:text-bad"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {!p && !profile.error && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-16" />)}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill(newSkill);
                }}
                className="flex gap-2"
              >
                <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill, e.g. docker" className="field" />
                <button disabled={saving || !newSkill.trim()} className="btn shrink-0">
                  <Plus size={15} /> Add
                </button>
              </form>
            </div>
          </Card>

          <Card
            icon={<MapPin size={16} />}
            title="Preferred locations"
            action={
              p &&
              cities === null && (
                <button onClick={() => setCities(p.preferred_cities.join(", "))} className="btn-ghost !px-2.5 !py-1 text-[12px]">
                  <Pencil size={12} /> Edit
                </button>
              )
            }
          >
            <div className="px-5 pb-5">
              {p && cities === null && (
                <div className="flex flex-wrap gap-1.5">
                  {p.preferred_cities.length ? (
                    p.preferred_cities.map((c) => (
                      <span key={c} className="chip border-blue/20 bg-blue/10 text-blue">
                        <MapPin size={11} /> {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-muted">None set</span>
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
                  className="space-y-2.5"
                >
                  <input autoFocus value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Chennai, Bengaluru" className="field" />
                  <div className="flex gap-2">
                    <button className="btn !py-1.5 text-[13px]">
                      <Check size={14} /> Save
                    </button>
                    <button type="button" onClick={() => setCities(null)} className="btn-ghost !py-1.5 text-[13px]">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Card>

          <Card icon={<CircleCheck size={16} />} title="Profile completion" subtitle={p ? `${completion}% complete` : undefined}>
            <ul className="space-y-2 px-5 pb-5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5 text-[13px]">
                  {c.ok ? <CircleCheck size={15} className="text-good" /> : <CircleDashed size={15} className="text-faint" />}
                  <span className={c.ok ? "text-fg-2" : "text-muted"}>{c.label}</span>
                </li>
              ))}
              {p?.interests && <li className="pt-2 text-[12.5px] text-muted">Interests: {p.interests}</li>}
            </ul>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card
            icon={<BarChart3 size={16} />}
            title="Skill gap analysis"
            subtitle={`How often each missing skill appears across ${insights.data?.skill_plan.jobs_considered ?? "–"} eligible jobs`}
          >
            {insights.error && <ErrorBox message={insights.error} />}
            <div className="space-y-3 px-5 pb-5">
              {insights.loading && !insights.data && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              {plan.map((s, i) => {
                const reqPct = (s.required_in_jobs / maxRequired) * 100;
                const nicePct = (s.nice_to_have_in_jobs / maxRequired) * 100;
                const dim = hover && hover !== s.skill;
                return (
                  <div
                    key={s.skill}
                    onMouseEnter={() => setHover(s.skill)}
                    onMouseLeave={() => setHover(null)}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className={`animate-enter grid grid-cols-[110px_1fr_auto] items-center gap-3 transition-opacity ${dim ? "opacity-40" : ""}`}
                  >
                    <span className="truncate text-[13px] text-fg-2">{prettySkill(s.skill)}</span>
                    <div className="flex h-6 overflow-hidden rounded-md bg-white/[0.04]">
                      <div className="h-full bg-gradient-to-r from-violet to-violet-strong transition-[width] duration-700" style={{ width: `${reqPct}%` }} title={`Required in ${s.required_in_jobs} jobs`} />
                      <div className="h-full bg-blue/50 transition-[width] duration-700" style={{ width: `${nicePct}%` }} title={`Nice-to-have in ${s.nice_to_have_in_jobs} jobs`} />
                    </div>
                    <span className="w-16 text-right font-mono text-[12px] tabular-nums text-good">+{s.avg_score_gain} avg</span>
                  </div>
                );
              })}
              {plan.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-2 text-[12px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-violet" /> Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue/50" /> Nice-to-have
                  </span>
                  <span className="flex items-center gap-1.5 text-good">+N avg = score gain per job</span>
                </div>
              )}
            </div>
          </Card>

          <Card icon={<Target size={16} />} title="Most valuable skills to learn" subtitle="Ranked by how many jobs each one unlocks">
            <ol className="space-y-2 px-3 pb-3">
              {plan.slice(0, 5).map((s, i) => (
                <li
                  key={s.skill}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="animate-enter group flex flex-col gap-3 rounded-xl p-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-[13px] font-semibold ${
                      i === 0 ? "bg-gradient-to-br from-violet to-blue text-white" : "border border-edge bg-raised text-fg-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                      {prettySkill(s.skill)}
                      {s.jobs_fully_unlocked > 0 && (
                        <span className="chip border-good/20 bg-good/10 text-good">
                          Unlocks {s.jobs_fully_unlocked} job{s.jobs_fully_unlocked > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      Required in {s.required_in_jobs} · e.g. {s.example_jobs.join(", ")}
                    </p>
                  </div>
                  <button disabled={saving} onClick={() => addSkill(s.skill)} className="btn-ghost shrink-0 !py-1.5 text-[12.5px] hover:!border-good/40 hover:!text-good" title="Mark as learned and add it to your profile">
                    <Check size={13} /> I learned it
                  </button>
                </li>
              ))}
              {!insights.loading && plan.length === 0 && !insights.error && <p className="px-3 py-6 text-center text-[13.5px] text-muted">You already cover every skill these jobs ask for.</p>}
            </ol>
          </Card>

          {plan.length > 0 && (
            <Card icon={<Lightbulb size={16} />} title="AI learning recommendations" subtitle="Run a real what-if simulation with the assistant">
              <div className="grid gap-3 px-5 pb-5 md:grid-cols-3">
                {plan.slice(0, 3).map((s, i) => (
                  <Link
                    key={s.skill}
                    href={`/?ask=${encodeURIComponent(`What if I learn ${s.skill}? How do my matches change?`)}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="animate-enter group flex flex-col justify-between rounded-xl border border-edge bg-gradient-to-br from-violet/[0.08] to-transparent p-4 transition hover:-translate-y-0.5 hover:border-violet/40"
                  >
                    <div>
                      <p className="text-[14px] font-medium">Learn {prettySkill(s.skill)}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                        +{s.avg_score_gain} average score across {s.required_in_jobs + s.nice_to_have_in_jobs} jobs
                        {s.jobs_fully_unlocked ? `, fully unlocks ${s.jobs_fully_unlocked}` : ""}.
                      </p>
                    </div>
                    <span className="mt-3 flex items-center gap-1 text-[12.5px] text-violet">
                      Simulate with AI <ArrowUpRight size={13} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
