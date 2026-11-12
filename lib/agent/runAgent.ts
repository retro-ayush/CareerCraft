import "server-only";
import type { Content, Part } from "@google/genai";
import { GEMINI_MODEL, activeLlmProvider } from "../env";
import { getGemini } from "../gemini";
import type { ChatMessage } from "../schemas";
import { FALLBACK_REPLY, MAX_TOOL_ROUNDS, TEMPERATURE, TOO_MANY_STEPS_REPLY } from "./config";
import { toFunctionDeclarations } from "./defineTool";
import { runAgentGroq } from "./runAgentGroq";
import { runTool } from "./runTool";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";
import type { AgentResult, AgentStep } from "./types";

/** Computed once per server instance; the tool list is static. */
const functionDeclarations = toFunctionDeclarations(tools);

/**
 * THE AGENT LOOP (provider entry point).
 * 1. Send the chat and the tool list to the model.
 * 2. If the model requests tools, validate the arguments with Zod and run them (runTool).
 * 3. Send the results back.
 * 4. Repeat until the model answers in text, or MAX_TOOL_ROUNDS is reached.
 *
 * Uses Groq when GROQ_API_KEY is set, otherwise Gemini. Both share the same tools and validation.
 */
export async function runAgent(messages: ChatMessage[]): Promise<AgentResult> {
  if (activeLlmProvider() === "groq") return runAgentGroq(messages);
  return runAgentGemini(messages);
}

async function runAgentGemini(messages: ChatMessage[]): Promise<AgentResult> {
  const ai = getGemini();
  const steps: AgentStep[] = [];
  const contents: Content[] = messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  for (let round = 0; round < MAX_TOOL_ROUNDS.gemini; round++) {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction: buildSystemPrompt(), tools: [{ functionDeclarations }], temperature: TEMPERATURE },
    });

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) return { reply: response.text?.trim() || FALLBACK_REPLY, steps };

    // Keep the model's own turn (it carries the tool request) in the history.
    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    const responseParts: Part[] = [];
    for (const call of calls) {
      const step = await runTool(call.name ?? "", call.args ?? {});
      steps.push(step);
      responseParts.push({
        functionResponse: { id: call.id, name: call.name, response: step.ok ? { result: step.result } : { error: step.error } },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { reply: TOO_MANY_STEPS_REPLY, steps };
}
