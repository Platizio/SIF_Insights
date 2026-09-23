"use client";

import { useEffect, useState } from "react";

import { useIsClient } from "@/lib/use-is-client";

/* ============================================================
   The reader's clock, for the few surfaces that must not trust the
   build's.

   Every derivation in lib/data measures "today" as `navLastUpdated`,
   so a build is reproducible. A statically built page can still sit
   open across a date boundary, though — an NFO that closes at
   midnight must leave the ticker without waiting for the next
   deploy. This is the one sanctioned way to read the wall clock in a
   component (DESIGN rule: no `Date.now()` in render).

   Generalised from NfoBar's `useOpenNfos`, and it keeps that hook's
   hydration discipline: `useIsClient` is false during SSR and the
   first hydrating render, so this returns NULL there and the caller
   renders from its build-time value. The real clock lands on the pass
   after, as an ordinary update rather than a mismatch.
   ============================================================ */

/**
 * How often the clock is re-read.
 *
 * Every consumer has day granularity, so the only moment an answer can change
 * is a date rollover, and a single setTimeout aimed at midnight would be the
 * tidy version of this. It is also the fragile one — background tabs clamp
 * long timers, a sleeping laptop can fire one arbitrarily late, and nothing
 * self-corrects if the system clock moves. Polling bounds the error at a
 * minute and recovers on its own from all of those. `visibilitychange`
 * closes the last gap: a frozen tab may run no timers at all, so the clock is
 * re-read the moment the reader looks at it again.
 */
const RECHECK_MS = 60_000;

/** The current time on the client; null during SSR and the hydrating render. */
export function useToday(recheckMs: number = RECHECK_MS): Date | null {
  const isClient = useIsClient();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const recheck = () => setNow(new Date());
    const id = setInterval(recheck, recheckMs);
    const onVisibility = () => {
      if (!document.hidden) recheck();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [recheckMs]);

  return isClient ? now : null;
}

/**
 * Today as an ISO date (UTC) — `fallback` until the client clock is available.
 * Pass the build's `navLastUpdated` (or whatever date the server rendered
 * against) so the first client render matches the server's HTML exactly.
 */
export function useTodayIso(fallback: string): string {
  const now = useToday();
  return now ? now.toISOString().slice(0, 10) : fallback;
}
