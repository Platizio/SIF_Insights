/**
 * An INDEPENDENT re-implementation of lib/data/returns.ts, for
 * tests/returns.test.ts to hold the real one against.
 *
 * It reads only tests/raw-source.ts — never `@/lib/data` — and it is written
 * differently on purpose wherever the method can differ without changing the
 * definition: linear scans instead of binary search, month offsets found by
 * overflow detection instead of clamping arithmetic, CAGR through logs,
 * variance by Welford's recurrence, drawdown from an explicit running-max
 * array. Two implementations of one written rule that agree to 1e-9 are
 * evidence the rule is what the code does; one implementation asserting its
 * own output is not.
 *
 * The rules it encodes, restated from the methodology rather than from the
 * code:
 *   - end = last NAV on or before asOf (default: the file's navAsOf)
 *   - 1D = against the previous published NAV
 *   - 1W = 7 calendar days back; 1M/3M/6M/1Y/2Y = calendar months back,
 *     a day that does not exist in the target month becoming its last day
 *   - start = last NAV on or before the target; insufficient history when
 *     there is none or it is more than 7 days before the target
 *   - SI = face value at allotment when both are verified and sourced,
 *     else the first published NAV
 *   - CAGR from 365 days of span, absolute below
 *   - withheld when the scheme is younger than minAgeDays at `end`
 *   - volatility = sample sd of consecutive-NAV simple returns × √252,
 *     null under 126 returns; drawdown = deepest fall below the running
 *     high (earliest date at that high), null under 126 returns
 *   - monthly = month-end to month-end for completed months, each end
 *     point within 7 days of its month end
 */
import { rawFactsFile, rawSchemesFile, seriesFor } from "../raw-source";

export type RefPoint = { date: string; nav: number };
export type RefPeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "SI";
export type RefResult =
  | {
      status: "ok";
      pct: number;
      annualised: boolean;
      from: RefPoint;
      to: RefPoint;
      basis: "nav" | "face-value";
    }
  | { status: "insufficient-history" | "not-captured" | "withheld"; needsFrom?: string };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GAP = 7;
const MIN_RISK_OBS = 126;

function utc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function span(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / MS_PER_DAY);
}

/** Calendar months back; an overflowed day ("31 Feb") becomes the month's last day. */
function monthsBack(date: string, months: number): string {
  const d = utc(date);
  const wantMonth = (((d.getUTCMonth() - months) % 12) + 12) % 12;
  const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate()));
  if (shifted.getUTCMonth() !== wantMonth) {
    // Day 0 of the overflowed month is the last day of the one we wanted.
    return iso(new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 0)));
  }
  return iso(shifted);
}

function daysBack(date: string, days: number): string {
  return iso(new Date(utc(date).getTime() - days * MS_PER_DAY));
}

function lastMonthDay(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m, 0)));
}

export function refSeries(code: string, asOf?: string): RefPoint[] {
  const cut = asOf ?? rawSchemesFile.navAsOf;
  const out: RefPoint[] = [];
  for (const [date, nav] of seriesFor(code)) if (date <= cut) out.push({ date, nav });
  return out;
}

function lastAtOrBefore(points: RefPoint[], date: string): RefPoint | null {
  let found: RefPoint | null = null;
  for (const p of points) {
    if (p.date <= date) found = p;
    else break;
  }
  return found;
}

/** Verified, sourced allotment date and face value — both, or neither. */
function allotment(code: string): { date: string; faceValue: number } | null {
  const entry = rawFactsFile.schemes[code];
  const ok = (key: string) => {
    const f = entry?.[key];
    return f && f.verified === true && f.src in rawFactsFile.sources ? f : null;
  };
  const date = ok("allotmentDate");
  const fv = ok("faceValue");
  if (!date || !fv) return null;
  return { date: String(date.value), faceValue: Number(fv.value) };
}

function inceptionDate(code: string): string | null {
  const entry = rawFactsFile.schemes[code]?.allotmentDate;
  if (entry && entry.verified === true && entry.src in rawFactsFile.sources) {
    return String(entry.value);
  }
  return seriesFor(code)[0]?.[0] ?? null;
}

function result(from: RefPoint, to: RefPoint, basis: "nav" | "face-value"): RefResult {
  const days = span(from.date, to.date);
  const ratio = to.nav / from.nav;
  const annualised = days >= 365;
  const pct = annualised
    ? (Math.exp((Math.log(ratio) * 365) / days) - 1) * 100
    : (ratio - 1) * 100;
  return { status: "ok", pct, annualised, from, to, basis };
}

export function refTrailingReturn(
  code: string,
  period: RefPeriod,
  o: { asOf?: string; minAgeDays?: number } = {},
): RefResult {
  if (seriesFor(code).length === 0) return { status: "not-captured" };
  const points = refSeries(code, o.asOf);
  if (points.length === 0) return { status: "insufficient-history" };
  const to = points[points.length - 1];

  if ((o.minAgeDays ?? 0) > 0) {
    const began = inceptionDate(code);
    if (began === null || span(began, to.date) < (o.minAgeDays ?? 0)) {
      return { status: "withheld" };
    }
  }

  if (period === "1D") {
    return points.length > 1
      ? result(points[points.length - 2], to, "nav")
      : { status: "insufficient-history" };
  }

  if (period === "SI") {
    const a = allotment(code);
    if (a && a.date <= to.date) return result({ date: a.date, nav: a.faceValue }, to, "face-value");
    return points.length > 1 ? result(points[0], to, "nav") : { status: "insufficient-history" };
  }

  const months: Record<Exclude<RefPeriod, "1D" | "1W" | "SI">, number> = {
    "1M": 1,
    "3M": 3,
    "6M": 6,
    "1Y": 12,
    "2Y": 24,
  };
  const target = period === "1W" ? daysBack(to.date, 7) : monthsBack(to.date, months[period]);
  const start = lastAtOrBefore(points, target);
  if (start === null || span(start.date, target) > GAP) {
    return { status: "insufficient-history", needsFrom: target };
  }
  return result(start, to, "nav");
}

function simpleReturns(points: RefPoint[]): number[] {
  return points.slice(1).map((p, i) => p.nav / points[i].nav - 1);
}

export function refVolatility(code: string, asOf?: string): { pct: number; obs: number } | null {
  const r = simpleReturns(refSeries(code, asOf));
  if (r.length < MIN_RISK_OBS) return null;
  // Welford's online variance.
  let mean = 0;
  let m2 = 0;
  r.forEach((x, i) => {
    const delta = x - mean;
    mean += delta / (i + 1);
    m2 += delta * (x - mean);
  });
  return { pct: Math.sqrt(m2 / (r.length - 1)) * Math.sqrt(252) * 100, obs: r.length };
}

export function refMaxDrawdown(
  code: string,
  asOf?: string,
): { pct: number; peak: RefPoint; trough: RefPoint } | null {
  const points = refSeries(code, asOf);
  if (points.length - 1 < MIN_RISK_OBS) return null;

  // highs[i] = the earliest point holding the maximum NAV over points[0..i].
  const highs: RefPoint[] = [];
  for (const p of points) {
    const prev = highs[highs.length - 1];
    highs.push(prev && prev.nav >= p.nav ? prev : p);
  }
  let best = { pct: 0, peak: points[0], trough: points[0] };
  points.forEach((p, i) => {
    const pct = (p.nav / highs[i].nav - 1) * 100;
    if (pct < best.pct) best = { pct, peak: highs[i], trough: p };
  });
  return best;
}

export function refMonthlyReturns(code: string, asOf?: string): { month: string; pct: number }[] {
  const cut = asOf ?? rawSchemesFile.navAsOf;
  const lastIn = new Map<string, RefPoint>();
  for (const p of refSeries(code, cut)) lastIn.set(p.date.slice(0, 7), p);

  const months = [...lastIn.keys()].sort();
  const out: { month: string; pct: number }[] = [];
  for (const month of months) {
    const close = lastMonthDay(month);
    if (close > cut) continue;
    const [y, m] = month.split("-").map(Number);
    const prevMonth = iso(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
    const prev = lastIn.get(prevMonth);
    const cur = lastIn.get(month)!;
    if (!prev) continue;
    if (span(prev.date, lastMonthDay(prevMonth)) > GAP) continue;
    if (span(cur.date, close) > GAP) continue;
    out.push({ month, pct: (cur.nav / prev.nav - 1) * 100 });
  }
  return out;
}
