import historyRaw from "./raw/nav-history.json";

import { strategies } from "./core";
import { source } from "./source";
import type { NavPoint, NavQuote, Strategy } from "./types";

/* ============================================================
   NAV — the published series and the latest quote.

   This is the heavy module: nav-history.json is the one file whose
   size grows every business day. Nothing a client island imports may
   reach it (tests/client-imports.test.ts), which is why the types it
   produces live in types.ts and the formatters in lib/format.ts.
   ============================================================ */

/* TypeScript widens JSON's `[date, nav]` pairs to `(string | number)[]` — it
   cannot know each row has exactly two elements in that order. So we narrow at
   the boundary rather than asserting through `unknown`, which would hide a real
   shape change in the generated file behind a passing build. */
const rawSeries = historyRaw.series as Record<string, (string | number)[][]>;

/** Series keyed by our scheme id — the raw file is keyed by AMFI scheme code. */
const seriesByStrategy: Record<string, NavPoint[]> = Object.fromEntries(
  source.schemes.map((s) => [
    s.id,
    (rawSeries[s.amfiSchemeCode] ?? []).map(([date, nav]) => ({
      date: String(date),
      nav: Number(nav),
    })),
  ]),
);

/**
 * Every published NAV for a scheme, oldest first.
 *
 * Returns the stored series, so callers must not mutate it. An empty array
 * means we hold no history — render that absence, never a placeholder line.
 */
export function navHistory(strategyId: string): NavPoint[] {
  return seriesByStrategy[strategyId] ?? [];
}

/** Total published NAVs held across every scheme. */
export function navObservationCount(): number {
  return Object.values(seriesByStrategy).reduce((n, points) => n + points.length, 0);
}

/** Earliest published NAV held across every scheme, or null if none. */
export function earliestNavDate(): string | null {
  return (
    Object.values(seriesByStrategy)
      .map((points) => points[0]?.date)
      .filter((date): date is string => date !== undefined)
      .sort()[0] ?? null
  );
}

export const navByStrategy: Record<string, NavQuote> = Object.fromEntries(
  source.schemes.map((s) => {
    if (!Number.isFinite(s.nav)) return [s.id, { status: "pending" } as const];

    const points = seriesByStrategy[s.id] ?? [];
    const previous = points.length > 1 ? points[points.length - 2] : null;
    /* Measured against the previous published close, not a modelled one. The
       guard on `previous.nav` keeps a zero NAV from producing Infinity. */
    const changePct =
      previous && previous.nav !== 0
        ? ((s.nav - previous.nav) / previous.nav) * 100
        : null;

    return [
      s.id,
      {
        status: "live",
        today: s.nav,
        asOf: s.navAsOf,
        changePct,
        previous,
        observations: points.length,
      } as const,
    ];
  }),
);

export function getNav(strategyId: string): NavQuote {
  return navByStrategy[strategyId] ?? { status: "pending" };
}

/**
 * Live quotes, ordered by scheme name.
 *
 * Still deliberately NOT ordered by size of NAV — the ₹930 and ₹1,004 schemes
 * are priced off a different face value, not performing a hundred times better.
 *
 * A percentage move IS comparable across schemes (that is the whole point of
 * using percent rather than absolute rupees), so ranking by `changePct` is
 * defensible where a page actually wants a league table. This function stays
 * name-ordered because its callers want a stable, neutral index — ranking is
 * the caller's decision to make explicitly, not a default to inherit.
 */
export function liveQuotes(): {
  strategy: Strategy;
  nav: Extract<NavQuote, { status: "live" }>;
}[] {
  return strategies
    .map((strategy) => ({ strategy, nav: getNav(strategy.id) }))
    .filter(
      (r): r is { strategy: Strategy; nav: Extract<NavQuote, { status: "live" }> } =>
        r.nav.status === "live",
    )
    .sort((a, b) => a.strategy.name.localeCompare(b.strategy.name));
}
