import schemesRaw from "./raw/schemes.json";
import disclosuresRaw from "./raw/disclosures.json";
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

export type Nfo = {
  id: number;
  title: string;
  date: string;
  active: boolean;
  /**
   * ISO date the offer closes, inclusive.
   *
   * Optional on the type only because the JSON is hand-maintained; an entry
   * WITHOUT one can never be shown. See `isOpenNfo` — an offer with no stated
   * end is exactly the claim we cannot verify.
   */
  closesOn?: string;
};
export type Faq = { id: number; question: string; answer: string };

/* ============================================================
   Source
   ============================================================ */

/**
 * schemes.json carries identity and price only — the exact surface the nightly
 * NAV pipeline rewrites. Researched terms live in disclosures.json, which only
 * changes when someone reads an ISID, so the two files can never collide.
 */
type RawScheme = {
  id: string;
  amcId: string;
  name: string;
  category: string;
  type: string;
  amfiSchemeCode: string;
  isin: string | null;
  nav: number;
  navAsOf: string;
};

/** What disclosures.json may carry per scheme. No `overview` — that field
    is editorial, derived from the mandate, and lives in MANDATE_OVERVIEW.
    Everything here is read from the scheme's own information document. */
type RawDisclosure = Partial<{
  minInvestment: number | null;
  expenseRatio: number | null;
  expenseRatioIsCap: boolean;
  exitLoad: string | null;
  riskBand: string | null;
  benchmark: string | null;
  redemptionFrequency: string | null;
  taxation: string | null;
  dividend: string | null;
  verified: boolean;
}>;

const source = schemesRaw as {
  source: string;
  fetchedAt: string;
  navAsOf: string;
  schemes: RawScheme[];
  /** No `description`: it is editorial and derived — see `describeAmc`. */
  amcs: Omit<Amc, "logo" | "description">[];
};

/** Keyed by AMFI scheme code, matching nav-history.json. */
const disclosures = (disclosuresRaw as { disclosures: Record<string, RawDisclosure> })
  .disclosures;

/**
 * Where the numbers come from. Surfaced in the UI, not just in code.
 *
 * This is a HUMAN LABEL — "AMFI — https://…" — not a URL. It must never be
 * used as an `href`: doing so resolved it against the current page and 404'd
 * on all three category pages. Link with `navSourceUrl` instead.
 */
export const navSource = source.source;

/**
 * The bare URL inside `navSource`, safe to use as an `href`.
 *
 * Extracted rather than stored separately so the two can never disagree about
 * which feed the figures came from. The fallback is AMFI's SIF landing page —
 * a working link to the right organisation beats a broken one to the exact
 * file, if the label's shape ever changes.
 */
export const navSourceUrl: string =
  navSource.match(/https?:\/\/\S+/)?.[0] ?? "https://www.amfiindia.com/sif";

export const navLastUpdated: string = source.navAsOf;

/* ============================================================
   AMC logos.

   All 17 houses now have a mark on disk, so `logo` is non-null for
   every AMC the feed carries today. The lookup stays a map with a
   null fallback rather than becoming a required field: the moment an
   eighteenth house files, it arrives through AMFI's feed with no
   asset behind it, and <AmcMark> must render a text lockup rather
   than a broken image. The null branch is for that day, not for a
   gap in this list.

   Extensions differ because the sources do — every file was taken
   from the house's own site. <AmcMark> routes .svg through a plain
   <img>, since next/image refuses SVG without `dangerouslyAllowSVG`.
   ============================================================ */

const AMC_LOGOS: Record<string, string> = {
  apex: "/amc/apex.png",
  arthaya: "/amc/arthaya.png",
  bandhan: "/amc/bandhan.png",
  dynasif: "/amc/dynasif.svg",
  edelweiss: "/amc/edelweiss.png",
  franklin: "/amc/franklin.png",
  hsbc: "/amc/hsbc.svg",
  icici: "/amc/icici.png",
  invesco: "/amc/invesco.png",
  iti: "/amc/iti.png",
  jioblackrock: "/amc/jioblackrock.png",
  kotak: "/amc/kotak.svg",
  mirae: "/amc/mirae.jpg",
  quant: "/amc/quant.png",
  sbi: "/amc/sbi.png",
  tata: "/amc/tata.png",
  wealth: "/amc/wealth.png",
};

/* ============================================================
   AMC descriptions.

   Derived, for the same reason `overview` is. Stored, all seventeen
   were boilerplate: nine generated from one template ("X offers
   Specialised Investment Fund strategies under the Y brand.") and
   eight that only restated the house's own name back at the reader
   ("Tata Mutual Fund's Titanium Specialised Investment Fund"). Both
   shapes carry no information the page's own heading does not
   already give, and both were the page's `standfirst` AND its meta
   description — the sentence Google shows.

   Built from the house's real identity plus the mandates it
   actually runs, it says something true that the heading does not,
   and it cannot go stale: a house that files an equity strategy
   next to its hybrid one starts describing itself as covering both
   the day that scheme lands in the feed.

   No trailing full stop — `/amc/[id]` appends its own, and the
   count of schemes is deliberately absent because the page renders
   that beside this sentence.
   ============================================================ */

function describeAmc(amc: { id: string; name: string; sifName: string }): string {
  const own = source.schemes.filter((s) => s.amcId === amc.id);
  const categories = [...new Set(own.map((s) => s.category))];

  const lead = `${amc.name} runs its Specialised Investment Fund strategies under the ${amc.sifName} brand`;

  // A house with no scheme in the feed yet: say only what is known.
  if (own.length === 0) return lead;

  const named =
    categories.length > 1
      ? `${categories.slice(0, -1).join(", ")} and ${categories[categories.length - 1]}`
      : categories[0];

  return own.length === 1
    ? `${lead}, a single ${named} long-short mandate`
    : `${lead}, across ${named} long-short mandates`;
}

export const amcs: Amc[] = source.amcs.map((a) => ({
  ...a,
  description: describeAmc(a),
  logo: AMC_LOGOS[a.id] ?? null,
}));

export const amcById = new Map(amcs.map((a) => [a.id, a]));

/* ============================================================
   Mandate overviews.

   `overview` is the ONE editorial field on a scheme — it describes
   what a mandate does, not what a document says. It used to be
   stored per scheme in disclosures.json, where it was null for 17
   schemes and, for the 13 that had one, near-verbatim repetition of
   its neighbours: four Equity Long-Short schemes carried the same
   sentence word for word. That is duplication that can drift, over a
   field where drift would mean two schemes on the same mandate
   describing that mandate differently.

   So it is derived from `type`, written once here, and grounded in
   SEBI's SIF framework (circular of February 27, 2025) rather than
   in any one AMC's prose. Nothing scheme-specific belongs in these
   sentences — the scheme-specific facts are the sourced fields
   around them.

   Unknown mandate → null → "Not captured", the same fail-closed
   branch every other field uses. It is for the mandate SEBI adds
   next, not for a gap in this list.
   ============================================================ */

const MANDATE_OVERVIEW: Record<string, string> = {
  "Equity Long-Short":
    "A predominantly equity mandate that holds long positions in stocks it expects to appreciate while taking limited short exposure, through derivatives, against those it expects to fall. The short leg is capped by SEBI at 25% of net assets, so the strategy is directional rather than market-neutral: it aims to add return and damp drawdowns, not to remove market exposure.",
  "Equity Ex-Top 100 Long-Short":
    "The same long-short approach applied outside the 100 largest listed companies by market capitalisation. Excluding the top 100 puts the mandate in mid- and small-cap territory, where coverage is thinner and mispricing more common — which is the case for the strategy, and equally the reason its drawdowns can be sharper. Short exposure is capped by SEBI at 25% of net assets.",
  "Sector Rotation Long-Short":
    "An equity mandate that concentrates in a small number of sectors at a time and moves between them as the cycle turns, taking limited short exposure through derivatives. Concentration is the point and the risk: returns depend on the manager's sector calls rather than on broad market direction. Short exposure is capped by SEBI at 25% of net assets.",
  "Hybrid Long-Short":
    "A mandate that holds both equity and debt, with limited short exposure through derivatives on either leg. The debt allocation is what separates it from an equity long-short strategy — it is meant to steady returns across the cycle rather than to maximise them in a rising market. Short exposure is capped by SEBI at 25% of net assets.",
  "Active Asset Allocator Long-Short":
    "A mandate that moves actively across asset classes — equity, debt, and where permitted REITs, InvITs and commodity exposure — rather than holding a fixed split, with limited short exposure through derivatives. The allocation decision itself is the strategy, so returns track the manager's judgement on which asset class to hold and when. Short exposure is capped by SEBI at 25% of net assets.",
};

/* ============================================================
   Schemes
   ============================================================ */

export const strategies: Strategy[] = source.schemes.map((s) => {
  /* No entry means nothing has been researched for this scheme. Every field
     then resolves to null and the UI renders "Not captured" — which is the
     honest state, not a gap to be filled with defaults. */
  const d: RawDisclosure = disclosures[s.amfiSchemeCode] ?? {};

  return {
    id: s.id,
    amcId: s.amcId,
    name: s.name,
    category: s.category as Category,
    type: s.type,
    amfiSchemeCode: s.amfiSchemeCode,
    isin: s.isin,
    disclosuresCaptured: s.amfiSchemeCode in disclosures,
    disclosuresVerified: d.verified === true,
    // Editorial and derived from the mandate — see MANDATE_OVERVIEW above.
    // Not sourced from the ISID, so it is not gated on `disclosuresCaptured`.
    overview: MANDATE_OVERVIEW[s.type] ?? null,
    minInvestment: d.minInvestment ?? null,
    expenseRatio: d.expenseRatio ?? null,
    expenseRatioIsCap: d.expenseRatioIsCap ?? null,
    exitLoad: d.exitLoad ?? null,
    riskBand: d.riskBand ?? null,
    benchmark: d.benchmark ?? null,
    redemptionFrequency: d.redemptionFrequency ?? null,
    taxation: d.taxation ?? null,
    dividend: d.dividend ?? null,
  };
});

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

/**
 * The four fields the summary copy across the site actually names —
 * "risk band, expense, exit load and minimum".
 *
 * Kept as a list rather than an inline conjunction so the sentence and the
 * count are answering the same question. If the copy ever names a fifth
 * field, adding it here is what keeps the promise honest.
 */
const HEADLINE_DISCLOSURES = [
  "riskBand",
  "expenseRatio",
  "exitLoad",
  "minInvestment",
] as const satisfies readonly (keyof Strategy)[];

/**
 * True only when every field the summary copy names is present.
 *
 * A scheme can have a researched entry — `disclosuresCaptured` — and still
 * leave one of these null, in which case the row honestly renders "Not
 * captured" while the page's own summary claimed the full set.
 */
export function hasFullDisclosures(s: Strategy): boolean {
  return HEADLINE_DISCLOSURES.every((field) => s[field] !== null);
}

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

/**
 * Is this offer still open on `today`?
 *
 * `active` alone is a hand-set flag with NO expiry, which is how three NFO
 * windows that closed in January stayed on the ticker under a pulsing "Live
 * NFO" label for seven months. An entry must now also carry a `closesOn` that
 * has not passed.
 *
 * A missing `closesOn` returns false rather than true. An offer with no stated
 * end date is not evidence that it is open — it is an absence, and the ticker
 * is the one surface on this site that asserts liveness.
 *
 * Compared as ISO strings in UTC, so the answer cannot shift by a day with the
 * reader's timezone. Inclusive of the closing date: an offer open "to 30 Jan"
 * is open ON 30 Jan.
 */
export function isOpenNfo(nfo: Nfo, today: Date = new Date()): boolean {
  if (!nfo.active || !nfo.closesOn) return false;
  return nfo.closesOn >= today.toISOString().slice(0, 10);
}

/**
 * Offers open at BUILD time.
 *
 * Static rendering means this is only as fresh as the last deploy. The nightly
 * NAV commit rebuilds every business day, which bounds the staleness at one
 * business day — but a page left open overnight would keep asserting an
 * expired offer, so <NfoBar> re-checks against the client's clock too.
 */
export const activeNfos: Nfo[] = (nfoRaw as Nfo[]).filter((n) => isOpenNfo(n));

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
  /**
   * How many schemes have a disclosures entry AT ALL.
   *
   * NOT the same as holding the full set — an entry may still leave individual
   * fields null. Copy that names specific fields must use
   * `fullyDisclosedCount`; this one only supports "we have read a document".
   */
  disclosedCount: strategies.filter((s) => s.disclosuresCaptured).length,
  /**
   * How many hold ALL FOUR fields the summary copy names.
   *
   * `disclosedCount` counts the presence of an entry, which is a weaker claim:
   * a scheme can hold a researched entry and still leave one of these four
   * fields null, so copy promising "risk band, expense, exit load and minimum"
   * over that count overstates what we have.
   *
   * Currently the two are equal — every entry states all four — so no sentence
   * differs today. Both counts stay because the gap is the normal state, not a
   * backlog: a scheme is entered from its information document field by field,
   * and any ISID that omits one reopens it. Derived on both sides, so the copy
   * follows the data rather than having to be remembered.
   */
  fullyDisclosedCount: strategies.filter(hasFullDisclosures).length,
  /** Of those, how many a second reader confirmed against the source document. */
  disclosuresVerifiedCount: strategies.filter((s) => s.disclosuresVerified).length,
  mandateCount: mandates.length,
  /** Total published NAVs held across every scheme. */
  navObservations: Object.values(seriesByStrategy).reduce(
    (n, points) => n + points.length,
    0,
  ),
  /** Schemes with enough history to plot a line (two points or more). */
  chartableCount: strategies.filter((s) => navHistory(s.id).length > 1).length,
  /** Earliest published NAV we hold, across all schemes. */
  /**
   * Earliest published NAV we hold, across every scheme — or null if we hold
   * no history at all.
   *
   * Nullable on purpose. This used to be typed `string` while the expression
   * behind it (`.sort()[0]`) returns `undefined` on an empty list, so a feed
   * that arrived with no series would have handed `formatUpdated` an
   * `undefined` and rendered the string "Invalid Date" into the page meta —
   * a date-shaped claim about data we do not have. Unreachable today with
   * 30 series on file, which is exactly why it needed to be in the type
   * rather than left to a reader noticing.
   */
  navHistoryFrom: (Object.values(seriesByStrategy)
    .map((points) => points[0]?.date)
    .filter((date): date is string => date !== undefined)
    .sort()[0] ?? null) as string | null,
  minInvestment: 1_000_000,
  maxUnhedgedShortPct: 25,
};

/* ============================================================
   Formatting — Indian numbering, tabular-safe
   ============================================================ */

/** The lakh/crore mantissa, at the precision `formatInr` documents below. */
function compactRupees(mantissa: number, unit: "L" | "Cr"): string {
  return `₹${mantissa.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit}`;
}

/**
 * A rupee figure in Indian grouping — ₹10,00,000. `compact` renders the
 * lakh/crore shorthand instead — ₹12.35 L, ₹1.25 Cr.
 *
 * DECIMALS ARE BOUNDED AT TWO, and that bound is the reason the option is
 * still here. Unbounded, `1_234_567` rendered "₹12.34567 L" — one character
 * LONGER than the ₹12,34,567 it was shortening, which is the one thing a
 * compact form must never be. Two places is not an arbitrary pick either:
 * `formatPct` and `formatExpense` already fix every inexact number on this
 * site at two, so the compact form reuses that policy rather than inventing a
 * third. Trailing zeros are dropped, so an exact ten lakh still reads "₹10 L"
 * rather than "₹10.00 L", and the mantissa itself goes through en-IN grouping
 * so a four-figure crore reads "₹1,000 Cr". (A figure within ₹500 of a crore
 * rounds to "₹100 L" rather than promoting to "₹1 Cr" — accepted, because
 * nothing that needs the boundary read exactly should be compacting it.)
 *
 * NOTHING PASSES `compact` TODAY, and that is deliberate rather than an
 * oversight waiting to be tidied. Its one caller was the homepage strategy
 * card's minimum investment — the same figure /amc/[id], /sif-tracker,
 * /nav-tracker and /strategies/[category] all print in full — so the card now
 * prints it in full too and the site states one number one way. The option
 * survives that removal because the defect was the precision, not the
 * notation: the shorthand belongs to a large APPROXIMATE quantity — an AUM, a
 * chart axis — and this site simply has none yet, since AMFI's SIF feed
 * carries no such number. It does not belong on a disclosed term an investor
 * has to meet to the rupee.
 */
export function formatInr(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (value >= 10_000_000) return compactRupees(value / 10_000_000, "Cr");
    if (value >= 100_000) return compactRupees(value / 100_000, "L");
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

/**
 * An expense ratio, shown for what it actually is.
 *
 * ISIDs quote the MAXIMUM permissible TER, not the ratio a scheme currently
 * charges — the charged figure is published on the AMC's own site and moves.
 * Printing a cap as a bare percentage would state a fee the investor may not
 * be paying, so a known cap renders as a ceiling.
 *
 * `isCap` null means we do not know which the figure is (it predates the ISID
 * reads), and an unknown must not be dressed up as either.
 */
export function formatExpense(
  ratio: number | null,
  isCap: boolean | null,
): string | null {
  if (ratio === null) return null;
  const pct = `${ratio.toFixed(2)}%`;
  return isCap ? `Up to ${pct}` : pct;
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
