import type {
  Absent,
  Category,
  Cell,
  LiquidityBucket,
  Period,
  SifRow,
  StrategySlug,
} from "@/lib/data/types";
import { formatMonth } from "@/lib/format";

/* ============================================================
   The metric registry — every field the Screener can filter, sort
   and show, and the Compare page can line up.

   Declarative on purpose. A metric is defined ONCE here — its label,
   where the number comes from, how to read it off a SifRow, what an
   absence means — and the filter panel, the column picker, the sort
   control, the URL codec and the Compare sections all read the same
   entry. Adding a live metric is adding an entry; nothing else has
   to learn about it.

   Client-safe: only TYPE imports from lib/data (the rows arrive as
   props). tests/client-imports.test.ts enforces that.

   `status: "planned"` marks metrics the PRD names as future additions
   (Sharpe, alpha, exposures…). They are registered so /methodology
   can list them, and they are NEVER rendered as a filter, a column
   or a sort key — an empty filter implies data we do not hold.
   ============================================================ */

export type FieldGroup =
  | "fund"
  | "performance"
  | "benchmark"
  | "risk"
  | "size"
  | "nav"
  | "cost"
  | "liquidity"
  | "investment"
  | "portfolio"
  | "manager"
  | "disclosure";

type Base = {
  id: string;
  label: string;
  group: FieldGroup;
  source: "AMFI" | "AMC disclosure" | "Factsheet" | "Scheme document" | "SIF Insight calculation";
  /** Anchor on /methodology that explains the figure. */
  methodology?: `#${string}`;
  column?: { default?: boolean; align: "left" | "right" };
  /** Shown in the quick-filter row rather than only under More Filters. */
  quick?: boolean;
  status?: "live" | "planned";
  compare?: {
    section:
      | "summary"
      | "strategy"
      | "performance"
      | "risk"
      | "size"
      | "cost"
      | "liquidity"
      | "portfolio"
      | "benchmark"
      | "terms";
    /** A factual "Highest/Lowest … among selected" note — never "best". */
    note?: "highest" | "lowest";
  };
  /** Why a row's value is missing, when it is. */
  absent?: (r: SifRow) => Absent;
};

export type NumberField = Base & {
  kind: "number";
  unit: "pct" | "cr" | "inr" | "nav" | "days" | "ratio";
  /** Print with a sign (returns, drawdown). */
  signed?: boolean;
  get: (r: SifRow) => number | null;
  filter?: {
    type: "range";
    step: number;
    presets?: { id: string; label: string; min?: number; max?: number }[];
  };
  sort?: { asc: string; desc: string } | false;
};

export type EnumField = Base & {
  kind: "enum" | "list";
  get: (r: SifRow) => string | string[] | null;
  options: (rows: SifRow[]) => { id: string; label: string; count: number; inert?: boolean }[];
  dependsOn?: string;
  sort?: { order?: string[]; asc: string; desc: string };
};

/**
 * A date. Its range filter's `min`/`max` are UTC EPOCH DAYS (see `isoDay`),
 * so FilterValue stays numeric; the URL carries them as ISO dates.
 */
export type DateField = Base & {
  kind: "date";
  get: (r: SifRow) => string | null;
  filter?: {
    type: "range";
    presets?: { id: string; label: string; minDays?: number; maxDays?: number }[];
  };
};

export type FlagField = Base & {
  kind: "flag";
  get: (r: SifRow) => boolean | null;
  labels: [yes: string, no: string];
};

export type Field = NumberField | EnumField | DateField | FlagField;

export type FilterValue =
  | { t: "set"; ids: string[] }
  | { t: "range"; min: number | null; max: number | null }
  | { t: "flag"; v: boolean };

export type ScreenState = {
  q: string;
  filters: Record<string, FilterValue>;
  /** At most two keys; the first wins. */
  sort: { id: string; dir: "asc" | "desc" }[];
  /** Null = the default columns. */
  cols: string[] | null;
  /** Keep rows whose value for an active filter is missing. */
  includeMissing: boolean;
  /** AMFI codes, at most four, for Compare. */
  picked: string[];
};

/* ============================================================
   Helpers
   ============================================================ */

/** A UTC epoch day for an ISO date, or null if it is not one. */
export function isoDay(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  const day = Math.floor(t / 86_400_000);
  // Reject dates JS silently rolls over ("2026-02-31" → 3 March).
  return dayIso(day) === iso ? day : null;
}

export function dayIso(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

const valueOf = (c: Cell<number>): number | null => ("v" in c ? c.v : null);
const reasonOf = (c: Cell<number>): Absent => ("absent" in c ? c.absent : "not-captured");

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Options for an open-ended value: whatever the rows hold, commonest first. */
function distinct(
  rows: SifRow[],
  read: (r: SifRow) => { id: string; label: string }[],
): { id: string; label: string; count: number }[] {
  const seen = new Map<string, { id: string; label: string; count: number }>();
  for (const r of rows) {
    for (const { id, label } of read(r)) {
      const entry = seen.get(id) ?? { id, label, count: 0 };
      entry.count += 1;
      seen.set(id, entry);
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Options for a closed set: every member, the empty ones inert — the gap is information. */
function universe<T extends string>(
  rows: SifRow[],
  members: readonly { id: T; label: string }[],
  read: (r: SifRow) => T | null,
): { id: string; label: string; count: number; inert?: boolean }[] {
  return members.map(({ id, label }) => {
    const count = rows.filter((r) => read(r) === id).length;
    return count === 0 ? { id, label, count, inert: true } : { id, label, count };
  });
}

/* ============================================================
   Closed vocabularies
   ============================================================ */

/**
 * SEBI's seven strategies. Duplicated from lib/data/taxonomy.ts because this
 * module may not value-import the data layer; the `Record<StrategySlug, …>`
 * makes the compiler reject a missing or extra slug, and
 * tests/screener-fields.test.ts checks every label against SEBI_STRATEGIES.
 */
export const STRATEGIES: Record<StrategySlug, { label: string; category: Category }> = {
  "equity-long-short": { label: "Equity Long-Short", category: "equity" },
  "equity-ex-top-100-long-short": { label: "Equity Ex-Top 100 Long-Short", category: "equity" },
  "sector-rotation-long-short": { label: "Sector Rotation Long-Short", category: "equity" },
  "hybrid-long-short": { label: "Hybrid Long-Short", category: "hybrid" },
  "active-asset-allocator-long-short": {
    label: "Active Asset Allocator Long-Short",
    category: "hybrid",
  },
  "debt-long-short": { label: "Debt Long-Short", category: "debt" },
  "sectoral-debt-long-short": { label: "Sectoral Debt Long-Short", category: "debt" },
};

const STRATEGY_MEMBERS = (Object.keys(STRATEGIES) as StrategySlug[]).map((id) => ({
  id,
  label: STRATEGIES[id].label,
}));

const CATEGORY_MEMBERS: { id: Category; label: string }[] = [
  { id: "equity", label: "Equity" },
  { id: "hybrid", label: "Hybrid" },
  { id: "debt", label: "Debt" },
];

export const LIQUIDITY_LABEL: Record<LiquidityBucket, string> = {
  daily: "Daily",
  "twice-weekly": "Twice a week",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  other: "Other",
};

const LIQUIDITY_MEMBERS = (Object.keys(LIQUIDITY_LABEL) as LiquidityBucket[]).map((id) => ({
  id,
  label: LIQUIDITY_LABEL[id],
}));

const RISK_MEMBERS = (["1", "2", "3", "4", "5"] as const).map((id) => ({
  id,
  label: `Risk band ${id}`,
}));

const STATUS_MEMBERS: { id: SifRow["status"]; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "recent", label: "Launched in the last 90 days" },
];

/* ============================================================
   Performance
   ============================================================ */

/** Keyed by Period so the compiler rejects a period with no field. */
const PERIOD_FIELDS: Record<Period, { id: string; label: string; default?: boolean }> = {
  "1D": { id: "r1d", label: "1D return" },
  "1W": { id: "r1w", label: "1W return" },
  "1M": { id: "r1m", label: "1M return", default: true },
  "3M": { id: "r3m", label: "3M return", default: true },
  "6M": { id: "r6m", label: "6M return", default: true },
  "1Y": { id: "r1y", label: "1Y return (CAGR)" },
  "2Y": { id: "r2y", label: "2Y return (CAGR)" },
  SI: { id: "rsi", label: "Since inception", default: true },
};

const RETURN_SORT = { asc: "Lowest first", desc: "Highest first" } as const;

function returnField(period: Period): NumberField {
  const { id, label, default: isDefault } = PERIOD_FIELDS[period];
  return {
    id,
    label,
    group: "performance",
    source: "SIF Insight calculation",
    methodology: "#returns",
    column: { default: isDefault, align: "right" },
    quick: period === "6M",
    compare: { section: "performance", note: "highest" },
    kind: "number",
    unit: "pct",
    signed: true,
    get: (r) => valueOf(r.returns[period]),
    absent: (r) => reasonOf(r.returns[period]),
    filter: { type: "range", step: 0.5 },
    sort: RETURN_SORT,
  };
}

const MONTH_ID = /^m(\d{4}-(?:0[1-9]|1[0-2]))$/;

/** The field for one completed calendar month, id `m2026-08`. */
export function monthField(month: string): NumberField {
  return {
    id: `m${month}`,
    label: `${formatMonth(month)} return`,
    group: "performance",
    source: "SIF Insight calculation",
    methodology: "#monthly-returns",
    column: { align: "right" },
    kind: "number",
    unit: "pct",
    signed: true,
    get: (r) => r.monthly.find((m) => m.month === month)?.pct ?? null,
    absent: () => "insufficient-history",
    filter: { type: "range", step: 0.5 },
    sort: RETURN_SORT,
  };
}

/** Month fields for every completed month any row holds, oldest first. */
export function monthFieldsFor(rows: SifRow[]): NumberField[] {
  const months = new Set(rows.flatMap((r) => r.monthly.map((m) => m.month)));
  return [...months].sort().map(monthField);
}

/* ============================================================
   Planned metrics — registered, never rendered
   ============================================================ */

function planned(
  id: string,
  label: string,
  group: FieldGroup,
  unit: NumberField["unit"] = "pct",
): NumberField {
  return {
    id,
    label,
    group,
    source: "SIF Insight calculation",
    methodology: "#not-yet-calculated",
    status: "planned",
    kind: "number",
    unit,
    get: () => null,
    absent: () => "not-captured",
    sort: false,
  };
}

/* ============================================================
   The registry
   ============================================================ */

const NOT_CAPTURED = () => "not-captured" as const;

export const FIELDS: Field[] = [
  /* ---- fund ---- */
  {
    id: "name",
    label: "SIF",
    group: "fund",
    source: "AMFI",
    column: { default: true, align: "left" },
    compare: { section: "summary" },
    kind: "enum",
    get: (r) => r.code,
    options: (rows) => distinct(rows, (r) => [{ id: r.code, label: r.shortName }]),
    sort: { asc: "A–Z", desc: "Z–A" },
  },
  {
    id: "amc",
    label: "AMC",
    group: "fund",
    source: "AMFI",
    column: { default: true, align: "left" },
    quick: true,
    compare: { section: "summary" },
    kind: "enum",
    get: (r) => r.amcId,
    options: (rows) => distinct(rows, (r) => [{ id: r.amcId, label: r.amcName }]),
    sort: { asc: "A–Z", desc: "Z–A" },
  },
  {
    id: "brand",
    label: "SIF brand",
    group: "fund",
    source: "AMFI",
    column: { align: "left" },
    kind: "enum",
    get: (r) => slug(r.brand),
    options: (rows) => distinct(rows, (r) => [{ id: slug(r.brand), label: r.brand }]),
    sort: { asc: "A–Z", desc: "Z–A" },
  },
  {
    id: "cat",
    label: "Category",
    group: "fund",
    source: "AMFI",
    column: { default: true, align: "left" },
    quick: true,
    compare: { section: "summary" },
    kind: "enum",
    get: (r) => r.category,
    options: (rows) => universe(rows, CATEGORY_MEMBERS, (r) => r.category),
    sort: { order: ["equity", "hybrid", "debt"], asc: "Equity first", desc: "Debt first" },
  },
  {
    id: "str",
    label: "Strategy",
    group: "fund",
    source: "AMFI",
    column: { default: true, align: "left" },
    quick: true,
    compare: { section: "strategy" },
    kind: "enum",
    get: (r) => r.strategy,
    absent: NOT_CAPTURED,
    options: (rows) => universe(rows, STRATEGY_MEMBERS, (r) => r.strategy),
    dependsOn: "cat",
    sort: { order: STRATEGY_MEMBERS.map((s) => s.id), asc: "SEBI order", desc: "Reverse SEBI order" },
  },
  {
    id: "mgr",
    label: "Fund manager",
    group: "manager",
    source: "Scheme document",
    column: { align: "left" },
    compare: { section: "size" },
    kind: "list",
    get: (r) => (r.managers.length ? r.managers.map(slug) : null),
    absent: NOT_CAPTURED,
    options: (rows) => distinct(rows, (r) => r.managers.map((m) => ({ id: slug(m), label: m }))),
    sort: { asc: "A–Z", desc: "Z–A" },
  },
  {
    id: "inc",
    label: "Inception",
    group: "fund",
    source: "Scheme document",
    methodology: "#inception",
    column: { align: "right" },
    compare: { section: "terms" },
    kind: "date",
    get: (r) => r.inception?.date ?? null,
    absent: NOT_CAPTURED,
    filter: { type: "range" },
  },
  {
    id: "age",
    label: "Age",
    group: "fund",
    source: "SIF Insight calculation",
    methodology: "#inception",
    column: { align: "right" },
    kind: "number",
    unit: "days",
    get: (r) => r.ageDays,
    absent: NOT_CAPTURED,
    /* Inclusive bounds, so adjacent presets share no day. */
    filter: {
      type: "range",
      step: 1,
      presets: [
        { id: "lt3m", label: "Under 3M", max: 90 },
        { id: "3-6m", label: "3–6M", min: 91, max: 182 },
        { id: "6-12m", label: "6–12M", min: 183, max: 364 },
        { id: "1y", label: "1Y+", min: 365 },
        { id: "2y", label: "2Y+", min: 730 },
      ],
    },
    sort: { asc: "Newest first", desc: "Oldest first" },
  },
  {
    id: "status",
    label: "Status",
    group: "fund",
    source: "SIF Insight calculation",
    column: { align: "left" },
    kind: "enum",
    get: (r) => r.status,
    options: (rows) => universe(rows, STATUS_MEMBERS, (r) => r.status),
  },

  /* ---- performance ---- */
  returnField("1D"),
  returnField("1W"),
  returnField("1M"),
  returnField("3M"),
  returnField("6M"),
  returnField("1Y"),
  returnField("2Y"),
  returnField("SI"),

  /* ---- benchmark ---- */
  {
    id: "bm",
    label: "Benchmark",
    group: "benchmark",
    source: "Scheme document",
    methodology: "#benchmarks",
    column: { align: "left" },
    compare: { section: "benchmark" },
    kind: "enum",
    get: (r) => r.benchmarkId,
    absent: NOT_CAPTURED,
    options: (rows) =>
      distinct(rows, (r) =>
        r.benchmarkId && r.benchmark ? [{ id: r.benchmarkId, label: r.benchmark }] : [],
      ),
    sort: { asc: "A–Z", desc: "Z–A" },
  },

  /* ---- risk ---- */
  {
    id: "risk",
    label: "Risk band",
    group: "risk",
    source: "Scheme document",
    methodology: "#risk-band",
    column: { default: true, align: "right" },
    quick: true,
    compare: { section: "risk" },
    kind: "enum",
    get: (r) => (r.riskBand === null ? null : String(r.riskBand)),
    absent: NOT_CAPTURED,
    options: (rows) =>
      universe(rows, RISK_MEMBERS, (r) =>
        r.riskBand === null ? null : (String(r.riskBand) as (typeof RISK_MEMBERS)[number]["id"]),
      ),
    sort: { order: ["1", "2", "3", "4", "5"], asc: "Lowest band first", desc: "Highest band first" },
  },
  {
    id: "vol",
    label: "Volatility (ann.)",
    group: "risk",
    source: "SIF Insight calculation",
    methodology: "#volatility",
    column: { align: "right" },
    compare: { section: "risk", note: "lowest" },
    kind: "number",
    unit: "pct",
    get: (r) => valueOf(r.volatility),
    absent: (r) => reasonOf(r.volatility),
    filter: { type: "range", step: 0.5 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "mdd",
    label: "Max drawdown",
    group: "risk",
    source: "SIF Insight calculation",
    methodology: "#max-drawdown",
    column: { align: "right" },
    compare: { section: "risk" },
    kind: "number",
    unit: "pct",
    signed: true,
    get: (r) => valueOf(r.maxDrawdown),
    absent: (r) => reasonOf(r.maxDrawdown),
    filter: { type: "range", step: 0.5 },
    sort: { asc: "Deepest first", desc: "Shallowest first" },
  },

  /* ---- size ---- */
  {
    id: "aum",
    label: "AUM",
    group: "size",
    source: "AMC disclosure",
    methodology: "#aum",
    column: { default: true, align: "right" },
    quick: true,
    compare: { section: "size", note: "highest" },
    kind: "number",
    unit: "cr",
    get: (r) => valueOf(r.aumCr),
    absent: (r) => reasonOf(r.aumCr),
    /* Inclusive bounds: a scheme at exactly ₹500 Cr matches both sides. */
    filter: {
      type: "range",
      step: 100,
      presets: [
        { id: "lt500", label: "Up to ₹500 Cr", max: 500 },
        { id: "500-1000", label: "₹500–1,000 Cr", min: 500, max: 1000 },
        { id: "1000-5000", label: "₹1,000–5,000 Cr", min: 1000, max: 5000 },
        { id: "gt5000", label: "Above ₹5,000 Cr", min: 5000 },
      ],
    },
    sort: { asc: "Smallest first", desc: "Largest first" },
  },
  {
    id: "amcaum",
    label: "AMC SIF AUM",
    group: "size",
    source: "SIF Insight calculation",
    methodology: "#aum",
    column: { align: "right" },
    compare: { section: "size" },
    kind: "number",
    unit: "cr",
    get: (r) => valueOf(r.amcAumCr),
    absent: (r) => reasonOf(r.amcAumCr),
    filter: { type: "range", step: 100 },
    sort: { asc: "Smallest first", desc: "Largest first" },
  },

  /* ---- nav ---- */
  {
    id: "nav",
    label: "Latest NAV",
    group: "nav",
    source: "AMFI",
    column: { align: "right" },
    compare: { section: "summary" },
    kind: "number",
    unit: "nav",
    get: (r) => (Number.isFinite(r.nav) ? r.nav : null),
    absent: NOT_CAPTURED,
    filter: { type: "range", step: 1 },
    /* Never sortable: absolute NAV is not comparable across face values
       (₹10 vs ₹1,000), so ordering by it would rank the price, not the fund. */
    sort: false,
  },
  {
    id: "navdate",
    label: "NAV date",
    group: "nav",
    source: "AMFI",
    column: { align: "right" },
    kind: "date",
    get: (r) => r.navAsOf || null,
    absent: NOT_CAPTURED,
    filter: { type: "range" },
  },
  {
    id: "fv",
    label: "Face value",
    group: "nav",
    source: "Scheme document",
    methodology: "#face-value",
    column: { align: "right" },
    compare: { section: "terms" },
    kind: "number",
    unit: "inr",
    get: (r) => r.faceValue,
    filter: { type: "range", step: 10 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },

  /* ---- cost ---- */
  {
    id: "ter",
    label: "TER (charged)",
    group: "cost",
    source: "AMC disclosure",
    methodology: "#ter",
    column: { default: true, align: "right" },
    quick: true,
    compare: { section: "cost", note: "lowest" },
    kind: "number",
    unit: "pct",
    get: (r) => valueOf(r.ter),
    absent: (r) => reasonOf(r.ter),
    filter: { type: "range", step: 0.05 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "termax",
    label: "Max TER (ISID cap)",
    group: "cost",
    source: "Scheme document",
    methodology: "#ter",
    column: { align: "right" },
    compare: { section: "cost" },
    kind: "number",
    unit: "pct",
    get: (r) => valueOf(r.terMax),
    absent: (r) => reasonOf(r.terMax),
    filter: { type: "range", step: 0.05 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "el",
    label: "Exit load",
    group: "cost",
    source: "Scheme document",
    methodology: "#exit-load",
    column: { align: "left" },
    compare: { section: "cost" },
    kind: "flag",
    get: (r) => r.exitLoad.applicable,
    absent: NOT_CAPTURED,
    labels: ["Exit load applies", "No exit load"],
  },
  {
    id: "elpct",
    label: "Exit load rate",
    group: "cost",
    source: "Scheme document",
    methodology: "#exit-load",
    column: { align: "right" },
    compare: { section: "cost" },
    kind: "number",
    unit: "pct",
    get: (r) => r.exitLoad.pct,
    absent: NOT_CAPTURED,
    filter: { type: "range", step: 0.25 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "eldays",
    label: "Exit load period",
    group: "cost",
    source: "Scheme document",
    methodology: "#exit-load",
    column: { align: "right" },
    compare: { section: "cost" },
    kind: "number",
    unit: "days",
    get: (r) => r.exitLoad.periodDays,
    absent: NOT_CAPTURED,
    filter: { type: "range", step: 1 },
    sort: { asc: "Shortest first", desc: "Longest first" },
  },

  /* ---- liquidity ---- */
  {
    id: "liq",
    label: "Redemption",
    group: "liquidity",
    source: "Scheme document",
    methodology: "#liquidity",
    column: { default: true, align: "left" },
    quick: true,
    compare: { section: "liquidity" },
    kind: "enum",
    get: (r) => r.liquidity,
    absent: NOT_CAPTURED,
    options: (rows) => universe(rows, LIQUIDITY_MEMBERS, (r) => r.liquidity),
    sort: {
      order: LIQUIDITY_MEMBERS.map((m) => m.id),
      asc: "Most frequent first",
      desc: "Least frequent first",
    },
  },
  {
    id: "sub",
    label: "Subscription",
    group: "liquidity",
    source: "Scheme document",
    methodology: "#liquidity",
    column: { align: "left" },
    compare: { section: "liquidity" },
    kind: "enum",
    get: (r) => r.subscriptionBucket,
    absent: NOT_CAPTURED,
    options: (rows) => universe(rows, LIQUIDITY_MEMBERS, (r) => r.subscriptionBucket),
    sort: {
      order: LIQUIDITY_MEMBERS.map((m) => m.id),
      asc: "Most frequent first",
      desc: "Least frequent first",
    },
  },

  /* ---- investment ---- */
  {
    id: "min",
    label: "Minimum investment",
    group: "investment",
    source: "Scheme document",
    column: { align: "right" },
    compare: { section: "terms" },
    kind: "number",
    unit: "inr",
    get: (r) => r.minInvestment,
    absent: NOT_CAPTURED,
    filter: {
      type: "range",
      step: 100_000,
      presets: [
        { id: "10l", label: "₹10 L", min: 1_000_000, max: 1_000_000 },
        { id: "10-25l", label: "₹10–25 L", min: 1_000_000, max: 2_500_000 },
        { id: "25l", label: "₹25 L+", min: 2_500_000 },
      ],
    },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "minadd",
    label: "Minimum additional",
    group: "investment",
    source: "Scheme document",
    column: { align: "right" },
    compare: { section: "terms" },
    kind: "number",
    unit: "inr",
    get: (r) => r.minAdditional,
    absent: NOT_CAPTURED,
    filter: { type: "range", step: 1000 },
    sort: { asc: "Lowest first", desc: "Highest first" },
  },
  {
    id: "opt",
    label: "Plans & options",
    group: "investment",
    source: "Scheme document",
    column: { align: "left" },
    compare: { section: "terms" },
    kind: "list",
    get: (r) => (r.options.length ? r.options.map(slug) : null),
    absent: NOT_CAPTURED,
    options: (rows) => distinct(rows, (r) => r.options.map((o) => ({ id: slug(o), label: o }))),
  },

  /* ---- disclosure ---- */
  {
    id: "disc",
    label: "Key disclosures",
    group: "disclosure",
    source: "SIF Insight calculation",
    methodology: "#sources",
    column: { align: "left" },
    kind: "flag",
    get: (r) => r.disclosures.full,
    labels: ["All four captured", "Not fully captured"],
  },
  {
    id: "fs",
    label: "Factsheet on file",
    group: "disclosure",
    source: "SIF Insight calculation",
    methodology: "#sources",
    column: { align: "left" },
    kind: "flag",
    get: (r) => r.disclosures.factsheet,
    labels: ["Factsheet", "No factsheet"],
  },
  {
    id: "pf",
    label: "Portfolio on file",
    group: "disclosure",
    source: "SIF Insight calculation",
    methodology: "#sources",
    column: { align: "left" },
    kind: "flag",
    get: (r) => r.disclosures.portfolio,
    labels: ["Portfolio", "No portfolio"],
  },
  {
    id: "sid",
    label: "Scheme document on file",
    group: "disclosure",
    source: "SIF Insight calculation",
    methodology: "#sources",
    column: { align: "left" },
    kind: "flag",
    get: (r) => r.disclosures.sid,
    labels: ["SID / ISID", "No SID / ISID"],
  },

  /* ---- planned: named by the PRD, not yet calculable ---- */
  planned("sharpe", "Sharpe ratio", "risk", "ratio"),
  planned("alpha", "Alpha", "risk"),
  planned("beta", "Beta", "risk", "ratio"),
  planned("bmr", "Benchmark return", "benchmark"),
  planned("xr", "Excess return", "benchmark"),
  planned("aumg", "AUM growth", "size"),
  planned("eq", "Equity exposure", "portfolio"),
  planned("debt", "Debt exposure", "portfolio"),
  planned("cash", "Cash exposure", "portfolio"),
  planned("glong", "Gross long", "portfolio"),
  planned("gshort", "Gross short", "portfolio"),
  planned("net", "Net exposure", "portfolio"),
  planned("top10", "Top-10 concentration", "portfolio"),
];

const BY_ID: ReadonlyMap<string, Field> = new Map(FIELDS.map((f) => [f.id, f]));

/** Registry order, for canonical URL param order. */
export const FIELD_ORDER: ReadonlyMap<string, number> = new Map(FIELDS.map((f, i) => [f.id, i]));

/** A field by id — static, or a month field (`m2026-08`) synthesised on demand. */
export function getField(id: string): Field | undefined {
  const known = BY_ID.get(id);
  if (known) return known;
  const month = MONTH_ID.exec(id)?.[1];
  return month ? monthField(month) : undefined;
}

export const isLive = (f: Field) => f.status !== "planned";

/** Every field that may be rendered: live static fields plus one per completed month. */
export function fieldsFor(rows: SifRow[]): Field[] {
  return [...FIELDS.filter(isLive), ...monthFieldsFor(rows)];
}

/** Whether a field can be a sort key. */
export function isSortable(f: Field): boolean {
  if (!isLive(f)) return false;
  if (f.kind === "number") return f.sort !== false && f.sort !== undefined;
  if (f.kind === "enum" || f.kind === "list") return f.sort !== undefined;
  return f.kind === "date";
}

/** Whether a field can carry a filter, and of which kind. */
export function filterKind(f: Field): FilterValue["t"] | null {
  if (!isLive(f)) return null;
  if (f.kind === "number" || f.kind === "date") return f.filter ? "range" : null;
  if (f.kind === "flag") return "flag";
  return "set";
}

/**
 * The PRD's default columns, in order. The selection checkbox column is UI,
 * always present, and not a field.
 */
export const DEFAULT_COLUMNS: string[] = [
  "name",
  "amc",
  "cat",
  "str",
  "aum",
  "risk",
  "r1m",
  "r3m",
  "r6m",
  "rsi",
  "ter",
  "liq",
];
