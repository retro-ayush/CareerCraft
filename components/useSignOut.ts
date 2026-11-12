"use client";

import { useCallback } from "react";
import { api } from "@/lib/apiClient";

/**
 * Clears the session cookie, then does a full page load of /login.
 * A hard navigation is deliberate: it discards all client state and the router cache, so nothing from the
 * signed-in session survives, and no background refetch of protected routes races the redirect.
 */
export function useSignOut() {
  return useCallback(async () => {
    await api.logout().catch(() => undefined); // navigate even if the request fails; the proxy still guards routes
    window.location.replace("/login");
  }, []);
}
