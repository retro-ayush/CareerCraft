"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleAlert, Eye, EyeOff, Gauge, ListChecks, Loader2, Lock, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { JobMatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Brand } from "@/components/AppShell";
import { FadeIn } from "@/components/cc/FadeIn";
import { JobMatchCard } from "@/components/cc/JobMatchCard";
import { SkillChip } from "@/components/cc/SkillChip";
import { ThemeToggle } from "@/components/cc/ThemeToggle";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Only roles you meet the CGPA and branch rules for" },
  { icon: Gauge, text: "Every match score is explained, skill by skill" },
  { icon: Lock, text: "Private to your team behind a shared passcode" },
];

const STEPS = [
  { icon: UserRound, title: "Share your profile", text: "Add your degree, CGPA, skills and the cities you'd work in." },
  { icon: ListChecks, title: "See eligible matches", text: "Every open role is checked for eligibility and scored: 70% required skills, 20% nice-to-have, 10% location." },
  { icon: TrendingUp, title: "Close skill gaps", text: "See which missing skills unlock the most jobs, then shortlist the roles you'll apply for." },
];

/** Static example shown to visitors before they sign in. Not real data. */
const SAMPLE_JOB: JobMatch = {
  job_id: 0,
  title: "Junior data analyst",
  company: "Northwind Analytics",
  city: "Chennai",
  work_mode: "Hybrid",
  job_type: "Full-time",
  salary_lpa: "6–8 LPA",
  apply_by: "2026-12-15",
  days_left: 12,
  eligible: true,
  ineligible_reasons: [],
  match_score: 76,
  breakdown: { required: 56, nice_to_have: 10, location: 10 },
  matched_skills: ["sql", "python", "excel", "statistics", "power bi"],
  missing_required: ["tableau"],
  missing_nice_to_have: ["dbt"],
};

const PRIVACY_NOTE = "The passcode keeps the app and the model quota private.";

/** Landing page and sign-in. Every signed-out visit lands here (see proxy.ts). */
export default function LoginPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [passcode, setPasscode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(passcode);
      setSuccess(true);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Login failed");
      inputRef.current?.focus();
    }
  }

  /** The preview card's Shortlist button points visitors at the passcode field. */
  function focusPasscode() {
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 md:px-8">
        <Brand />
        <nav className="flex items-center gap-1">
          <a href="#how-it-works" className="hidden rounded-card px-3 py-2 text-small text-ink-muted transition-colors hover:text-ink sm:inline-block">
            How it works
          </a>
          <a href="#preview" className="hidden rounded-card px-3 py-2 text-small text-ink-muted transition-colors hover:text-ink sm:inline-block">
            Preview
          </a>
          <ThemeToggle />
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-12 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-24">
          <FadeIn>
            <h1 className="text-[40px] font-bold leading-[44px] tracking-[-0.02em] text-ink sm:text-display sm:leading-[60px]">Find jobs you&rsquo;re ready for today</h1>
            <p className="mt-4 max-w-lg text-[18px] leading-7 text-ink-muted">Your AI career assistant for jobs you&rsquo;re ready for.</p>
            <ul className="mt-8 space-y-3">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-body text-ink">
                  <span className="grid size-8 shrink-0 place-items-center rounded-card bg-accent-soft text-accent">
                    <Icon size={20} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </FadeIn>

          <FadeIn index={2}>
            <form onSubmit={handleSubmit} className="rounded-panel border border-border bg-surface p-6 sm:p-8" aria-labelledby="signin-title" noValidate>
              <h2 id="signin-title" className="text-h2 font-semibold text-ink">
                Sign in
              </h2>
              <p className="mt-1 text-small text-ink-muted">Enter the passcode your team shared with you.</p>

              <div className="mt-6 space-y-2">
                <Label htmlFor="passcode">Team passcode</Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="passcode"
                    type={show ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (error) setError("");
                    }}
                    autoComplete="current-password"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "passcode-error passcode-help" : "passcode-help"}
                    disabled={loading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide passcode" : "Show passcode"}
                    aria-pressed={show}
                    className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-input text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {error && (
                  <p id="passcode-error" role="alert" className="flex items-center gap-2 text-small text-danger">
                    <CircleAlert size={16} className="shrink-0" /> {error}
                  </p>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" disabled={loading || !passcode} className="mt-6 w-full">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" /> {success ? "Opening your dashboard" : "Checking passcode"}
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <p id="passcode-help" className="mt-4 text-small text-ink-muted">
                {PRIVACY_NOTE}
              </p>
            </form>
          </FadeIn>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-4 border-t border-border">
          <div className="mx-auto max-w-[1120px] px-4 py-16 md:px-8 lg:py-24">
            <h2 className="text-[28px] font-bold leading-9 text-ink md:text-h1">How it works</h2>
            <p className="mt-2 max-w-xl text-body text-ink-muted">Three steps from your profile to a shortlist you can act on.</p>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-card border border-border bg-surface p-6 transition-colors hover:bg-surface-2">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-card border border-border bg-surface-2 text-ink">
                      <Icon size={20} />
                    </span>
                    <span className="font-mono text-small text-ink-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-[20px] font-semibold leading-7 text-ink">{title}</h3>
                  <p className="mt-2 text-body text-ink-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Preview */}
        <section id="preview" className="scroll-mt-4 border-t border-border">
          <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
            <div>
              <h2 className="text-[28px] font-bold leading-9 text-ink md:text-h1">What a match looks like</h2>
              <p className="mt-2 max-w-md text-body text-ink-muted">
                Each role shows your score, the skills you already have and the ones you&rsquo;d need to add. Open the skill gaps to see how the score is built.
              </p>
              <dl className="mt-8 space-y-3 text-small">
                <div className="flex items-center gap-3">
                  <dt>
                    <SkillChip skill="sql" variant="have" />
                  </dt>
                  <dd className="text-ink-muted">A skill you have</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt>
                    <SkillChip skill="tableau" variant="gap" />
                  </dt>
                  <dd className="text-ink-muted">A skill gap to close</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="font-mono font-bold text-accent">70%+</dt>
                  <dd className="text-ink-muted">Ready to apply. Lower scores show in amber.</dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="mb-3 text-small text-ink-muted">Sample match, not real data</p>
              <JobMatchCard job={SAMPLE_JOB} preview onShortlist={focusPasscode} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-8 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <Brand size="sm" />
          <p className="flex items-center gap-2">
            <Lock size={16} className="shrink-0" /> {PRIVACY_NOTE}
          </p>
        </div>
      </footer>
    </div>
  );
}
