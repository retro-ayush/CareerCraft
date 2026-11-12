"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, SearchX, X } from "lucide-react";
import { endpoints, jobsUrl } from "@/lib/apiClient";
import type { JobMatch, JobType, ShortlistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn } from "@/components/cc/FadeIn";
import { JobMatchCard } from "@/components/cc/JobMatchCard";
import { PageHeader } from "@/components/cc/Panel";
import { EmptyState, ErrorState, JobGridSkeleton } from "@/components/cc/states";
import { useApi, useDebounced } from "@/components/cc/hooks";
import { plural } from "@/components/cc/format";

const CITIES = ["", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Coimbatore", "Remote"];
const SORTS = { score: "Best match", deadline: "Closing soon", gap: "Fewest skill gaps" } as const;
type SortKey = keyof typeof SORTS;

/** Explore jobs: every open job scored for the student, with filters, sorting and eligibility. */
export default function JobsPage() {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState<JobType | "">("");
  const [sort, setSort] = useState<SortKey>("score");
  const [minScore, setMinScore] = useState(0);
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const debouncedQ = useDebounced(q, 300);
  const url = jobsUrl({ city, q: debouncedQ, job_type: jobType });

  const { data, error, loading, reload } = useApi<{ jobs: JobMatch[] }>(url);
  const shortlist = useApi<{ shortlist: ShortlistItem[] }>(endpoints.shortlist, refresh);
  const saved = new Set((shortlist.data?.shortlist ?? []).map((s) => s.job_id));

  const all = useMemo(() => data?.jobs ?? [], [data]);
  const eligibleCount = all.filter((j) => j.eligible).length;
  const jobs = useMemo(() => {
    const list = all.filter((j) => (!eligibleOnly || j.eligible) && j.match_score >= minScore);
    if (sort === "deadline") return [...list].sort((a, b) => a.days_left - b.days_left);
    if (sort === "gap") return [...list].sort((a, b) => a.missing_required.length - b.missing_required.length || b.match_score - a.match_score);
    return [...list].sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.match_score - a.match_score);
  }, [all, eligibleOnly, minScore, sort]);

  const searching = loading || q !== debouncedQ;
  const filtersActive = Boolean(q || city || jobType || minScore || !eligibleOnly);

  function reset() {
    setQ("");
    setCity("");
    setJobType("");
    setMinScore(0);
    setEligibleOnly(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Explore jobs" subtitle="Every open role, scored against your skills: 70% required skills, 20% nice-to-have, 10% preferred city." />

      {/* Filters */}
      <section aria-label="Filters" className="space-y-4 rounded-panel border border-border bg-surface p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="job-search" className="sr-only">
              Search jobs
            </label>
            <Search size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input id="job-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role or skill, e.g. data analyst" className="pl-10 pr-10" />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-input text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Select value={jobType} onChange={(e) => setJobType(e.target.value as JobType | "")} aria-label="Job type" className="md:w-44">
              <option value="">All job types</option>
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by" className="md:w-52">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  Sort: {v}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div role="group" aria-label="Location" className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {CITIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={city === c}
              onClick={() => setCity(c)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-small transition-colors",
                city === c ? "border-accent bg-accent-soft font-medium text-ink" : "border-border text-ink-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              {c || "All locations"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 items-center gap-3 text-small text-ink sm:max-w-sm">
            <span className="shrink-0">Minimum match</span>
            <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="h-6 flex-1" />
            <span className="w-12 text-right font-mono tabular-nums text-ink">{minScore}%</span>
          </label>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={reset} className="self-start sm:self-auto">
              Reset filters
            </Button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={eligibleOnly ? "eligible" : "all"} onValueChange={(v) => setEligibleOnly(v === "eligible")}>
          <TabsList aria-label="Which jobs to show">
            <TabsTrigger value="eligible">
              Eligible <span className="font-mono text-ink-muted">{data ? eligibleCount : "–"}</span>
            </TabsTrigger>
            <TabsTrigger value="all">
              All jobs <span className="font-mono text-ink-muted">{data ? all.length : "–"}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="flex items-center gap-2 text-small text-ink-muted" aria-live="polite">
          {searching && <Loader2 size={16} className="animate-spin" />}
          {searching ? "Searching" : `${plural(jobs.length, "job")} shown`}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <JobGridSkeleton count={4} />
      ) : jobs.length === 0 ? (
        <div className="rounded-panel border border-border bg-surface">
          <EmptyState
            icon={<SearchX size={20} />}
            title="No jobs match these filters"
            action={
              filtersActive && (
                <Button size="sm" onClick={reset}>
                  Reset filters
                </Button>
              )
            }
          >
            {eligibleOnly && all.length > 0 ? "Try showing all jobs, or lower the minimum match." : "Try a different search or location."}
          </EmptyState>
        </div>
      ) : (
        <div className={cn("grid items-stretch gap-4 transition-opacity md:grid-cols-2 2xl:grid-cols-3", searching && data && "opacity-60")}>
          {jobs.map((j, i) => (
            <FadeIn key={j.job_id} index={i} className="flex">
              <JobMatchCard job={j} saved={saved.has(j.job_id)} onSaved={() => setRefresh((r) => r + 1)} className="w-full" />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
