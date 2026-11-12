import "server-only";
import { AppError } from "../errors";
import { logger } from "../logger";
import { tools } from "./tools";
import type { AgentStep } from "./types";

const toolsByName = new Map(tools.map((t) => [t.name, t]));

/** Finds the tool, checks the model's arguments with Zod, runs it. Shared by the Gemini and Groq loops. */
export async function runTool(name: string, rawArgs: unknown): Promise<AgentStep> {
  const tool = toolsByName.get(name);
  if (!tool) {
    return { tool: name, args: rawArgs, ok: false, writes: false, error: `Unknown tool: ${name}` };
  }

  // Never trust the model's arguments: check them with Zod first.
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ");
    return { tool: name, args: rawArgs, ok: false, writes: tool.writes, error: `Invalid arguments: ${message}` };
  }

  try {
    const result = await tool.run(parsed.data);
    return { tool: name, args: parsed.data, ok: true, writes: tool.writes, result };
  } catch (err) {
    // User-safe messages (AppError) go back to the model so it can explain; anything else is logged and hidden.
    const message = err instanceof AppError ? err.message : "The tool failed unexpectedly.";
    if (!(err instanceof AppError) || err.status >= 500) logger.error("tool_failed", { tool: name, message: err instanceof Error ? err.message : String(err) });
    return { tool: name, args: parsed.data, ok: false, writes: tool.writes, error: message };
  }
}
