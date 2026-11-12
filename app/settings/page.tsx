"use client";

import { Bot, CircleCheck, CircleX, Database, KeyRound, LogOut, Palette, ServerCog, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/cc/Panel";
import { ErrorState, Skeleton } from "@/components/cc/states";
import { ThemeSelect } from "@/components/cc/ThemeToggle";
import { useApi } from "@/components/cc/hooks";
import { useSignOut } from "@/components/useSignOut";
import { endpoints } from "@/lib/apiClient";
import type { HealthStatus } from "@/lib/types";

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

/** Settings: account, appearance, configuration status from /api/health (never shows values) and the agent's tools. */
export default function SettingsPage() {
  const health = useApi<HealthStatus>(endpoints.health);
  const signOut = useSignOut();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, appearance, configuration status and the assistant's tools." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel icon={<ShieldCheck size={20} />} title="Account" subtitle="Signed in with the shared team passcode">
            <div className="flex items-center justify-between gap-4 px-5 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full border border-border bg-surface-2 text-small font-semibold text-ink">DK</span>
                <div>
                  <p className="font-medium text-ink">Divya K</p>
                  <p className="font-mono text-[12px] text-ink-muted">S001</p>
                </div>
              </div>
              <Button onClick={signOut}>
                <LogOut /> Log out
              </Button>
            </div>
          </Panel>

          <Panel icon={<Palette size={20} />} title="Appearance" subtitle="Saved in this browser">
            <div className="px-5 pb-5">
              <ThemeSelect />
            </div>
          </Panel>
        </div>

        <Panel
          icon={<ServerCog size={20} />}
          title="Configuration"
          subtitle="Which environment settings are present. Values are never shown."
          action={
            health.data && (
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-small text-ink">
                {health.data.ok ? <CircleCheck size={16} className="text-accent" /> : <CircleX size={16} className="text-danger" />}
                {health.data.ok ? "All set" : "Incomplete"}
              </span>
            )
          }
        >
          {health.error && <ErrorState message={health.error} onRetry={health.reload} className="mx-5 mb-5" />}
          <ul className="space-y-1 px-3 pb-4">
            {health.loading && !health.data && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="mx-2 my-3 h-5" />)}
            {health.data &&
              Object.entries(health.data.settings).map(([k, ok]) => {
                const meta = SETTING_LABELS[k] ?? { label: k, icon: KeyRound };
                return (
                  <li key={k} className="flex min-h-10 items-center gap-3 rounded-card px-2 text-small">
                    <meta.icon size={20} className="text-ink-muted" />
                    <span className="flex-1 text-ink">{meta.label}</span>
                    {ok ? (
                      <span className="flex items-center gap-1.5 text-ink-muted">
                        <CircleCheck size={20} className="text-accent" /> Set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-danger">
                        <CircleX size={20} /> Missing
                      </span>
                    )}
                  </li>
                );
              })}
            {health.data && (
              <li className="flex min-h-10 items-center gap-3 rounded-card px-2 text-small">
                <Bot size={20} className="text-ink-muted" />
                <span className="flex-1 text-ink">Active AI provider</span>
                <span className="font-mono capitalize text-ink">{health.data.llm}</span>
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel icon={<Wrench size={20} />} title="Assistant tools" subtitle="The model chooses these itself. Zod validates every call before it runs.">
        <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-5">
          {TOOLS.map(([name, writes]) => (
            <li key={name} className="flex items-center justify-between gap-2 rounded-card border border-border px-3 py-2.5">
              <span className="truncate font-mono text-[12px] text-ink">{name}</span>
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-ink-muted">
                {writes && <Database size={12} />}
                {writes ? "write" : "read"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
