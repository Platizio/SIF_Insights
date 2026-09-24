/* ============================================================
   Rebasing for the Compare chart — pure, client-safe, import-free.

   Absolute NAVs are never plotted against each other: two SIFs are
   priced off a ₹1,000 face value and the rest off ₹10, so a shared
   NAV axis would rank the price, not the fund. Each selected SIF is
   instead rebased to 100 at the start of ONE common window and
   plotted as growth from there — percentage change, the only
   cross-scheme basis the data contract allows.

   The window follows the trailing-return rules in lib/data/returns
   (restated here because a client island may not import lib/data):

   · a period's start is the calendar offset back from the latest
     published NAV among the selected SIFs (1M = one calendar month);
   · a SIF enters the window only if it has a published NAV on or
     before that start, no more than MAX_START_GAP_DAYS earlier —
     otherwise it is left out and the page says so. Nothing is
     extended, back-filled or extrapolated to make a line longer;
   · "since first NAV" starts at the LATEST first NAV among the
     selected SIFs, so every one of them is in it — the common period.

   A window needs two SIFs; with fewer there is nothing to compare,
   and the period is offered but disabled.
   ============================================================ */

export const CHART_PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "SI"] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

const MONTHS: Record<Exclude<ChartPeriod, "SI">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "2Y": 24,
};

/** Mirrors RETURN_RULES.maxStartGapDays in lib/data/returns.ts. */
export const MAX_START_GAP_DAYS = 7;

export type SeriesIn = { code: string; points: readonly (readonly [string, number])[] };

export type RebasedPoint = { date: string; day: number; value: number };

export type Rebased = {
  code: string;
  /** The published NAV the line is rebased on — on or before the window start. */
  base: { date: string; nav: number };
  /** Starts at the window start with value 100. */
  points: RebasedPoint[];
  /** Growth over the window, in percent. */
  changePct: number;
  last: RebasedPoint;
};

export type ChartWindow = {
  period: ChartPeriod;
  start: string | null;
  end: string | null;
  included: Rebased[];
  /** Selected SIFs left out of this window, with the date their history begins. */
  excluded: { code: string; firstDate: string | null }[];
  enabled: boolean;
  /** SI only: the SIF whose first NAV sets the common start. */
  limitedBy: string | null;
};

const DAY_MS = 86_400_000;

export function epochDay(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
}

export function isoOfDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Calendar months back, clamped to month end ("2026-03-31" − 1M = "2026-02-28"). */
export function minusMonths(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4));
  const m0 = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  const total = y * 12 + m0 - months;
  const ty = Math.floor(total / 12);
  const tm0 = total - ty * 12;
  const day = Math.min(d, daysInMonth(ty, tm0));
  return `${String(ty).padStart(4, "0")}-${String(tm0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Index of the last point dated on or before `date`, or −1. Points are ascending. */
function lastOnOrBefore(points: SeriesIn["points"], date: string): number {
  let lo = 0;
  let hi = points.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] <= date) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function chartWindow(series: readonly SeriesIn[], period: ChartPeriod): ChartWindow {
  const held = series.filter((s) => s.points.length > 0);
  const empty: ChartWindow = {
    period,
    start: null,
    end: null,
    included: [],
    excluded: series.map((s) => ({ code: s.code, firstDate: s.points[0]?.[0] ?? null })),
    enabled: false,
    limitedBy: null,
  };
  if (held.length === 0) return empty;

  const latest = held.reduce((m, s) => (s.points[s.points.length - 1][0] > m ? s.points[s.points.length - 1][0] : m), "");
  let start: string;
  let limitedBy: string | null = null;
  if (period === "SI") {
    /* A single published NAV is a point, not a line: such a SIF cannot enter
       any window, so it must not be the one that sets the common start. */
    const lines = held.filter((s) => s.points.length > 1);
    if (lines.length === 0) return empty;
    const youngest = lines.reduce((a, b) => (b.points[0][0] > a.points[0][0] ? b : a));
    start = youngest.points[0][0];
    limitedBy = youngest.code;
  } else {
    start = minusMonths(latest, MONTHS[period]);
  }

  const startDay = epochDay(start);
  const included: Rebased[] = [];
  const excluded: ChartWindow["excluded"] = [];

  for (const s of series) {
    const firstDate = s.points[0]?.[0] ?? null;
    const b = lastOnOrBefore(s.points, start);
    const after = b >= 0 ? s.points.slice(b + 1) : [];
    const baseNav = b >= 0 ? s.points[b][1] : Number.NaN;
    if (
      b < 0 ||
      startDay - epochDay(s.points[b][0]) > MAX_START_GAP_DAYS ||
      !(baseNav > 0) ||
      after.length === 0
    ) {
      excluded.push({ code: s.code, firstDate });
      continue;
    }
    const points: RebasedPoint[] = [
      { date: start, day: startDay, value: 100 },
      ...after.map(([date, nav]) => ({ date, day: epochDay(date), value: (nav / baseNav) * 100 })),
    ];
    const last = points[points.length - 1];
    included.push({
      code: s.code,
      base: { date: s.points[b][0], nav: baseNav },
      points,
      changePct: last.value - 100,
      last,
    });
  }

  const end = included.reduce((m, r) => (r.last.date > m ? r.last.date : m), "");
  return {
    period,
    start,
    end: end || null,
    included,
    excluded,
    enabled: included.length >= 2,
    limitedBy,
  };
}

/** Below this, a "common period" is too short to read as a comparison. */
const MIN_COMMON_DAYS = 28;

const spanDays = (w: ChartWindow) =>
  w.enabled && w.start && w.end ? epochDay(w.end) - epochDay(w.start) : -1;

/**
 * The period a chart opens on: the full common history — unless one very
 * young SIF shrinks it to a few days, in which case the longest window that
 * at least two SIFs share (the young one is then listed as left out).
 */
export function defaultPeriod(windows: Record<ChartPeriod, ChartWindow>): ChartPeriod | null {
  if (spanDays(windows.SI) >= MIN_COMMON_DAYS) return "SI";
  const order: ChartPeriod[] = ["2Y", "1Y", "6M", "3M", "1M", "SI"];
  let best: ChartPeriod | null = null;
  for (const p of order) {
    if (windows[p].enabled && (best === null || spanDays(windows[p]) > spanDays(windows[best]))) best = p;
  }
  return best;
}

/**
 * Round-number ticks for the % change axis, always including 0 (the
 * rebased 100). Returns the padded domain and the ticks inside it.
 */
export function percentTicks(lo: number, hi: number): { min: number; max: number; ticks: number[] } {
  const a = Math.min(lo, 0);
  const b = Math.max(hi, 0);
  const span = b - a || 1;
  const steps = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
  const step = steps.find((s) => span / s <= 5) ?? 100;
  const min = Math.floor((a - span * 0.04) / step) * step;
  const max = Math.ceil((b + span * 0.04) / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Number(t.toFixed(4)));
  return { min, max, ticks };
}

/**
 * Up to `n` observation dates spread across the window, first and last
 * always included — the rows of the chart's accessible data table.
 */
export function sampleDates(dates: readonly string[], n: number): string[] {
  if (dates.length <= n) return [...dates];
  const out = new Set<string>();
  for (let i = 0; i < n; i += 1) {
    out.add(dates[Math.round((i * (dates.length - 1)) / (n - 1))]);
  }
  return [...out];
}

/** The rebased value on `date`: the last published point on or before it. */
export function valueOn(r: Rebased, day: number): RebasedPoint | null {
  let found: RebasedPoint | null = null;
  for (const p of r.points) {
    if (p.day > day) break;
    found = p;
  }
  return found;
}
