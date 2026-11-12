/**
 * Typed browser client for the app's REST API. All UI network calls go through here, so request
 * shapes, error handling and response types live in one place.
 */
import type { AgentResult } from "./agent/types";
import type { ChatMessage } from "./schemas";
import type { ApplicationStatus, HealthStatus, Insights, JobFilters, JobMatch, Profile, ShortlistItem } from "./types";

/** Non-2xx response from the API. `message` is the server's user-facing `error` field. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  return json as T;
}

const send = <T>(method: string, path: string, body?: unknown) => request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Builds `/api/jobs?...` from filters, omitting empty values. */
export function jobsUrl(filters: { city?: string; q?: string; job_type?: JobFilters["job_type"] | "" } = {}): string {
  const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => Boolean(e[1])));
  const qs = params.toString();
  return qs ? `/api/jobs?${qs}` : "/api/jobs";
}

export const endpoints = {
  insights: "/api/insights",
  profile: "/api/profile",
  shortlist: "/api/shortlist",
  health: "/api/health",
} as const;

export const api = {
  login: (passcode: string) => send<{ ok: true }>("POST", "/api/login", { passcode }),
  logout: () => send<{ ok: true }>("POST", "/api/logout"),

  insights: () => request<Insights>(endpoints.insights),
  health: () => request<HealthStatus>(endpoints.health),
  jobs: (filters?: Parameters<typeof jobsUrl>[0]) => request<{ jobs: JobMatch[] }>(jobsUrl(filters)),

  profile: {
    get: () => request<{ profile: Profile }>(endpoints.profile),
    update: (fields: Partial<Pick<Profile, "skills" | "preferred_cities" | "interests">>) => send<{ profile: Profile }>("PATCH", endpoints.profile, fields),
  },

  shortlist: {
    list: () => request<{ shortlist: ShortlistItem[] }>(endpoints.shortlist),
    add: (job_id: number, reason?: string) => send<{ saved: { job_id: number }[] }>("POST", endpoints.shortlist, { job_id, reason }),
    update: (job_id: number, patch: { status?: ApplicationStatus; cover_note?: string }) => send<{ ok: true }>("PATCH", endpoints.shortlist, { job_id, ...patch }),
    remove: (job_id: number) => send<{ removed_job_id: number }>("DELETE", `${endpoints.shortlist}?job_id=${job_id}`),
  },

  agent: (messages: ChatMessage[]) => send<AgentResult>("POST", "/api/agent", { messages }),
};

/** Fired after any shortlist change so other mounted views (sidebar badge, panels) can refresh. */
export const SHORTLIST_CHANGED = "shortlist:changed";
export const notifyShortlistChanged = () => window.dispatchEvent(new Event(SHORTLIST_CHANGED));
