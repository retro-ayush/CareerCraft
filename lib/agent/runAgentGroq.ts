import "server-only";
import type { ChatMessage } from "../schemas";
import { tools } from "./tools";
import { toFunctionDeclarations } from "./defineTool";
import { buildSystemPrompt } from "./systemPrompt";
import { runTool } from "./runTool";
import type { AgentResult, AgentStep } from "./types";

/*
 * Same agent loop as runAgent.ts, but for Groq (OpenAI-compatible chat completions API).
 * Used when GROQ_API_KEY is set. Uses fetch, so no extra package is needed.
 */

const MAX_ROUNDS = 6;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type GroqMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const groqTools = toFunctionDeclarations(tools).map((d) => ({
  type: "function" as const,
  function: { name: d.name, description: d.description, parameters: d.parametersJsonSchema },
}));

async function callGroq(messages: GroqMessage[]) {
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
  const body = JSON.stringify({ model, messages, tools: groqTools, tool_choice: "auto", temperature: 0.2 });

  // Retries: once for a badly formed tool call (400 tool_use_failed), and up to 4 times for
  // short per-minute rate limits (free tier = 8000 tokens/min), waiting the time Groq asks for.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}` },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json.choices?.[0]?.message as { content: string | null; tool_calls?: ToolCall[] };
    const msg: string = json.error?.message ?? `Groq request failed (${res.status})`;
    if (res.status === 400 && attempt === 0 && /tool_use_failed|failed to call a function/i.test(JSON.stringify(json))) continue;
    const wait = retryAfterMs(msg);
    if (res.status === 429 && attempt < 4 && wait <= 20_000) {
      await new Promise((r) => setTimeout(r, Math.max(wait, 1500) + 500));
      continue;
    }
    throw new Error(res.status === 429 ? `429 quota: ${msg}` : msg);
  }
  throw new Error("Groq could not form a valid tool call. Please rephrase the request.");
}

/** Reads "try again in 794ms" / "13.8s" / "1m2.5s" from a Groq error. Infinity if not found. */
function retryAfterMs(msg: string): number {
  const m = msg.match(/try again in (?:(\d+)m(?!s))?([\d.]+)(ms|s)/);
  if (!m) return Infinity;
  const mins = Number(m[1] ?? 0);
  const val = Number(m[2]);
  return mins * 60_000 + (m[3] === "ms" ? val : val * 1000);
}

export async function runAgentGroq(history: ChatMessage[]): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history.map((m) => ({ role: m.role === "model" ? ("assistant" as const) : ("user" as const), content: m.text })),
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await callGroq(messages);
    const calls = reply?.tool_calls ?? [];

    if (calls.length === 0) {
      return { reply: reply?.content?.trim() || "Sorry, I could not answer that.", steps };
    }

    messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls });
    for (const call of calls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = { _raw: call.function.arguments };
      }
      const step = await runTool(call.function.name, args);
      steps.push(step);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(step.ok ? { result: step.result } : { error: step.error }),
      });
    }
  }

  return {
    reply: "I needed too many steps for this request. Please try a simpler or more specific question.",
    steps,
  };
}
