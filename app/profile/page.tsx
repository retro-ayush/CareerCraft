"use client";

import { useState } from "react";
import type { Profile } from "@/lib/careermatch";
import { Card, ErrorBox, SkillChip, useApi } from "@/components/ui";

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

/** Profile + skill editor + Skill ROI plan (which skill to learn next). */
export default function ProfilePage() {
  const [refresh, setRefresh] = useState(0);
  const profile = useApi<{ profile: Profile }>("/api/profile", refresh);
  const insights = useApi<{ skill_plan: SkillPlan; strong_matches: number }>("/api/insights", refresh);
  const [newSkill, setNewSkill] = useState("");
  const [cities, setCities] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const p = profile.data?.profile;

  async function patch(body: object) {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) setErr((await res.json()).error ?? "Could not save");
    setRefresh((r) => r + 1);
  }

  function addSkill(skill: string) {
    if (!p || !skill.trim()) return;
    patch({ skills: [...p.skills, skill] });
    setNewSkill("");
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-5 md:p-6">
      <section className="space-y-4 md:col-span-2">
        <Card title="My Profile" subtitle="Logged-in student">
          {profile.error && <ErrorBox message={profile.error} />}
          {p && (
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="text-slate-500">
                  {p.id} · {p.degree} {p.branch} · Class of {p.grad_year}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">CGPA</p>
                  <p className="font-semibold">{p.cgpa}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">Strong matches</p>
                  <p className="font-semibold">{insights.data?.strong_matches ?? "–"}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">Preferred cities</p>
                {cities === null ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {p.preferred_cities.map((c) => <SkillChip key={c} skill={c} />)}
                    <button onClick={() => setCities(p.preferred_cities.join(", "))} className="text-xs text-indigo-600 hover:underline">
                      edit
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      patch({ preferred_cities: cities.split(",").map((c) => c.trim()).filter(Boolean) });
                      setCities(null);
                    }}
                    className="flex gap-2"
                  >
                    <input value={cities} onChange={(e) => setCities(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1" />
                    <button className="rounded-lg bg-indigo-600 px-3 text-xs text-white">Save</button>
                  </form>
                )}
              </div>
              {p.interests && (
                <div>
                  <p className="text-xs text-slate-500">Interests</p>
                  <p>{p.interests}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="My skills" subtitle="Click × to remove. Changes re-score every job.">
          {p && (
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                    {s}
                    <button
                      aria-label={`Remove ${s}`}
                      disabled={saving}
                      onClick={() => patch({ skills: p.skills.filter((x) => x !== s) })}
                      className="text-emerald-500 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill(newSkill);
                }}
                className="flex gap-2"
              >
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill, e.g. docker"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                />
                <button disabled={saving || !newSkill.trim()} className="rounded-lg bg-indigo-600 px-3 text-sm text-white disabled:opacity-50">
                  Add
                </button>
              </form>
              {err && <p className="text-sm text-rose-600">{err}</p>}
            </div>
          )}
        </Card>
      </section>

      <section className="md:col-span-3">
        <Card
          title="Skill ROI: what to learn next"
          subtitle={`Ranked by how many eligible jobs each missing skill unlocks (${insights.data?.skill_plan.jobs_considered ?? "–"} eligible jobs analysed)`}
        >
          {insights.error && <ErrorBox message={insights.error} />}
          <ol className="divide-y divide-slate-100">
            {(insights.data?.skill_plan.top_skills_to_learn ?? []).map((s, i) => (
              <li key={s.skill} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{i + 1}</span>
                  <div>
                    <p className="font-semibold capitalize">{s.skill}</p>
                    <p className="text-xs text-slate-500">
                      Required in {s.required_in_jobs} jobs · nice-to-have in {s.nice_to_have_in_jobs} · avg +{s.avg_score_gain} score
                    </p>
                    <p className="text-xs text-slate-400">e.g. {s.example_jobs.join(" · ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.jobs_fully_unlocked > 0 && (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">unlocks {s.jobs_fully_unlocked} jobs</span>
                  )}
                  <button
                    disabled={saving}
                    onClick={() => addSkill(s.skill)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    title="Mark as learned and add to profile"
                  >
                    I learned it
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </main>
  );
}
