"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/apiClient";

/**
 * Loads JSON from an API route and reloads when `url` or `key` changes (or `reload()` is called).
 * Superseded requests are aborted, so a slow stale response never overwrites a newer one.
 * `loading` is derived (no synchronous setState in the effect).
 */
export function useApi<T>(url: string, key: unknown = 0) {
  const [nonce, setNonce] = useState(0);
  const requestKey = `${url}::${String(key)}::${nonce}`;
  const [state, setState] = useState<{ data: T | null; error: string; settledKey: string | null }>({ data: null, error: "", settledKey: null });

  useEffect(() => {
    const ac = new AbortController();
    request<T>(url, { signal: ac.signal }).then(
      (data) => setState({ data, error: "", settledKey: requestKey }),
      (err: unknown) => {
        if (ac.signal.aborted) return;
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : "Request failed", settledKey: requestKey }));
      }
    );
    return () => ac.abort();
  }, [url, requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  /** Local (optimistic) update of the cached data. */
  const setData = useCallback((data: T | null) => setState((s) => ({ ...s, data })), []);

  return { data: state.data, error: state.error, loading: state.settledKey !== requestKey, reload, setData };
}

/** Returns `value` only after it stops changing for `ms` (used for search-as-you-type). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
