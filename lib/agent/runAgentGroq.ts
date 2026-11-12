import "server-only";
import { GROQ_MODEL, requireEnv } from "../env";
import { UpstreamError } from "../errors";
import { logger } from "../logger";
import type { ChatMessage } from "../schemas";
import { FALLBACK_REPLY, LLM_TIMEOUT_MS, MAX_TOOL_ROUNDS, TEMPERATURE, TOO_MANY_STEPS_REPLY } from "./config";
import { toFunctionDeclarations } from "./defineTool";
import { runTool } from "./runTool";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";
import type { AgentResult, AgentStep } from "./types";

/*
 * The same agent loop as runAgent.ts, for Groq's OpenAI-compatible Chat Completions API.
 * Uses fetch directly, so no extra SDK dependency.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_ATTEMPTS = 5;
/** Only wait out a rate limit if Groq asks for at most this long; otherwise fail fast. */
const MAX_RATE_LIMIT_WAIT_MS = 20_000;

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type AssistantMessage = { content: string | null; tool_calls?: ToolCall[] };
type GroqMessage =
  | { role: "system" | "user"; content: string }
  | ({ role: "assistant" } & AssistantMessage)
  | { role: "tool"; tool_call_id: string; content: string };

const groqTools = toFunctionDeclarations(tools).map((d) => ({
  type: "function" as const,
  function: { name: d.name, description: d.description, parameters: d.parametersJsonSchema },
}));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads "try again in 794ms" / "13.8s" / "1m2.5s" from a Groq error message. Infinity if absent. */
export function retryAfterMs(message: string): number {
  const m = message.match(/try again in (?:(\d+)m(?!s))?([\d.]+)(ms|s)/);
  if (!m) return Infinity;
  const minutes = Number(m[1] ?? 0);
  const value = Number(m[2]);
  return minutes * 60_000 + (m[3] === "ms" ? value : value * 1000);
}

/**
 * One chat completion with bounded retries:
 * - once for a malformed tool call (400 tool_use_failed), which usually succeeds on retry;
 * - for short per-minute rate limits (429), waiting the time Groq asks for.
 */
async function callGroq(messages: GroqMessage[]): Promise<AssistantMessage> {
  const apiKey = requireEnv("GROQ_API_KEY");
  const body = JSON.stringify({ model: GROQ_MODEL, messages, tools: groqTools, tool_choice: "auto", temperature: TEMPERATURE });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    }).catch((err: unknown) => {
      throw new UpstreamError(err instanceof Error && err.name === "TimeoutError" ? "The AI provider took too long to respond. Please try again." : "Could not reach the AI provider.", 504);
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok) return (json.choices?.[0]?.message ?? { content: null }) as AssistantMessage;

    const message: string = json.error?.message ?? `Groq request failed (${res.status})`;
    if (res.status === 400 && attempt === 0 && /tool_use_failed|failed to call a function/i.test(JSON.stringify(json))) {
      logger.warn("groq_tool_call_retry");
      continue;
    }
    const wait = retryAfterMs(message);
    if (res.status === 429 && attempt < MAX_ATTEMPTS - 1 && wait <= MAX_RATE_LIMIT_WAIT_MS) {
      logger.warn("groq_rate_limit_wait", { waitMs: wait });
      await sleep(Math.max(wait, 1500) + 500);
      continue;
    }
    throw new UpstreamError(res.status === 429 ? "The AI rate limit was reached. Wait a minute and try again." : message, res.status === 429 ? 429 : 502);
  }
  throw new UpstreamError("The AI could not form a valid tool call. Please rephrase the request.");
}

function parseArguments(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw }; // Zod will reject this with a clear message the model can act on.
  }
}

export async function runAgentGroq(history: ChatMessage[]): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history.map((m) => ({ role: m.role === "model" ? ("assistant" as const) : ("user" as const), content: m.text })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS.groq; round++) {
    const reply = await callGroq(messages);
    const calls = reply.tool_calls ?? [];
    if (calls.length === 0) return { reply: reply.content?.trim() || FALLBACK_REPLY, steps };

    messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const step = await runTool(call.function.name, parseArguments(call.function.arguments));
      steps.push(step);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(step.ok ? { result: step.result } : { error: step.error }) });
    }
  }

  return { reply: TOO_MANY_STEPS_REPLY, steps };
}
