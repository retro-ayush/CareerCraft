"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, ChevronRight, Copy, Database, FlaskConical, GraduationCap, Loader2, RotateCcw, Search, Sparkles, SquarePen, Target, TriangleAlert } from "lucide-react";
import type { AgentStep } from "@/lib/agent/types";
import { api, notifyShortlistChanged } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { FadeIn } from "./cc/FadeIn";
import { toast } from "./cc/toast";

type Message = { role: "user" | "model"; text: string; steps?: AgentStep[] };

/** How many recent messages are sent with each request. */
const HISTORY_LIMIT = 20;

const SAMPLE_PROMPTS = [
  { icon: Search, text: "Find jobs matching my skills and save the top 3." },
  { icon: GraduationCap, text: "What skills should I learn next?" },
  { icon: Target, text: "Show me the best internship opportunities." },
  { icon: FlaskConical, text: "What if I learn React? How do my matches change?" },
  { icon: Sparkles, text: "Analyze my job readiness." },
];

const FOLLOW_UPS = ["Save the best one to my shortlist", "Which skill should I learn next?", "Include remote roles", "Write a cover note for it"];

const THINKING = ["Understanding your request", "Choosing the right tools", "Running tools on your data", "Checking the results", "Composing the answer"];

/** Readable labels for each tool, so it is clear what the agent did. */
const TOOL_LABELS: Record<string, string> = {
  getMyProfile: "Read profile",
  searchJobs: "Searched and scored jobs",
  scoreJobMatch: "Scored one job",
  getSkillGapPlan: "Built skill plan",
  whatIfLearnSkill: "Ran what-if simulation",
  getMyShortlist: "Read shortlist",
  saveToShortlist: "Saved to shortlist",
  updateMySkills: "Updated skills",
  updateApplicationStatus: "Updated application status",
  saveCoverNote: "Saved cover note",
};

export default function AgentChat({ onDataChanged }: { onDataChanged?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && (messages.length || loading)) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setThinkingIdx((i) => Math.min(i + 1, THINKING.length - 1)), 1500);
    return () => clearInterval(t);
  }, [loading]);

  // Deep link from other pages: /?ask=... sends that question once, then cleans the URL.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    const ask = new URLSearchParams(window.location.search).get("ask");
    if (!ask) return;
    asked.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    send(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  async function send(text: string, history: Message[] = messages) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...history, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setThinkingIdx(0);
    setLoading(true);
    setError("");

    try {
      // Only the most recent messages are sent, to keep requests small.
      const result = await api.agent(next.slice(-HISTORY_LIMIT).map(({ role, text }) => ({ role, text })));
      setMessages([...next, { role: "model", text: result.reply, steps: result.steps }]);
      const writes = result.steps.filter((s) => s.writes && s.ok);
      if (writes.length) {
        onDataChanged?.();
        notifyShortlistChanged();
        toast(`Assistant updated your data: ${[...new Set(writes.map((w) => TOOL_LABELS[w.tool] ?? w.tool))].join(", ")}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        /GEMINI_API_KEY|GROQ_API_KEY/.test(msg)
          ? "The assistant is not connected yet: add GROQ_API_KEY or GEMINI_API_KEY to .env.local (and Vercel), then restart. The Jobs, Shortlist and Profile pages work without it."
          : msg
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    send(lastUser.text, messages.slice(0, messages.lastIndexOf(lastUser)));
  }

  const lastIsModel = messages.at(-1)?.role === "model";

  return (
    <section aria-label="AI career assistant" className="flex h-[620px] flex-col overflow-hidden rounded-panel border border-border bg-surface lg:h-[680px]">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-card border border-border bg-surface-2 text-ink">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold leading-6 text-ink">Career assistant</h2>
            <p className="flex items-center gap-2 text-small text-ink-muted" aria-live="polite">
              <span aria-hidden className={`size-2 rounded-full ${loading ? "bg-warn" : "bg-accent"}`} />
              {loading ? "Working on it" : "Uses real tools on your data"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            disabled={loading}
          >
            <SquarePen /> New chat
          </Button>
        )}
      </header>

      <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col px-5 py-8 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
            <div className="mx-auto w-full max-w-lg text-center">
              <h3 className="text-h2 font-semibold text-ink">How can I help your job search?</h3>
              <p className="mt-2 text-small text-ink-muted">I search and score jobs, explain skill gaps, update your profile and manage your shortlist.</p>
            </div>
            <div className="mx-auto mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SAMPLE_PROMPTS.map(({ icon: Icon, text }, i) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => send(text)}
                  className={`flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left text-small text-ink transition-colors hover:border-border-strong hover:bg-surface-2 ${
                    i === SAMPLE_PROMPTS.length - 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <Icon size={20} className="shrink-0 text-ink-muted" />
                  <span className="flex-1">{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 px-5 py-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <FadeIn key={i} className="flex justify-end">
                  <p className="max-w-[82%] whitespace-pre-wrap rounded-card border border-border bg-surface-2 px-4 py-3 text-body text-ink">{m.text}</p>
                </FadeIn>
              ) : (
                <FadeIn key={i} className="group flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-card border border-border text-ink-muted">
                    <Bot size={16} />
                  </span>
                  <div className="min-w-0 max-w-[88%] flex-1 space-y-3">
                    {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
                    <div className="whitespace-pre-wrap text-body text-ink">{renderBold(m.text)}</div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(m.text);
                        toast("Copied to clipboard", "info");
                      }}
                      className="flex items-center gap-1.5 rounded-input text-[12px] text-ink-muted transition-colors hover:text-ink"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </FadeIn>
              )
            )}

            {loading && (
              <FadeIn className="flex gap-3" key="thinking">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-card border border-border text-ink-muted">
                  <Bot size={16} />
                </span>
                <p className="flex items-center gap-2 text-small text-ink-muted" role="status">
                  <Loader2 size={16} className="animate-spin" />
                  {THINKING[thinkingIdx]}
                </p>
              </FadeIn>
            )}

            {error && (
              <div role="alert" className="flex flex-col gap-3 rounded-card border border-danger/40 bg-danger/10 p-4 text-small sm:flex-row sm:items-start">
                <TriangleAlert size={20} className="shrink-0 text-danger" />
                <span className="flex-1 text-ink">{error}</span>
                <Button size="sm" onClick={retry}>
                  <RotateCcw /> Try again
                </Button>
              </div>
            )}

            {lastIsModel && !loading && (
              <div className="flex flex-wrap gap-2 pl-11">
                {FOLLOW_UPS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => send(f)}
                    className="h-8 rounded-full border border-border px-3 text-small text-ink transition-colors hover:border-border-strong hover:bg-surface-2"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-4"
      >
        <div className="flex items-end gap-2 rounded-card border border-border bg-bg p-2 pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <label htmlFor="assistant-input" className="sr-only">
            Message the assistant
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about jobs, skills or your shortlist"
            className="flex-1 resize-none self-center bg-transparent py-2 text-body text-ink outline-none placeholder:text-ink-muted focus-visible:outline-none"
          />
          <Button type="submit" variant="primary" size="icon" disabled={loading || !input.trim()} aria-label="Send">
            {loading ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 px-1 text-[12px] text-ink-muted">Enter to send · Shift + Enter for a new line</p>
      </form>
    </section>
  );
}

/** Each tool call the agent made, expandable to show arguments and results. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <details key={i} className="group/step overflow-hidden rounded-card border border-border">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 px-3 py-2 text-small transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            {s.ok ? <Check size={16} className="shrink-0 text-accent" aria-label="Succeeded" /> : <TriangleAlert size={16} className="shrink-0 text-danger" aria-label="Failed" />}
            <span className="font-medium text-ink">{TOOL_LABELS[s.tool] ?? s.tool}</span>
            <span className="hidden font-mono text-[12px] text-ink-muted sm:inline">{s.tool}()</span>
            {s.writes && (
              <span className="flex items-center gap-1 rounded-full border border-border px-2 text-[12px] leading-5 text-ink-muted">
                <Database size={12} /> writes
              </span>
            )}
            <ChevronRight size={16} className="ml-auto text-ink-muted transition-transform group-open/step:rotate-90" />
          </summary>
          <pre className="thin-scroll max-h-64 overflow-auto border-t border-border bg-bg p-3 font-mono text-[12px] leading-relaxed text-ink-muted">
            {JSON.stringify({ args: s.args, ...(s.ok ? { result: s.result } : { error: s.error }) }, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

/** Renders **bold** and *italic* from the model's reply as real elements (no HTML injection). */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return (
        <em key={i} className="text-ink">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}
