import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/runAgent";
import { handle, parseBody } from "@/lib/http";
import { logger } from "@/lib/logger";
import { agentRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/agent  body: { messages: [{ role: "user" | "model", text }] } -> { reply, steps } */
export const POST = handle("agent.run", async (request) => {
  const { messages } = await parseBody(request, agentRequestSchema);
  const started = Date.now();
  const result = await runAgent(messages);
  logger.info("agent_run", {
    ms: Date.now() - started,
    tools: result.steps.map((s) => s.tool),
    failed: result.steps.filter((s) => !s.ok).length,
  });
  return NextResponse.json(result);
});
