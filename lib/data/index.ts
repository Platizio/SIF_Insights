import schemesRaw from "./raw/schemes.json";
import historyRaw from "./raw/nav-history.json";
import faqsRaw from "./raw/faqs.json";
import nfoRaw from "./raw/nfo-news.json";

/* ============================================================
   Types

   Everything here is generated from AMFI's live SIF NAV feed
   (see lib/data/raw/schemes.json → `source`). The feed is
   authoritative for scheme code, ISIN, official name, NAV, as-of
   date and category. It carries NO disclosure data, so those
   fields are nullable and `disclosuresCaptured` says which
   schemes we actually hold them for.
   ============================================================ */

export type Category = "equity" | "hybrid" | "debt";

export type Strategy = {
  id: string;
  amcId: string;
  /** AMFI's official scheme name — authoritative, not our paraphrase. */
  name: string;
  category: Category;
  /** The specific mandate, e.g. "Equity Ex-Top 100 Long-Short". */
  type: string;
  amfiSchemeCode: string;
  isin: string | null;

  /** True only for schemes whose disclosures we have actually researched. */
  disclosuresCaptured: boolean;

  overview: string | null;
  /** Rupees. e.g. 1000000 */
  minInvestment: number | null;
  /** Percent. e.g. 2.25 */
  expenseRatio: number | null;
  exitLoad: string | null;
  /** e.g. "Risk Band 5" */
  riskBand: string | null;
  benchmark: string | null;
  redemptionFrequency: string | null;
  taxation: string | null;
  dividend: string | null;
};

export type Amc = {
  id: string;
  name: string;
  sifName: string;
  description: string;
  /** Null where we hold no mark for the house — render a text lockup. */
  logo: string | null;
};

/** One published NAV, on the date it was published. */
export type NavPoint = { date: string; nav: number };

/**
 * A NAV observation.
 *
 * We now hold a real series per scheme: AMFI's daily snapshot feed supplies
 * today's value, and its historical-NAV export supplied every prior published
 * value back to each scheme's first. Nothing here is modelled or interpolated
 * — every point is a figure AMFI published on that date.
 *
 * `changePct` is therefore the move since the PREVIOUS PUBLISHED NAV, which is
 * not always the previous calendar day (weekends, holidays and non-dealing
 * days are simply absent from the series). `previous` carries that date so the
 * UI can say which close it is measured against instead of implying "today".
 *
 * It stays `null` when only one observation exists for a scheme — null rather
 * than 0, since zero would claim the fund was unchanged, which we would not know.
 */
export type NavQuote =
  | {
      status: "live";
      today: number;
      asOf: string;
      changePct: number | null;
      /** The close `changePct` is measured against. Null when none is held. */
      previous: NavPoint | null;
      /** How many published NAVs we hold for this scheme. */
      observations: number;
    }
  | { status: "pending" };

export type Nfo = { id: number; title: string; date: string; active: boolean };
export type Faq = { id: number; question: string; answer: string };

/* ============================================================
   Source
   ============================================================ */

type RawScheme = Omit<Strategy, "category"> & {
  category: string;
  nav: number;
  navAsOf: string;
};

const source = schemesRaw as {
  source: string;
  fetchedAt: string;
  navAsOf: string;
  schemes: RawScheme[];
  amcs: Omit<Amc, "logo">[];
};

/** Where the numbers come from. Surfaced in the UI, not just in code. */
export const navSource = source.source;
export const navLastUpdated: string = source.navAsOf;

/* ============================================================
   AMC logos — only the original eight houses have a mark on
   disk. The rest render as a text lockup rather than a gap.
   ============================================================ */

const AMC_LOGOS: Record<string, string> = {
  quant: "/amc/quant.png",
  sbi: "/amc/sbi.png",
  edelweiss: "/amc/edelweiss.png",
  tata: "/amc/tata.png",
  iti: "/amc/iti.png",
  icici: "/amc/icici.png",
  bandhan: "/amc/bandhan.png",
  wealth: "/amc/wealth.png",
  // Fetched from each house's own site. Extensions differ because the
  // sources do — <AmcMark> routes .svg through a plain <img>, since
  // next/image refuses SVG without `dangerouslyAllowSVG`.
  apex: "/amc/apex.png",
  arthaya: "/amc/arthaya.png",
  dynasif: "/amc/dynasif.svg",
  franklin: "/amc/franklin.png",
  hsbc: "/amc/hsbc.svg",
  invesco: "/amc/invesco.png",
  jioblackrock: "/amc/jioblackrock.png",
  kotak: "/amc/kotak.svg",
  mirae: "/amc/mirae.jpg",
};

export const amcs: Amc[] = source.amcs.map((a) => ({
  ...a,
  logo: AMC_LOGOS[a.id] ?? null,
}));

export const amcById = new Map(amcs.map((a) => [a.id, a]));

/* ============================================================
   Schemes
   ============================================================ */

export const strategies: Strategy[] = source.schemes.map((s) => ({
  id: s.id,
  amcId: s.amcId,
  name: s.name,
  category: s.category as Category,
  type: s.type,
  amfiSchemeCode: s.amfiSchemeCode,
  isin: s.isin,
  disclosuresCaptured: s.disclosuresCaptured,
  overview: s.overview,
  minInvestment: s.minInvestment,
  expenseRatio: s.expenseRatio,
  exitLoad: s.exitLoad,
  riskBand: s.riskBand,
  benchmark: s.benchmark,
  redemptionFrequency: s.redemptionFrequency,
  taxation: s.taxation,
  dividend: s.dividend,
}));

export const strategiesByCategory: Record<Category, Strategy[]> = {
  equity: strategies.filter((s) => s.category === "equity"),
  hybrid: strategies.filter((s) => s.category === "hybrid"),
  debt: strategies.filter((s) => s.category === "debt"),
};

/** Every distinct mandate present in the data, commonest first. */
export const mandates: { type: string; count: number }[] = Object.entries(
  strategies.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1;
    return acc;
  }, {}),
)
  .map(([type, count]) => ({ type, count }))
  .sort((a, b) => b.count - a.count);

/* ============================================================
   NAV
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
 * A percentage move IS now comparable across schemes (that is the whole point
 * of using percent rather than absolute rupees), so ranking by `changePct` is
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

/* ============================================================
   NFO + FAQ
   ============================================================ */

export const activeNfos: Nfo[] = (nfoRaw as Nfo[]).filter((n) => n.active);
export const faqs: Faq[] = faqsRaw as Faq[];

/* ============================================================
   Derived counts — every figure on the site traces to here
   ============================================================ */

export const stats = {
  amcCount: amcs.length,
  strategyCount: strategies.length,
  equityCount: strategiesByCategory.equity.length,
  hybridCount: strategiesByCategory.hybrid.length,
  debtCount: strategiesByCategory.debt.length,
  liveNavCount: strategies.filter((s) => getNav(s.id).status === "live").length,
  /** How many schemes we hold the full disclosure set for. */
  disclosedCount: strategies.filter((s) => s.disclosuresCaptured).length,
  mandateCount: mandates.length,
  /** Total published NAVs held across every scheme. */
  navObservations: Object.values(seriesByStrategy).reduce(
    (n, points) => n + points.length,
    0,
  ),
  /** Schemes with enough history to plot a line (two points or more). */
  chartableCount: strategies.filter((s) => navHistory(s.id).length > 1).length,
  /** Earliest published NAV we hold, across all schemes. */
  navHistoryFrom: Object.values(seriesByStrategy)
    .filter((p) => p.length > 0)
    .map((p) => p[0].date)
    .sort()[0],
  minInvestment: 1_000_000,
  maxUnhedgedShortPct: 25,
};

/* ============================================================
   Formatting — Indian numbering, tabular-safe
   ============================================================ */

export function formatInr(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (value >= 10_000_000) return `₹${value / 10_000_000} Cr`;
    if (value >= 100_000) return `₹${value / 100_000} L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

/** NAVs carry up to 4 decimals in the feed; preserve what is published. */
export function formatNav(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}`;
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/** "Risk Band 5" -> 5. Null when the scheme's band is not captured. */
export function riskBandNumber(riskBand: string | null): number | null {
  if (!riskBand) return null;
  const match = riskBand.match(/\d+/);
  const n = match ? Number(match[0]) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

export function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
