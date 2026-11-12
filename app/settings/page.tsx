"use client";

import { Bot, CircleCheck, CircleX, Database, KeyRound, LogOut, ServerCog, ShieldCheck, Wrench } from "lucide-react";
import { Card, ErrorBox, PageHeader, Skeleton, useApi } from "@/components/ui";

type Health = { ok: boolean; llm: "groq" | "gemini" | "none"; settings: Record<string, boolean> };

const SETTING_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  LLM_KEY: { label: "AI model key (Groq or Gemini)", icon: Bot },
  SUPABASE_URL: { label: "Supabase project URL", icon: Database },
  SUPABASE_SECRET_KEY: { label: "Supabase server key", icon: KeyRound },
  APP_PASSCODE: { label: "Team passcode", icon: ShieldCheck },
};

const TOOLS = [
  ["getMyProfile", false],
  ["searchJobs", false],
  ["scoreJobMatch", false],
  ["getSkillGapPlan", false],
  ["whatIfLearnSkill", false],
  ["getMyShortlist", false],
  ["saveToShortlist", true],
  ["updateMySkills", true],
  ["updateApplicationStatus", true],
  ["saveCoverNote", true],
] as const;

/** Settings: account, configuration status from /api/health (never shows values) and the agent's tools. */
export default function SettingsPage() {
  const health = useApi<Health>("/api/health");

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, configuration status and the AI agent's toolset." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={<ShieldCheck size={16} />} title="Account" subtitle="Signed in with the shared team passcode">
          <div className="flex items-center justify-between gap-4 px-5 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet to-blue text-[14px] font-semibold text-white">DK</span>
              <div>
                <p className="font-medium">Divya K</p>
                <p className="font-mono text-[12px] text-muted">S001</p>
              </div>
            </div>
            <button onClick={logout} className="btn-ghost text-[13px] hover:!border-bad/40 hover:!text-bad">
              <LogOut size={14} /> Log out
            </button>
          </div>
        </Card>

        <Card
          icon={<ServerCog size={16} />}
          title="Configuration"
          subtitle="Which environment settings are present. Values are never shown."
          action={
            health.data && (
              <span className={`chip ${health.data.ok ? "border-good/20 bg-good/10 text-good" : "border-warn/25 bg-warn/10 text-warn"}`}>{health.data.ok ? "All set" : "Incomplete"}</span>
            )
          }
        >
          {health.error && <ErrorBox message={health.error} />}
          <ul className="space-y-1 px-3 pb-4">
            {health.loading && !health.data && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="mx-2 my-2 h-5" />)}
            {health.data &&
              Object.entries(health.data.settings).map(([k, ok]) => {
                const meta = SETTING_LABELS[k] ?? { label: k, icon: KeyRound };
                return (
                  <li key={k} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13.5px]">
                    <meta.icon size={15} className="text-muted" />
                    <span className="flex-1 text-fg-2">{meta.label}</span>
                    {ok ? <CircleCheck size={16} className="text-good" /> : <CircleX size={16} className="text-bad" />}
                  </li>
                );
              })}
            {health.data && (
              <li className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13.5px]">
                <Bot size={15} className="text-muted" />
                <span className="flex-1 text-fg-2">Active AI provider</span>
                <span className="font-mono text-[12.5px] capitalize text-fg">{health.data.llm}</span>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card icon={<Wrench size={16} />} title="Agent tools" subtitle="The model chooses these itself. Zod validates every call before it runs.">
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-5">
          {TOOLS.map(([name, writes]) => (
            <div key={name} className="flex items-center justify-between gap-2 rounded-xl border border-edge bg-raised/50 px-3 py-2.5">
              <span className="truncate font-mono text-[12px] text-fg-2">{name}</span>
              <span className={`shrink-0 text-[10.5px] font-medium ${writes ? "text-warn" : "text-muted"}`}>{writes ? "write" : "read"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
