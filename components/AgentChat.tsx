"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Database,
  FlaskConical,
  GraduationCap,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  SquarePen,
  Target,
  TriangleAlert,
} from "lucide-react";
import type { AgentStep } from "@/lib/agent/types";
import { api, notifyShortlistChanged } from "@/lib/apiClient";
import { toast } from "./ui";

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
        toast(`Agent updated your data: ${[...new Set(writes.map((w) => TOOL_LABELS[w.tool] ?? w.tool))].join(", ")}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        /GEMINI_API_KEY|GROQ_API_KEY/.test(msg)
          ? "The agent is not connected yet: add GROQ_API_KEY or GEMINI_API_KEY to .env.local (and Vercel), then restart. The Jobs, Shortlist and Profile pages work without it."
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
    <section className="panel ring-gradient animate-enter flex h-[620px] flex-col overflow-hidden lg:h-[680px]">
      <header className="flex items-center justify-between gap-3 border-b border-edge px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-blue shadow-[0_8px_24px_-8px_rgb(116_97_240/0.9)]">
            <Bot size={18} className="text-white" />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel ${loading ? "animate-pulse bg-warn" : "bg-good"}`} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">AI Career Assistant</h2>
            <p className="text-[12.5px] text-muted">{loading ? "Working on it…" : "Online · uses real tools on your data"}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            disabled={loading}
            className="btn-ghost !px-2.5 !py-1.5 text-[12.5px]"
            title="Start a new chat"
          >
            <SquarePen size={14} /> New chat
          </button>
        )}
      </header>

      <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col px-5 py-8 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
            <div className="mx-auto w-full max-w-lg text-center">
              <span className="animate-float mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet/30 bg-violet/10">
                <Sparkles size={24} className="text-violet" />
              </span>
              <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">How can I help your job search?</h3>
              <p className="mt-1.5 text-[13.5px] text-muted">I search and score jobs, explain skill gaps, update your profile and manage your shortlist.</p>
            </div>
            <div className="mx-auto mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SAMPLE_PROMPTS.map(({ icon: Icon, text }, i) => (
                <button
                  key={text}
                  onClick={() => send(text)}
                  style={{ animationDelay: `${120 + i * 50}ms` }}
                  className={`animate-enter group flex items-center gap-3 rounded-xl border border-edge bg-raised/60 px-3.5 py-3 text-left text-[13px] text-fg-2 transition hover:-translate-y-0.5 hover:border-violet/40 hover:bg-hover hover:text-fg active:scale-[0.98] ${
                    i === SAMPLE_PROMPTS.length - 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <Icon size={16} className="shrink-0 text-violet" />
                  <span className="flex-1">{text}</span>
                  <ChevronRight size={14} className="-translate-x-1 text-muted opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="animate-enter flex justify-end">
                  <p className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-violet-strong to-[#5b6cf5] px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-[0_8px_24px_-12px_rgb(116_97_240/0.8)]">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="animate-enter group flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-edge bg-raised">
                    <Sparkles size={14} className="text-violet" />
                  </span>
                  <div className="min-w-0 max-w-[88%] flex-1 space-y-2.5">
                    {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
                    <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-edge bg-raised px-4 py-3 text-[14px] leading-[1.65] text-fg">{renderBold(m.text)}</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.text);
                        toast("Copied to clipboard", "info");
                      }}
                      className="flex items-center gap-1.5 text-[12px] text-muted opacity-0 transition hover:text-fg focus:opacity-100 group-hover:opacity-100"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="animate-enter flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-edge bg-raised">
                  <Sparkles size={14} className="text-violet" />
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-edge bg-raised px-4 py-3.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet" style={{ animationDelay: `${d * 140}ms` }} />
                    ))}
                  </div>
                  <p key={thinkingIdx} className="animate-enter flex items-center gap-2 pl-1 text-[12px] text-muted">
                    <Loader2 size={12} className="animate-spin text-violet" />
                    {THINKING[thinkingIdx]}…
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="animate-enter flex items-start gap-2.5 rounded-xl border border-bad/20 bg-bad/10 px-3.5 py-3 text-[13.5px] text-bad">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={retry} className="flex items-center gap-1 font-medium text-fg hover:underline">
                  <RotateCcw size={13} /> Retry
                </button>
              </div>
            )}

            {lastIsModel && !loading && (
              <div className="flex flex-wrap gap-2 pl-10">
                {FOLLOW_UPS.map((f, i) => (
                  <button
                    key={f}
                    onClick={() => send(f)}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="animate-enter rounded-full border border-edge bg-raised/60 px-3 py-1.5 text-[12.5px] text-fg-2 transition hover:border-violet/45 hover:text-fg active:scale-95"
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
        className="border-t border-edge p-3.5"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-edge bg-raised p-2 pl-4 transition focus-within:border-violet/50 focus-within:ring-4 focus-within:ring-violet/10">
          <textarea
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
            placeholder="Ask about jobs, skills or your shortlist…"
            className="flex-1 resize-none self-center bg-transparent py-1.5 text-[14px] outline-none placeholder:text-faint"
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send" className="btn !h-9 !w-9 !rounded-xl !p-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}
          </button>
        </div>
        <p className="mt-2 px-1 text-[11.5px] text-faint">Enter to send · Shift + Enter for a new line</p>
      </form>
    </section>
  );
}

/** Each tool call the agent made, expandable to show arguments and results. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <details key={i} style={{ animationDelay: `${i * 70}ms` }} className="animate-enter group/step overflow-hidden rounded-xl border border-edge bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2 text-[12.5px] transition hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
            <span className={`grid h-5 w-5 place-items-center rounded-md ${s.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>
              {s.ok ? <Check size={12} strokeWidth={2.5} /> : <TriangleAlert size={11} />}
            </span>
            <span className="font-medium text-fg">{TOOL_LABELS[s.tool] ?? s.tool}</span>
            <span className="hidden font-mono text-[11px] text-faint sm:inline">{s.tool}()</span>
            {s.writes && (
              <span className="flex items-center gap-1 rounded-md border border-warn/25 bg-warn/10 px-1.5 py-0.5 text-[10.5px] font-medium text-warn">
                <Database size={10} /> writes
              </span>
            )}
            <ChevronRight size={13} className="ml-auto text-muted transition-transform group-open/step:rotate-90" />
          </summary>
          <pre className="thin-scroll max-h-64 overflow-auto border-t border-edge bg-base/60 p-3 font-mono text-[11px] leading-relaxed text-fg-2">
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
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return (
        <em key={i} className="text-fg">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}
