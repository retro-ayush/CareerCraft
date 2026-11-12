"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Briefcase, Gauge, GraduationCap, MapPin, Send, Sparkles, TrendingUp } from "lucide-react";
import type { JobMatch, Profile } from "@/lib/careermatch";
import type { ShortlistItem } from "@/lib/shortlist";
import AgentChat from "@/components/AgentChat";
import JobCard from "@/components/JobCard";
import ShortlistPanel from "@/components/ShortlistPanel";
import { Card, CountUp, ErrorBox, Skeleton, SkillChip, useApi } from "@/components/ui";

type Insights = { open_jobs: number; eligible_jobs: number; strong_matches: number; closing_this_week: number };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/*
 * DASHBOARD: greeting, live stats, AI assistant, profile summary, live shortlist and top recommendations.
 * Everything reloads whenever the agent writes data (refreshKey).
 */
export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);

  const insights = useApi<Insights>("/api/insights", refreshKey);
  const jobs = useApi<{ jobs: JobMatch[] }>("/api/jobs", refreshKey);
  const shortlist = useApi<{ shortlist: ShortlistItem[] }>("/api/shortlist", refreshKey);
  const profile = useApi<{ profile: Profile }>("/api/profile", refreshKey);

  const eligible = useMemo(() => (jobs.data?.jobs ?? []).filter((j) => j.eligible), [jobs.data]);
  const avgScore = jobs.data ? (eligible.length ? Math.round(eligible.reduce((a, j) => a + j.match_score, 0) / eligible.length) : 0) : undefined;
  const items = shortlist.data?.shortlist;
  const savedIds = new Set((items ?? []).map((s) => s.job_id));
  const inProgress = items ? items.filter((s) => s.status === "applied" || s.status === "interviewing").length : undefined;
  const recommendations = [...eligible].sort((a, b) => b.match_score - a.match_score || a.days_left - b.days_left).slice(0, 6);

  const stats = [
    { label: "Matching jobs", value: insights.data?.eligible_jobs, hint: insights.data ? `of ${insights.data.open_jobs} open roles you're eligible for` : "", icon: Briefcase, tint: "text-violet bg-violet/10", href: "/jobs" },
    { label: "Average match", value: avgScore, suffix: "%", hint: "across your eligible jobs", icon: Gauge, tint: "text-blue bg-blue/10", href: "/jobs" },
    { label: "Saved opportunities", value: items?.length, hint: insights.data ? `${insights.data.strong_matches} strong matches available` : "", icon: Bookmark, tint: "text-good bg-good/10", href: "/shortlist" },
    { label: "In progress", value: inProgress, hint: "applied or interviewing", icon: Send, tint: "text-plum bg-plum/10", href: "/shortlist" },
  ];

  const p = profile.data?.profile;
  const firstName = p?.name.split(" ")[0] ?? "Divya";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="animate-enter flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good shadow-[0_0_8px_var(--color-good)]" /> Live data from Supabase
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] md:text-[34px]">
            {hello}, {firstName} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-muted">Your next career opportunity starts here.</p>
        </div>
        {insights.data && insights.data.closing_this_week > 0 && (
          <Link href="/jobs" className="group flex items-center gap-2 rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2 text-[13px] text-warn transition hover:bg-warn/15">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warn" />
            {insights.data.closing_this_week} good fit{insights.data.closing_this_week > 1 ? "s" : ""} close this week
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* Stats */}
      {insights.error ? (
        <ErrorBox message={insights.error} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              style={{ animationDelay: `${i * 60}ms` }}
              className="panel animate-enter group relative overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:border-edge-strong md:p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-muted">{s.label}</p>
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${s.tint} transition-transform group-hover:scale-110`}>
                  <s.icon size={16} />
                </span>
              </div>
              <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums md:text-[34px]">
                <CountUp value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 truncate text-[12px] text-muted">{s.hint || " "}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Assistant + side column */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />

        <div className="space-y-5">
          <Card
            icon={<GraduationCap size={16} />}
            title="Your profile"
            action={
              <Link href="/profile" className="group flex items-center gap-1 text-[12.5px] text-muted transition hover:text-fg">
                Edit <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          >
            <div className="space-y-4 px-5 pb-5">
              {p ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet to-blue text-[14px] font-semibold text-white">
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[12.5px] text-muted">
                        {p.degree} {p.branch} · Class of {p.grad_year}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-edge bg-raised/60 p-3">
                      <p className="text-[11.5px] text-muted">CGPA</p>
                      <p className="mt-1 text-[20px] font-semibold tabular-nums">{p.cgpa}</p>
                    </div>
                    <div className="rounded-xl border border-edge bg-raised/60 p-3">
                      <p className="text-[11.5px] text-muted">Skills</p>
                      <p className="mt-1 text-[20px] font-semibold tabular-nums">{p.skills.length}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.skills.slice(0, 8).map((s) => (
                      <SkillChip key={s} skill={s} />
                    ))}
                    {p.skills.length > 8 && <SkillChip skill={`+${p.skills.length - 8}`} />}
                  </div>
                  <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <MapPin size={13} /> Prefers {p.preferred_cities.join(", ") || "any city"}
                  </p>
                </>
              ) : profile.error ? (
                <ErrorBox message={profile.error} />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-11 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              )}
            </div>
          </Card>

          <ShortlistPanel items={items ?? null} loading={shortlist.loading} error={shortlist.error} />
        </div>
      </div>

      {/* Recommendations */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.02em]">
              <TrendingUp size={18} className="text-violet" /> Recommended for you
            </h2>
            <p className="mt-0.5 text-[13.5px] text-muted">Your highest-scoring eligible roles, live from the job board.</p>
          </div>
          <Link href="/jobs" className="btn-ghost text-[13px]">
            Explore all jobs <ArrowRight size={14} />
          </Link>
        </div>
        {jobs.error && <ErrorBox message={jobs.error} />}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.loading && !jobs.data
            ? [0, 1, 2].map((i) => (
                <div key={i} className="panel space-y-4 p-5">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ))
            : recommendations.map((j, i) => <JobCard key={j.job_id} job={j} index={i} saved={savedIds.has(j.job_id)} onSaved={() => setRefreshKey((k) => k + 1)} />)}
        </div>
        {!jobs.loading && recommendations.length === 0 && !jobs.error && (
          <div className="panel flex items-center gap-3 p-5 text-[13.5px] text-muted">
            <Sparkles size={16} className="text-violet" /> No eligible roles right now. Try adding skills on your profile.
          </div>
        )}
      </section>
    </div>
  );
}
