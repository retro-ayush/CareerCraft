"use client";

import { useMemo, useState } from "react";
import type { JobMatch } from "@/lib/careermatch";
import type { ShortlistItem } from "@/lib/shortlist";
import { Card, DeadlineChip, ErrorBox, ScoreBar, SkillChip, useApi } from "@/components/ui";

const CITIES = ["", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Coimbatore", "Remote"];

/** Job browser: every open job scored for the student, with eligibility reasons. */
export default function JobsPage() {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState("");
  const [showIneligible, setShowIneligible] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [msg, setMsg] = useState("");

  const url = useMemo(() => {
    const p = new URLSearchParams({ city, q, job_type: jobType });
    return `/api/jobs?${p.toString()}`;
  }, [city, q, jobType]);

  const { data, error, loading } = useApi<{ jobs: JobMatch[] }>(url);
  const shortlist = useApi<{ shortlist: ShortlistItem[] }>("/api/shortlist", refresh);
  const saved = new Set((shortlist.data?.shortlist ?? []).map((s) => s.job_id));

  const jobs = (data?.jobs ?? []).filter((j) => showIneligible || j.eligible);
  const hidden = (data?.jobs ?? []).filter((j) => !j.eligible).length;

  async function save(job_id: number) {
    setMsg("");
    const res = await fetch("/api/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id }),
    });
    const json = await res.json();
    setMsg(res.ok ? `Saved job #${job_id} to your shortlist.` : json.error);
    setRefresh((r) => r + 1);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <Card title="Jobs for you" subtitle="Scored 0-100: 70% required skills · 20% nice-to-have · 10% preferred city">
        <div className="grid gap-2 p-4 sm:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Role or skill, e.g. data analyst"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:col-span-2"
          />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {CITIES.map((c) => (
              <option key={c} value={c}>{c || "All cities"}</option>
            ))}
          </select>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Full-time + Internship</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-4">
            <input type="checkbox" checked={showIneligible} onChange={(e) => setShowIneligible(e.target.checked)} />
            Show jobs I am not eligible for ({hidden} hidden by the CGPA / branch rule)
          </label>
        </div>
      </Card>

      {msg && <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">{msg}</p>}
      {error && <ErrorBox message={error} />}
      {loading && !data && <p className="text-sm text-slate-500">Loading jobs...</p>}
      {!loading && jobs.length === 0 && !error && <p className="text-sm text-slate-500">No jobs match these filters.</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.job_id} className={`rounded-xl border bg-white p-4 ${j.eligible ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{j.title}</p>
                <p className="text-sm text-slate-500">
                  #{j.job_id} · {j.company} · {j.city} · {j.work_mode} · {j.job_type}
                </p>
                <p className="text-xs text-slate-500">{j.salary_lpa}</p>
              </div>
              <ScoreBar score={j.match_score} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {j.matched_skills.map((s) => <SkillChip key={s} skill={s} tone="good" />)}
              {j.missing_required.map((s) => <SkillChip key={s} skill={`need ${s}`} tone="missing" />)}
              {j.missing_nice_to_have.map((s) => <SkillChip key={s} skill={`+ ${s}`} />)}
            </div>
            {!j.eligible && <p className="mt-2 text-xs text-rose-600">Not eligible: {j.ineligible_reasons.join("; ")}</p>}
            <div className="mt-3 flex items-center justify-between">
              <DeadlineChip days={j.days_left} />
              {j.eligible &&
                (saved.has(j.job_id) ? (
                  <span className="text-xs text-emerald-700">✓ In shortlist</span>
                ) : (
                  <button onClick={() => save(j.job_id)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700">
                    Save to shortlist
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
