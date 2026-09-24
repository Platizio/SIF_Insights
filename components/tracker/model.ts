import type {
  Amc,
  Category,
  Cell,
  Nfo,
  Period,
  SifRow,
  StrategySlug,
} from "@/lib/data/types";
import { nfoStatus } from "@/lib/format";

/* ============================================================
   The tracker's client-safe model.

   Pure functions and plain types shared by the server sections and
   their client islands. It imports nothing but types and
   `@/lib/format`, so an island can use it without reaching the data
   layer (tests/client-imports.test.ts). Anything the islands need
   from lib/data — the rows, SEBI's strategy list, the NFO file —
   arrives as props built on the server.

   The point of sharing one module is that the server's first render
   and the island's first render run the SAME derivation over the
   SAME props, so hydration can never disagree with the HTML.
   ============================================================ */

/** The slice of a `SifRow` the tracker's islands read. */
export type TrackerRow = Pick<
  SifRow,
  | "id"
  | "code"
  | "name"
  | "shortName"
  | "amcId"
  | "amcName"
  | "brand"
  | "logo"
  | "category"
  | "strategy"
  | "strategyLabel"
  | "nav"
  | "navAsOf"
  | "returns"
  | "returnsMeta"
  | "riskBand"
  | "benchmark"
>;

export function trackerRow(r: SifRow): TrackerRow {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.shortName,
    amcId: r.amcId,
    amcName: r.amcName,
    brand: r.brand,
    logo: r.logo,
    category: r.category,
    strategy: r.strategy,
    strategyLabel: r.strategyLabel,
    nav: r.nav,
    navAsOf: r.navAsOf,
    returns: r.returns,
    returnsMeta: r.returnsMeta,
    riskBand: r.riskBand,
    benchmark: r.benchmark,
  };
}

/** SEBI's strategy list as the server hands it over (lib/data SEBI_STRATEGIES). */
export type StrategyDef = { slug: StrategySlug; label: string; category: Category };

/** The four fields `AmcMark` reads. */
export type MarkAmc = Pick<Amc, "id" | "name" | "sifName" | "logo">;

/** `AmcMark` takes a full `Amc`; the description is never rendered by it. */
export function markAmc(m: MarkAmc): Amc {
  return { ...m, description: "" };
}

export function rowMark(r: Pick<TrackerRow, "amcId" | "amcName" | "brand" | "logo">): Amc {
  return markAmc({ id: r.amcId, name: r.amcName, sifName: r.brand, logo: r.logo });
}

export const sifHref = (id: string) => `/sif/${id}`;

/** The value of a cell, or null when it is absent. */
export function cellValue(c: Cell<number>): number | null {
  return "v" in c && Number.isFinite(c.v) ? c.v : null;
}

/* ============================================================
   Category and strategy filters
   ============================================================ */

export type CategoryChoice = "all" | Category;
export type StrategyChoice = "all" | StrategySlug;

export const CATEGORY_LABEL: Record<Category, string> = {
  equity: "Equity",
  hybrid: "Hybrid",
  debt: "Debt",
};

const CATEGORIES: Category[] = ["equity", "hybrid", "debt"];

/**
 * The PRD's filter labels. Two SEBI names are shortened the way the PRD
 * writes them ("Sector Rotation", "Active Asset Allocator"); the tables
 * keep the full SEBI label in their Strategy column.
 */
const FILTER_LABEL: Partial<Record<StrategySlug, string>> = {
  "sector-rotation-long-short": "Sector Rotation",
  "active-asset-allocator-long-short": "Active Asset Allocator",
};

export type FilterOption<T extends string> = {
  id: T;
  label: string;
  count: number;
  disabled?: boolean;
};

export function categoryOptions(rows: readonly TrackerRow[]): FilterOption<CategoryChoice>[] {
  return [
    { id: "all", label: "All", count: rows.length },
    ...CATEGORIES.map((c) => {
      const count = rows.filter((r) => r.category === c).length;
      /* A category nothing has launched in is shown, inert: the gap is information. */
      return { id: c, label: CATEGORY_LABEL[c], count, disabled: count === 0 };
    }),
  ];
}

export function strategyOptions(
  rows: readonly TrackerRow[],
  strategies: readonly StrategyDef[],
  category: Category,
): FilterOption<StrategyChoice>[] {
  const inCategory = rows.filter((r) => r.category === category);
  return [
    { id: "all", label: `All ${CATEGORY_LABEL[category]}`, count: inCategory.length },
    ...strategies
      .filter((s) => s.category === category)
      .map((s) => {
        const count = inCategory.filter((r) => r.strategy === s.slug).length;
        return {
          id: s.slug,
          label: FILTER_LABEL[s.slug] ?? s.label,
          count,
          disabled: count === 0,
        };
      }),
  ];
}

export function applyFilter<R extends Pick<TrackerRow, "category" | "strategy">>(
  rows: readonly R[],
  category: CategoryChoice,
  strategy: StrategyChoice,
): R[] {
  return rows.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      (strategy === "all" || r.strategy === strategy),
  );
}

/** Words for the current selection — "Equity Long-Short SIFs", "hybrid SIFs". */
export function selectionNoun(
  category: CategoryChoice,
  strategy: StrategyChoice,
  strategies: readonly StrategyDef[],
): string {
  if (strategy !== "all") {
    const s = strategies.find((d) => d.slug === strategy);
    return `${s ? (FILTER_LABEL[s.slug] ?? s.label) : strategy} SIFs`;
  }
  if (category !== "all") return `${CATEGORY_LABEL[category].toLowerCase()} SIFs`;
  return "SIFs";
}

/* ============================================================
   Periods
   ============================================================ */

/** The periods the tracker's performance sections offer (1D lives on the NAV table). */
export const TRACKER_PERIODS = ["1W", "1M", "3M", "6M", "1Y", "2Y", "SI"] as const satisfies readonly Period[];
export type TrackerPeriod = (typeof TRACKER_PERIODS)[number];

export const PERIOD_LABEL: Record<TrackerPeriod, { short: string; long: string }> = {
  "1W": { short: "1W", long: "1 Week" },
  "1M": { short: "1M", long: "1 Month" },
  "3M": { short: "3M", long: "3 Months" },
  "6M": { short: "6M", long: "6 Months" },
  "1Y": { short: "1Y", long: "1 Year" },
  "2Y": { short: "2Y", long: "2 Years" },
  SI: { short: "SI", long: "Since Inception" },
};

/* ============================================================
   New fund offers
   ============================================================ */

/** One offer, as the tracker's NFO cards print it. Serialisable. */
export type NfoItem = Pick<Nfo, "id" | "title" | "active" | "opensOn" | "closesOn"> & {
  schemeName: string;
  amc: MarkAmc | null;
  strategy: string | null;
  category: Category | null;
  /** Rupees. */
  minInvestment: number | null;
  benchmark: string | null;
  source: { url: string; publisher: string; docType: string } | null;
  /** The scheme's /sif page, once it trades and has one. */
  sifId: string | null;
};

type NfoWindow = Pick<Nfo, "active" | "opensOn" | "closesOn">;

/**
 * Open and upcoming offers on `today`, sorted exactly as lib/data/nfo.ts sorts
 * `activeNfos` and `upcomingNfos` — so the island rendering against
 * `navLastUpdated` produces the build's lists, and against the reader's clock
 * the lists the build would produce that day.
 */
export function partitionNfos<T extends NfoWindow>(
  items: readonly T[],
  today: string,
): { open: T[]; upcoming: T[] } {
  const open = items
    .filter((n) => nfoStatus(n, today) === "open")
    .sort((a, b) => (a.closesOn ?? "").localeCompare(b.closesOn ?? ""));
  const upcoming = items
    .filter((n) => nfoStatus(n, today) === "upcoming")
    .sort((a, b) => {
      if (!a.opensOn || !b.opensOn) return a.opensOn ? -1 : b.opensOn ? 1 : 0;
      return a.opensOn.localeCompare(b.opensOn);
    });
  return { open, upcoming };
}
