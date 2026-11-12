"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import type { JobMatch } from "@/lib/careermatch";
import type { ShortlistItem } from "@/lib/shortlist";
import JobCard from "@/components/JobCard";
import { EmptyState, ErrorBox, PageHeader, Pill, Skeleton, useApi, useDebounced } from "@/components/ui";

const CITIES = ["", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Coimbatore", "Remote"];
const SORTS = { score: "Best match", deadline: "Closing soon", gap: "Fewest skill gaps" } as const;
type SortKey = keyof typeof SORTS;

/** Explore jobs: every open job scored for the student, with filters, sorting and eligibility. */
export default function JobsPage() {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [minScore, setMinScore] = useState(0);
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const debouncedQ = useDebounced(q, 300);
  const url = useMemo(() => {
    const p = new URLSearchParams({ city, q: debouncedQ, job_type: jobType });
    return `/api/jobs?${p.toString()}`;
  }, [city, debouncedQ, jobType]);

  const { data, error, loading } = useApi<{ jobs: JobMatch[] }>(url);
  const shortlist = useApi<{ shortlist: ShortlistItem[] }>("/api/shortlist", refresh);
  const saved = new Set((shortlist.data?.shortlist ?? []).map((s) => s.job_id));

  const all = useMemo(() => data?.jobs ?? [], [data]);
  const hidden = all.filter((j) => !j.eligible).length;
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
      <section className="panel animate-enter space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role or skill, e.g. data analyst, react" className="field !pl-10 !pr-9" />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted hover:text-fg">
                <X size={15} />
              </button>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="field md:!w-44">
              <option value="">All job types</option>
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field md:!w-48">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  Sort: {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="thin-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {CITIES.map((c) => (
            <Pill key={c} active={city === c} onClick={() => setCity(c)}>
              {c || "All locations"}
            </Pill>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-edge pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 items-center gap-3 text-[13px] text-fg-2 sm:max-w-sm">
            <SlidersHorizontal size={15} className="shrink-0 text-muted" />
            <span className="shrink-0">Min match</span>
            <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="flex-1" aria-label="Minimum match score" />
            <span className="w-10 text-right font-mono tabular-nums text-fg">{minScore}%</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={eligibleOnly}
              onClick={() => setEligibleOnly(!eligibleOnly)}
              className="flex items-center gap-2.5 text-[13px] text-fg-2"
            >
              <span className={`relative h-5 w-9 rounded-full transition ${eligibleOnly ? "bg-violet" : "bg-white/[0.12]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${eligibleOnly ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Eligible only <span className="font-mono text-[12px] text-muted">({hidden} hidden)</span>
            </button>
            {filtersActive && (
              <button onClick={reset} className="text-[13px] text-violet hover:underline">
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{searching ? "Searching…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`}</span>
        {searching && <Loader2 size={15} className="animate-spin text-violet" />}
      </div>

      {error && <ErrorBox message={error} />}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="panel space-y-4 p-5">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 && !error ? (
        <div className="panel">
          <EmptyState icon={<SearchX size={20} />} title="No jobs match these filters">
            <button onClick={reset} className="text-violet hover:underline">
              Reset filters
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className={`grid items-start gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${searching && data ? "opacity-50" : ""}`}>
          {jobs.map((j, i) => (
            <JobCard key={j.job_id} job={j} index={i} saved={saved.has(j.job_id)} onSaved={() => setRefresh((r) => r + 1)} />
          ))}
        </div>
      )}
    </div>
  );
}
