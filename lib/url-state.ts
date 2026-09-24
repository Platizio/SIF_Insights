"use client";

import { useSyncExternalStore } from "react";

/* ============================================================
   The query string as React state.

   Extracted from app/nav-tracker/NavExplorer.tsx, which proved the
   pattern: the Screener and Compare keep their whole state in the
   URL so a screen is a link — shareable, bookmarkable, restored on
   reload — and they need exactly that store.

   NOT `useSearchParams`. It is the framework's reader, but on a
   prerendered route it forces the client tree up to the nearest
   <Suspense> to be client-side rendered, and the production build
   fails outright without that boundary — see
   next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md.
   Reading `window.location` instead keeps the prerendered HTML intact
   and charges the deep link, not the default load.

   The snapshot is the raw search STRING. Strings compare by value, so
   React's snapshot check is stable without caching — a parsed object
   would be a new identity on every read and loop the render. Parse it
   in a `useMemo` keyed on the string (lib/screener/url.ts).
   ============================================================ */

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

const readSearch = () => window.location.search;

/* The server has no URL to read, so it renders the default state — which is
   what the prerendered HTML must contain for hydration to match. */
const serverSearch = () => "";

/** `location.search` — "" or "?…" — re-read on every replaceSearch and on Back/Forward. */
export function useUrlSearch(): string {
  return useSyncExternalStore(subscribe, readSearch, serverSearch);
}

/**
 * Write a new query string, then tell every `useUrlSearch` to re-read it.
 *
 * REPLACED, never pushed: a screener touched twenty times would otherwise
 * turn Back into an undo log and bury the page the reader came from. The hash
 * is preserved, so an in-page anchor survives a filter change.
 *
 * Next patches replaceState and keeps its own router in sync with it — the
 * documented way to write a param without a navigation, per
 * next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
 * ("Native History API").
 */
export function replaceSearch(search: string): void {
  const bare = search.startsWith("?") ? search.slice(1) : search;
  const { pathname, hash } = window.location;
  window.history.replaceState(null, "", `${pathname}${bare ? `?${bare}` : ""}${hash}`);
  for (const onStoreChange of listeners) onStoreChange();
}
