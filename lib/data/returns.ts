import { PERFORMANCE_MIN_AGE_DAYS } from "@/lib/compliance";

import { navLastUpdated, strategyById } from "./core";
import { addDays, daysBetween, minusMonths, monthEnd, monthOf, previousMonth } from "./dates";
import { inception, schemeFacts } from "./facts";
import { navHistory } from "./nav";
import type { NavPoint, Period, ReturnResult } from "./types";

/* ============================================================
   Returns, volatility and drawdown — computed from the published
   series and nothing else.

   The conventions below are the site's methodology, and /methodology
   states them in words. They are written once, here, as data, so the
   page and the arithmetic cannot drift apart:

   - The END of every period is the scheme's last published NAV on or
     before `asOf` (default `navLastUpdated`). A scheme that filed late
     is measured to its own last close, never to a date it has no
     price for.
   - The START is the last NAV on or before the target date. 1W is 7
     calendar days back; 1M–2Y are calendar-month offsets, clamped to
     month end. If the series begins after the target, or the start
     point sits more than `maxStartGapDays` before it, the period is
     "insufficient history" — we do not stretch a 5-month record into a
     "6M" figure, and we do not measure a 6M return from a stale print.
   - 1D is against the previous PUBLISHED NAV, the same figure
     `getNav().changePct` shows.
   - Below a year the figure is absolute; from 365 days it is CAGR.
   - SI starts at face value on the allotment date when BOTH are
     sourced, and otherwise at the first published NAV — the basis is
     returned so the label can say which.

   tests/reference/returns.ts re-implements all of this independently,
   from the raw JSON, and tests/returns.test.ts holds the two together.
   ============================================================ */

export const RETURN_RULES = {
  annualiseFromDays: 365,
  maxStartGapDays: 7,
  minObsForRisk: 126,
  tradingDaysPerYear: 252,
} as const;

/** Index of the last point dated on or before `date`, or −1. Series are ascending. */
function lastOnOrBefore(points: NavPoint[], date: string): number {
  let lo = 0;
  let hi = points.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** The series cut at `asOf`, inclusive. */
function seriesTo(id: string, asOf: string | undefined): NavPoint[] {
  const all = navHistory(id);
  const end = lastOnOrBefore(all, asOf ?? navLastUpdated);
  return end === all.length - 1 ? all : all.slice(0, end + 1);
}

function targetDate(period: Exclude<Period, "1D" | "SI">, to: string): string {
  switch (period) {
    case "1W":
      return addDays(to, -7);
    case "1M":
      return minusMonths(to, 1);
    case "3M":
      return minusMonths(to, 3);
    case "6M":
      return minusMonths(to, 6);
    case "1Y":
      return minusMonths(to, 12);
    case "2Y":
      return minusMonths(to, 24);
  }
}

function measured(from: NavPoint, to: NavPoint, basis: "nav" | "face-value"): ReturnResult {
  const days = daysBetween(from.date, to.date);
  if (!(from.nav > 0) || days < 0) return { status: "insufficient-history" };
  const growth = to.nav / from.nav;
  const annualised = days >= RETURN_RULES.annualiseFromDays;
  const pct = annualised ? (Math.pow(growth, 365 / days) - 1) * 100 : (growth - 1) * 100;
  return { status: "ok", pct, annualised, from, to, basis };
}

/**
 * The scheme's return over `period`, ending at its last NAV on or before
 * `asOf`.
 *
 * `minAgeDays` overrides PERFORMANCE_MIN_AGE_DAYS; it exists so the withheld
 * branch can be exercised while the compliance threshold is still 0.
 */
export function trailingReturn(
  id: string,
  period: Period,
  o: { asOf?: string; minAgeDays?: number } = {},
): ReturnResult {
  if (navHistory(id).length === 0) return { status: "not-captured" };

  const points = seriesTo(id, o.asOf);
  if (points.length === 0) return { status: "insufficient-history" };
  const end = points.length - 1;
  const to = points[end];

  const minAge = o.minAgeDays ?? PERFORMANCE_MIN_AGE_DAYS;
  if (minAge > 0) {
    const began = inception(id);
    if (!began || daysBetween(began.date, to.date) < minAge) return { status: "withheld" };
  }

  if (period === "1D") {
    return end >= 1 ? measured(points[end - 1], to, "nav") : { status: "insufficient-history" };
  }

  if (period === "SI") {
    const s = strategyById.get(id);
    const facts = s ? schemeFacts(s.amfiSchemeCode) : null;
    if (facts?.allotmentDate && facts.faceValue && facts.allotmentDate.value <= to.date) {
      return measured(
        { date: facts.allotmentDate.value, nav: facts.faceValue.value },
        to,
        "face-value",
      );
    }
    return end >= 1 ? measured(points[0], to, "nav") : { status: "insufficient-history" };
  }

  const target = targetDate(period, to.date);
  const start = lastOnOrBefore(points, target);
  if (start < 0 || daysBetween(points[start].date, target) > RETURN_RULES.maxStartGapDays) {
    return { status: "insufficient-history", needsFrom: target };
  }
  return measured(points[start], to, "nav");
}

/**
 * Calendar-month returns, month-end NAV to month-end NAV, for COMPLETED
 * months only — a month is complete once `asOf` has reached its last day.
 *
 * The launch month is never included: it has no prior month-end to start
 * from, and a figure measured from the first NAV would be a different
 * quantity sitting in the same column. Each end point obeys the same
 * `maxStartGapDays` rule as a trailing return, so a month bracketed by a stale
 * print is skipped rather than stretched.
 */
export function monthlyReturns(
  id: string,
  o: { asOf?: string } = {},
): { month: string; pct: number }[] {
  const asOf = o.asOf ?? navLastUpdated;
  const points = seriesTo(id, asOf);
  if (points.length < 2) return [];

  const out: { month: string; pct: number }[] = [];
  const gap = RETURN_RULES.maxStartGapDays;
  let month = monthOf(points[0].date);
  const lastMonth = monthOf(asOf);

  while (month <= lastMonth) {
    const close = monthEnd(month);
    if (close > asOf) break;
    const open = monthEnd(previousMonth(month));
    const s = lastOnOrBefore(points, open);
    const e = lastOnOrBefore(points, close);
    if (
      s >= 0 &&
      e > s &&
      daysBetween(points[s].date, open) <= gap &&
      daysBetween(points[e].date, close) <= gap
    ) {
      out.push({ month, pct: (points[e].nav / points[s].nav - 1) * 100 });
    }
    month = monthOf(addDays(close, 1));
  }
  return out;
}

/** Simple returns between consecutive published NAVs. */
function dailyReturns(points: NavPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) out.push(points[i].nav / points[i - 1].nav - 1);
  return out;
}

/**
 * Annualised volatility: the SAMPLE standard deviation of daily simple
 * returns × √252, in percent.
 *
 * "Daily" means between consecutive published NAVs, which is what a trading
 * day is for a fund. Null below `minObsForRisk` returns (half a trading year)
 * — a standard deviation of a few weeks describes the weeks, not the fund.
 */
export function volatility(
  id: string,
  o: { asOf?: string } = {},
): { pct: number; obs: number; from: string; to: string } | null {
  const points = seriesTo(id, o.asOf);
  const r = dailyReturns(points);
  if (r.length < RETURN_RULES.minObsForRisk) return null;

  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return {
    pct: Math.sqrt(variance) * Math.sqrt(RETURN_RULES.tradingDaysPerYear) * 100,
    obs: r.length,
    from: points[0].date,
    to: points[points.length - 1].date,
  };
}

/**
 * The deepest peak-to-trough fall in the series, in percent (≤ 0).
 *
 * The peak is the running high — the EARLIEST date at that level, since it
 * only moves on a strictly higher NAV — and the trough is the first point at
 * the deepest fall below it. A series that never falls returns 0 with peak and
 * trough on its first point. Null under the same observation floor as
 * `volatility`, for the same reason.
 */
export function maxDrawdown(
  id: string,
  o: { asOf?: string } = {},
): { pct: number; peak: NavPoint; trough: NavPoint } | null {
  const points = seriesTo(id, o.asOf);
  if (points.length - 1 < RETURN_RULES.minObsForRisk) return null;

  let peak = points[0];
  let worst = { pct: 0, peak: points[0], trough: points[0] };
  for (const p of points) {
    if (p.nav > peak.nav) peak = p;
    const dd = (p.nav / peak.nav - 1) * 100;
    if (dd < worst.pct) worst = { pct: dd, peak, trough: p };
  }
  return worst;
}
