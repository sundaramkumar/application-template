import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** useState backed by localStorage, so list state (page, page size, search, filters,
    sort…) survives a page refresh.

    Keys share DataTable's namespace — `dt:<storageKey>:<suffix>` — so a screen and its
    table agree on one value (e.g. the search box restores the same `query` the screen
    fetches with). `isValid` guards against stale/corrupt stored shapes; anything that
    fails it (or unreadable storage) falls back to `initial`. */
export function usePersistedState<T>(
  storageKey: string,
  suffix: string,
  initial: T,
  isValid: (v: unknown) => v is T = (v): v is T => typeof v === typeof initial,
): [T, Dispatch<SetStateAction<T>>] {
  const lsKey = `dt:${storageKey}:${suffix}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [lsKey, value]);

  return [value, setValue];
}

/* Shape guards for the shared list-state types. */
export const isNonNegInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
export const isFilterConfig = <T,>(v: unknown): v is T =>
  !!v && typeof v === 'object' && Array.isArray((v as { groups?: unknown }).groups);
export const isSortRules = <T,>(v: unknown): v is T => Array.isArray(v);

/** Clamp a restored page that no longer exists (rows deleted, filter narrowed elsewhere). */
export function useClampPage(page: number, totalPages: number | undefined, setPage: (p: number) => void) {
  useEffect(() => {
    if (totalPages === undefined) return;
    const last = Math.max(0, totalPages - 1);
    if (page > last) setPage(last);
  }, [page, totalPages, setPage]);
}

export const isOneOf = <T,>(allowed: readonly T[]) => (v: unknown): v is T => allowed.includes(v as T);
