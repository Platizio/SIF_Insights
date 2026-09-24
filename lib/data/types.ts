/* ============================================================
   Types for the data layer — and ONLY types (plus the one const
   a type is derived from).

   This module is the client-safe face of `lib/data`. It imports
   nothing, so a `"use client"` island can `import type` from it
   without dragging a byte of the NAV history into its bundle —
   which is exactly what happened while these types lived in
   `lib/data/index.ts` beside the JSON imports: every client file
   that wanted `type Strategy` also pulled in the value module, and
   `"SIF-3":[[` shipped in the chunk every page loads.

   Keep it import-free. tests/client-imports.test.ts fails the build
   the moment this file grows a value import, because every island's
   type imports route through it.

   Everything here is generated from AMFI's live SIF NAV feed (see
   lib/data/raw/schemes.json → `source`) or from the hand-researched
   files beside it. The feed is authoritative for scheme code, ISIN,
   official name, NAV, as-of date and category. It carries NO
   disclosure data, so those fields are nullable and
   `disclosuresCaptured` says which schemes we actually hold them for.
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

  /**
   * True only for schemes whose disclosures we have actually researched.
   * DERIVED from the presence of a `disclosures.json` entry, not stored — a
   * separate flag could disagree with the data it describes.
   */
  disclosuresCaptured: boolean;

  overview: string | null;
  /** Rupees. e.g. 1000000 */
  minInvestment: number | null;
  /** Percent. e.g. 2.25 */
  expenseRatio: number | null;
  /**
   * True when `expenseRatio` is the ISID's MAXIMUM permissible TER rather than
   * the ratio actually charged. ISIDs quote the cap; the charged figure lives
   * on the AMC's own site. Anywhere the number is shown as fact, this must
   * qualify it.
   */
  expenseRatioIsCap: boolean | null;
  exitLoad: string | null;
  /** e.g. "Risk Band 5" */
  riskBand: string | null;
  benchmark: string | null;
  redemptionFrequency: string | null;
  taxation: string | null;
  dividend: string | null;
  /** True where a second agent re-read the source document and confirmed it. */
  disclosuresVerified: boolean;
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
 * We hold a real series per scheme: AMFI's daily snapshot feed supplies
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

/** Where a hand-researched NFO fact was read. */
export type NfoSource = {
  url: string;
  publisher: string;
  docType: DocType;
  retrievedOn: string;
};

export type Nfo = {
  id: number;
  title: string;
  date: string;
  active: boolean;
  /**
   * ISO date the offer opens, inclusive. When present, an offer is not open
   * before it — `isOpenNfo` used to ignore the open date entirely, so an
   * announced-but-not-yet-open offer would have been called live.
   */
  opensOn?: string;
  /**
   * ISO date the offer closes, inclusive.
   *
   * Optional on the type only because the JSON is hand-maintained; an entry
   * WITHOUT one can never be shown as open. See `isOpenNfo` — an offer with no
   * stated end is exactly the claim we cannot verify.
   */
  closesOn?: string;
  slug?: string;
  amcId?: string;
  schemeName?: string;
  strategyType?: string;
  category?: Category;
  /** The AMFI code the scheme will carry, once one is known. */
  schemeCode?: string;
  /** Rupees. */
  minInvestment?: number;
  sources?: NfoSource[];
};

/**
 * Derived from the dates, never stored — see `nfoStatus` in lib/format.ts.
 * "Live NFO" copy is allowed only for `open`.
 */
export type NfoStatus = "open" | "upcoming" | "closed";

export type Faq = {
  id: number;
  question: string;
  answer: string;
  category?: string;
  /** False until compliance signs the answer off. */
  approved?: boolean;
};

/* ============================================================
   Periods and returns
   ============================================================ */

export const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "2Y", "SI"] as const;
export type Period = (typeof PERIODS)[number];

/**
 * Why a value is missing. Each maps to ONE fixed phrase on the page — see
 * `absentLabel` in lib/format.ts — and never to a default or an estimate.
 *
 * `withheld` is the compliance branch: history exists, but the scheme is
 * younger than `PERFORMANCE_MIN_AGE_DAYS` so its performance is not shown.
 */
export type Absent =
  | "insufficient-history"
  | "not-captured"
  | "not-applicable"
  | "withheld";

export type ReturnResult =
  | {
      status: "ok";
      /** Percent. Absolute below a year, CAGR from a year. */
      pct: number;
      annualised: boolean;
      from: NavPoint;
      to: NavPoint;
      /** "face-value": measured from the unit's face value at allotment. */
      basis: "nav" | "face-value";
    }
  | {
      status: Exclude<Absent, "not-applicable">;
      /** The date the series would have to reach back to for this period. */
      needsFrom?: string;
    };

/** A value, or the reason it is missing. Plain data — serialisable. */
export type Cell<T> = { v: T } | { absent: Absent };

/* ============================================================
   Taxonomy
   ============================================================ */

/**
 * SEBI's seven SIF investment strategies (circular of 27 Feb 2025).
 * Written out as a union so a client-side lookup keyed on it is checked for
 * exhaustiveness by the compiler — see lib/screener/fields.ts.
 */
export type StrategySlug =
  | "equity-long-short"
  | "equity-ex-top-100-long-short"
  | "sector-rotation-long-short"
  | "hybrid-long-short"
  | "active-asset-allocator-long-short"
  | "debt-long-short"
  | "sectoral-debt-long-short";

export type LiquidityBucket =
  | "daily"
  | "twice-weekly"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "other";

/** An exit load, read out of the scheme document's own sentence. */
export type ExitLoad = {
  /** False = nil; null = not captured. */
  applicable: boolean | null;
  /** The highest rate charged, in percent. 0 for a nil load. */
  pct: number | null;
  /** Days from allotment until no load applies. 0 for a nil load. */
  periodDays: number | null;
  /** More than one charging rate (e.g. 0.50% then 0.25%). */
  tiered: boolean;
  /** The document's own words — what the page prints. */
  text: string | null;
};

/* ============================================================
   Researched facts (lib/data/raw/{scheme-facts,aum,ter,documents}.json)
   ============================================================ */

export type DocType =
  | "ISID"
  | "SID"
  | "KIM"
  | "SAI"
  | "factsheet"
  | "portfolio"
  | "addendum"
  | "ter-disclosure"
  | "press-release"
  | "amfi-data"
  | "sebi-filing";

/** A citable document. Every researched value names one by id. */
export type SourceRef = {
  id: string;
  url: string;
  publisher: string;
  publisherKind: "AMC" | "AMFI" | "SEBI";
  docType: DocType;
  title: string;
  asOf: string | null;
  retrievedOn: string;
};

/**
 * A hand-researched value that survived verification. The loaders drop any
 * fact whose `verified` is not true or whose `src` does not resolve, so a
 * `Fact` in hand always has a document behind it.
 */
export type Fact<T> = {
  value: T;
  src: string;
  /** Where in the source, e.g. "p.3 'Date of allotment'". */
  locator: string;
  source: SourceRef;
};

export type FundManager = { name: string; since?: string; role?: string };

export type SchemeFacts = {
  allotmentDate: Fact<string> | null;
  /** Rupees per unit at allotment. */
  faceValue: Fact<number> | null;
  fundManagers: Fact<FundManager[]> | null;
  objective: Fact<string> | null;
  subscription: Fact<{ bucket: LiquidityBucket; text: string }> | null;
  redemptionTerms: Fact<{
    days?: string[];
    noticeDays?: number;
    settlement?: string;
  }> | null;
  /** Rupees. */
  minAdditional: Fact<number> | null;
  /** Plan/option names as the document states them, e.g. ["Growth", "IDCW"]. */
  options: Fact<string[]> | null;
  assetAllocation: Fact<{ asset: string; minPct: number; maxPct: number }[]> | null;
};

export type DocumentKind =
  | "SID"
  | "KIM"
  | "SAI"
  | "ISID"
  | "factsheet"
  | "portfolio"
  | "addendum";

export type DocumentRef = {
  kind: DocumentKind;
  title: string;
  url: string;
  date: string;
  publisher: string;
};

/* ============================================================
   SifRow — the one serialisable per-scheme record

   Built once on the server (`buildSifRows`) and handed to the
   Tracker, Screener, Compare and /sif/[id] as plain props. Every
   metric the screener registry exposes is here as a plain value, so
   a client island never needs the data layer itself.
   ============================================================ */

export type SifRow = {
  id: string;
  /** AMFI scheme code, e.g. "SIF-3". The key the URL uses. */
  code: string;
  name: string;
  /** `name` without the plan/option suffix. */
  shortName: string;
  amcId: string;
  amcName: string;
  /** The SIF brand, e.g. "qsif". */
  brand: string;
  logo: string | null;

  category: Category;
  strategy: StrategySlug | null;
  strategyLabel: string;
  /** The mandate string exactly as schemes.json holds it. */
  type: string;

  /** Latest published NAV. NEVER ranked or plotted across schemes. */
  nav: number;
  navAsOf: string;
  faceValue: number;
  /** `inferred` = read off the first NAV (see `faceValue`), not a document. Say so. */
  faceValueBasis: "sourced" | "inferred";

  /** Percent. */
  returns: Record<Period, Cell<number>>;
  returnsMeta: Record<
    Period,
    { from?: string; to?: string; annualised?: boolean; basis?: "nav" | "face-value" }
  >;
  monthly: { month: string; pct: number }[];

  volatility: Cell<number>;
  /** Percent, ≤ 0 — a drawdown is a fall. */
  maxDrawdown: Cell<number>;

  riskBand: number | null;
  /** Canonical index label — see `normaliseBenchmark`. */
  benchmark: string | null;
  benchmarkId: string | null;
  /** The scheme document's own wording, for pages that quote it. */
  benchmarkText: string | null;

  aumCr: Cell<number>;
  aumAsOf: string | null;
  /** Only when every scheme of the house is counted — a partial sum is not the house's AUM. */
  amcAumCr: Cell<number>;
  /** Month end `amcAumCr` is summed over; null with no house total. */
  amcAumAsOf: string | null;

  /** Total TER charged (Regular plan), dated: base ratio + brokerage +
      transaction costs + statutory levies. Never the cap. */
  ter: Cell<number>;
  terAsOf: string | null;
  /** Base expense ratio from the same dated TER row — the figure SEBI's cap limits. */
  ber: Cell<number>;
  /** The ISID/addendum cap on the base expense ratio. Never mixed with `ter`. */
  terMax: Cell<number>;

  exitLoad: ExitLoad;

  /** Redemption frequency, bucketed. */
  liquidity: LiquidityBucket | null;
  redemptionText: string | null;
  subscriptionText: string | null;
  /** Subscription frequency, bucketed (from scheme-facts). */
  subscriptionBucket: LiquidityBucket | null;

  minInvestment: number | null;
  minAdditional: number | null;
  /** Plan/option names; empty when not captured. */
  options: string[];

  managers: string[];
  inception: { date: string; basis: "allotment" | "first-nav" } | null;
  /** Days from inception to `navLastUpdated`. */
  ageDays: number | null;
  /** `recent` = ≤ 90 days since inception. */
  status: "live" | "recent";

  taxation: string | null;
  dividend: string | null;
  objective: string | null;

  disclosures: {
    captured: boolean;
    full: boolean;
    factsheet: boolean;
    portfolio: boolean;
    sid: boolean;
  };
  documents: DocumentRef[];
};
