"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentResult, AgentStep } from "@/lib/agent/types";

type Message = { role: "user" | "model"; text: string; steps?: AgentStep[] };

const SAMPLE_PROMPTS = [
  "Find jobs in Chennai that match my skills and save the top 3.",
  "Which skills am I missing for data analyst roles?",
  "I just learned Docker, add it to my profile and search again.",
  "What if I learn React and Power BI? How do my matches change?",
  "Write a cover note for my best shortlisted job and save it.",
  "I applied to the top job in my shortlist, update its status.",
];

/** Friendly labels so judges can read what the agent did. */
const TOOL_LABELS: Record<string, string> = {
  getMyProfile: "Read profile",
  searchJobs: "Searched & scored jobs",
  scoreJobMatch: "Scored one job",
  getSkillGapPlan: "Built skill ROI plan",
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
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last 20 messages are sent, to keep requests small.
        body: JSON.stringify({ messages: next.slice(-20).map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data.error ?? "Request failed";
        throw new Error(
          /GEMINI_API_KEY/.test(msg)
            ? "The agent is not connected yet: add GROQ_API_KEY or GEMINI_API_KEY to .env.local (and Vercel), then restart. The Jobs, Shortlist and Profile pages work without it."
            : msg
        );
      }
      const result = data as AgentResult;
      setMessages([...next, { role: "model", text: result.reply, steps: result.steps }]);
      if (result.steps.some((s) => s.writes && s.ok)) onDataChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Job search chat</h2>
        <p className="text-xs text-slate-500">Ask in plain English. Every tool the agent uses is shown, and writes are marked.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Try one of these:</p>
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-indigo-600 px-3 py-2 text-sm text-white"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
              {m.role === "model" ? (
                <div className="whitespace-pre-wrap rounded-2xl bg-slate-100 px-3 py-2 text-sm">{renderBold(m.text)}</div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {loading && <p className="animate-pulse text-sm text-slate-500">Agent is thinking and calling tools...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Find remote internships I am eligible for"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/** Shows each tool call so users (and judges) can see what the agent did. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <details key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <summary className="cursor-pointer select-none">
            <span className={s.ok ? "text-emerald-700" : "text-red-600"}>{s.ok ? "Done" : "Failed"}</span>
            {" · "}
            <span className="font-medium">{TOOL_LABELS[s.tool] ?? s.tool}</span>{" "}
            <span className="font-mono text-slate-400">{s.tool}</span>
            {s.writes && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">writes data</span>}
          </summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-600">
            {JSON.stringify({ args: s.args, ...(s.ok ? { result: s.result } : { error: s.error }) }, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

/** Renders **bold** from the model's reply as real bold text (no HTML injection). */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}
