"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, Clock, MapPin, Sparkles, UserRound } from "lucide-react";
import { endpoints, jobsUrl } from "@/lib/apiClient";
import type { Insights, JobMatch, Profile, ShortlistItem } from "@/lib/types";
import AgentChat from "@/components/AgentChat";
import ShortlistPanel from "@/components/ShortlistPanel";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/cc/FadeIn";
import { JobMatchCard } from "@/components/cc/JobMatchCard";
import { Panel } from "@/components/cc/Panel";
import { SkillChip } from "@/components/cc/SkillChip";
import { EmptyState, ErrorState, JobGridSkeleton, Skeleton } from "@/components/cc/states";
import { useApi } from "@/components/cc/hooks";
import { initials, plural } from "@/components/cc/format";

const noopSubscribe = () => () => undefined;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/*
 * DASHBOARD: greeting, live stats, AI assistant, profile summary, live shortlist and top recommendations.
 * Everything reloads whenever the agent writes data (refreshKey).
 */
export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  // Time-of-day greeting computed on the client; the server renders a neutral fallback (no hydration mismatch).
  const hello = useSyncExternalStore(noopSubscribe, greeting, () => "Hello");

  const insights = useApi<Insights>(endpoints.insights, refreshKey);
  const jobs = useApi<{ jobs: JobMatch[] }>(jobsUrl(), refreshKey);
  const shortlist = useApi<{ shortlist: ShortlistItem[] }>(endpoints.shortlist, refreshKey);
  const profile = useApi<{ profile: Profile }>(endpoints.profile, refreshKey);

  const eligible = useMemo(() => (jobs.data?.jobs ?? []).filter((j) => j.eligible), [jobs.data]);
  const avgScore = jobs.data ? (eligible.length ? Math.round(eligible.reduce((a, j) => a + j.match_score, 0) / eligible.length) : 0) : undefined;
  const items = shortlist.data?.shortlist;
  const savedIds = new Set((items ?? []).map((s) => s.job_id));
  const inProgress = items ? items.filter((s) => s.status === "applied" || s.status === "interviewing").length : undefined;
  const recommendations = [...eligible].sort((a, b) => b.match_score - a.match_score || a.days_left - b.days_left).slice(0, 6);

  const stats = [
    { label: "Eligible jobs", value: insights.data?.eligible_jobs, hint: insights.data ? `of ${insights.data.open_jobs} open roles` : "", href: "/jobs" },
    { label: "Average match", value: avgScore, suffix: "%", hint: "across your eligible jobs", href: "/jobs" },
    { label: "Shortlisted", value: items?.length, hint: insights.data ? `${insights.data.strong_matches} strong matches available` : "", href: "/shortlist" },
    { label: "In progress", value: inProgress, hint: "applied or interviewing", href: "/shortlist" },
  ];

  const p = profile.data?.profile;
  const firstName = p?.name.split(" ")[0] ?? "Divya";
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-9 text-ink md:text-h1">
            {hello}, {firstName}
          </h1>
          <p className="mt-2 text-body text-ink-muted">Here&rsquo;s where your job search stands today.</p>
        </div>
        {insights.data && insights.data.closing_this_week > 0 && (
          <Link href="/jobs" className="flex h-10 items-center gap-2 rounded-card border border-border bg-surface px-4 text-small text-ink transition-colors hover:bg-surface-2">
            <Clock size={16} className="text-ink-muted" />
            {plural(insights.data.closing_this_week, "good fit")} close this week
            <ArrowRight size={16} className="text-ink-muted" />
          </Link>
        )}
      </div>

      {insights.error ? (
        <ErrorState message={insights.error} onRetry={insights.reload} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <FadeIn key={s.label} index={i}>
              <Link href={s.href} className="block h-full rounded-card border border-border bg-surface p-4 transition-colors hover:bg-surface-2 md:p-5">
                <p className="text-small text-ink-muted">{s.label}</p>
                {s.value == null ? (
                  <Skeleton className="mt-2 h-8 w-16" />
                ) : (
                  <p className="mt-2 font-mono text-stat font-bold tabular-nums text-ink">
                    {s.value}
                    {s.suffix}
                  </p>
                )}
                <p className="mt-1 truncate text-[12px] leading-4 text-ink-muted">{s.hint || " "}</p>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AgentChat onDataChanged={refresh} />

        <div className="space-y-6">
          <Panel
            icon={<UserRound size={20} />}
            title="Your profile"
            action={
              <Link href="/profile" className="flex items-center gap-1 rounded-card py-1 text-small text-ink-muted transition-colors hover:text-ink">
                Edit <ArrowRight size={16} />
              </Link>
            }
          >
            <div className="space-y-4 px-5 pb-5">
              {p ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full border border-border bg-surface-2 text-small font-semibold text-ink">{initials(p.name)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-small text-ink-muted">
                        {p.degree} {p.branch} · Class of {p.grad_year}
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div className="rounded-card border border-border p-3">
                      <dt className="text-[12px] text-ink-muted">CGPA</dt>
                      <dd className="mt-1 font-mono text-[20px] font-bold tabular-nums text-ink">{p.cgpa}</dd>
                    </div>
                    <div className="rounded-card border border-border p-3">
                      <dt className="text-[12px] text-ink-muted">Skills</dt>
                      <dd className="mt-1 font-mono text-[20px] font-bold tabular-nums text-ink">{p.skills.length}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {p.skills.slice(0, 6).map((s) => (
                      <SkillChip key={s} skill={s} variant="have" />
                    ))}
                    {p.skills.length > 6 && <span className="inline-flex h-7 items-center text-small text-ink-muted">and {p.skills.length - 6} more</span>}
                  </div>
                  <p className="flex items-center gap-1.5 text-small text-ink-muted">
                    <MapPin size={16} /> Prefers {p.preferred_cities.join(", ") || "any city"}
                  </p>
                </>
              ) : profile.error ? (
                <ErrorState message={profile.error} onRetry={profile.reload} />
              ) : (
                <div className="space-y-3" role="status" aria-label="Loading profile">
                  <Skeleton className="h-11 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              )}
            </div>
          </Panel>

          <ShortlistPanel items={items ?? null} loading={shortlist.loading} error={shortlist.error} onRetry={shortlist.reload} />
        </div>
      </div>

      <section className="space-y-4" aria-labelledby="recommended-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="recommended-title" className="text-h2 font-semibold text-ink">
              Recommended for you
            </h2>
            <p className="mt-1 text-small text-ink-muted">Your highest-scoring eligible roles.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/jobs">
              Explore all jobs <ArrowRight />
            </Link>
          </Button>
        </div>
        {jobs.error ? (
          <ErrorState message={jobs.error} onRetry={jobs.reload} />
        ) : jobs.loading && !jobs.data ? (
          <JobGridSkeleton count={2} />
        ) : recommendations.length === 0 ? (
          <div className="rounded-panel border border-border bg-surface">
            <EmptyState
              icon={<Sparkles size={20} />}
              title="No eligible roles right now"
              action={
                <Button asChild size="sm">
                  <Link href="/profile">Add skills to your profile</Link>
                </Button>
              }
            >
              New skills re-score every job instantly.
            </EmptyState>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((j, i) => (
              <FadeIn key={j.job_id} index={i} className="flex">
                <JobMatchCard job={j} saved={savedIds.has(j.job_id)} onSaved={refresh} className="w-full" />
              </FadeIn>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
