import faqsRaw from "./raw/faqs.json";

import { disclosures, source, type RawDisclosure } from "./source";
import type { Amc, Category, Faq, Strategy } from "./types";

/* ============================================================
   Identity: sources, AMCs, schemes, mandates, FAQs.

   Everything else in lib/data derives from what this module
   exports. It holds no NAV history — that is nav.ts — so a server
   component that only needs names and disclosures does not have to
   evaluate the series to get them.
   ============================================================ */

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

/**
 * The date of the AMFI file — and the site's "today" for every derivation.
 * Nothing in lib/data reads the wall clock; returns, ages and NFO windows are
 * all measured against this, so a build is reproducible from its inputs.
 */
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

export const strategyById: ReadonlyMap<string, Strategy> = new Map(
  strategies.map((s) => [s.id, s]),
);

/** Keyed by AMFI code, upper-cased — codes arrive from URLs in any case. */
export const strategyByCode: ReadonlyMap<string, Strategy> = new Map(
  strategies.map((s) => [s.amfiSchemeCode.toUpperCase(), s]),
);

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
   FAQ
   ============================================================ */

/**
 * The FAQs a page may print. An answer marked `approved: false` is drafted
 * copy waiting on compliance sign-off — the PRD's new questions land that
 * way — so it stays in the file and out of the export, the same gate
 * lib/content applies to articles. An entry with no flag predates the flag
 * and was already live, so it stays live.
 */
export const faqs: Faq[] = (faqsRaw as Faq[]).filter((f) => f.approved !== false);
