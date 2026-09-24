/**
 * The raw JSON, read independently of `@/lib/data`.
 *
 * The whole point of this suite is that a derivation bug in `lib/data/*` is
 * DETECTABLE. Re-importing `stats.equityCount` and asserting it equals
 * `stats.equityCount` proves nothing; every count here is recomputed from the
 * files the pipeline actually writes, so the two can disagree and the test can
 * fail.
 *
 * Nothing in this module may import from `@/lib/data` — only the raw JSON
 * files under `@/lib/data/raw/`.
 */
import schemesJson from "@/lib/data/raw/schemes.json";
import disclosuresJson from "@/lib/data/raw/disclosures.json";
import historyJson from "@/lib/data/raw/nav-history.json";
import nfoJson from "@/lib/data/raw/nfo-news.json";
import faqsJson from "@/lib/data/raw/faqs.json";
import factsJson from "@/lib/data/raw/scheme-facts.json";
import aumJson from "@/lib/data/raw/aum.json";
import terJson from "@/lib/data/raw/ter.json";
import documentsJson from "@/lib/data/raw/documents.json";
import portfolioJson from "@/lib/data/raw/portfolio.json";

export type RawSchemeRow = {
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

/** No `description` — it is editorial and derived from the house's mandates
    by `describeAmc` in `lib/data/core.ts`, not stored per AMC. */
export type RawAmcRow = {
  id: string;
  name: string;
  sifName: string;
};

/** No `overview` — it is editorial, derived from the mandate in
    `lib/data/core.ts`, and deliberately not stored per scheme. */
export type RawDisclosureRow = Partial<{
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

export const rawSchemesFile = schemesJson as {
  source: string;
  fetchedAt: string;
  navAsOf: string;
  schemes: RawSchemeRow[];
  amcs: RawAmcRow[];
};

export const rawSchemes: RawSchemeRow[] = rawSchemesFile.schemes;
export const rawAmcs: RawAmcRow[] = rawSchemesFile.amcs;

export const rawDisclosures: Record<string, RawDisclosureRow> = (
  disclosuresJson as { disclosures: Record<string, RawDisclosureRow> }
).disclosures;

/** `[date, nav]` pairs keyed by AMFI scheme code, as written by the pipeline. */
export const rawSeries: Record<string, [string, number][]> = (
  historyJson as { series: Record<string, (string | number)[][]> }
).series as Record<string, [string, number][]>;

export type RawNfoRow = {
  id: number;
  title: string;
  date: string;
  active: boolean;
  closesOn?: string;
  opensOn?: string;
  schemeCode?: string;
  sources?: { url: string; publisher: string; docType: string; retrievedOn: string }[];
};

/** Every element of nfo-news.json, the leading `_comment` object included. */
export const rawNfos: RawNfoRow[] = nfoJson as RawNfoRow[];

/** The offers only — element 0 of the file is a comment, not an offer. */
export const rawNfoEntries: RawNfoRow[] = rawNfos.filter((n) => typeof n.id === "number");

export const rawFaqs = faqsJson as {
  id: number;
  question: string;
  answer: string;
  category?: string;
  approved?: boolean;
}[];

/* ============================================================
   Hand-researched files. Same Fact shape in each: { value, src,
   locator, verified }, with `src` naming an entry in the file's own
   `sources` dict (documents.json entries are their own source).
   ============================================================ */

export type RawSourceRow = {
  url: string;
  publisher: string;
  publisherKind: string;
  docType: string;
  title: string;
  asOf?: string | null;
  retrievedOn: string;
};

export type RawFactRow = { value: unknown; src: string; locator: string; verified?: boolean };

export const rawFactsFile = factsJson as {
  schemaVersion: number;
  sources: Record<string, RawSourceRow>;
  schemes: Record<string, Record<string, RawFactRow>>;
};

export const rawAumFile = aumJson as {
  schemaVersion: number;
  unit: string;
  basis: string;
  sources: Record<string, RawSourceRow>;
  schemes: Record<
    string,
    { month: string; aumCr: number; src: string; locator: string; verified?: boolean }[]
  >;
};

export const rawTerFile = terJson as {
  schemaVersion: number;
  plan: string;
  sources: Record<string, RawSourceRow>;
  schemes: Record<
    string,
    { asOf: string; terPct: number; src: string; locator: string; verified?: boolean }[]
  >;
};

export const rawDocumentsFile = documentsJson as {
  schemaVersion: number;
  schemes: Record<
    string,
    {
      kind: string;
      title: string;
      url: string;
      date: string;
      publisher: string;
      verified?: boolean;
    }[]
  >;
  amcs: Record<string, unknown[]>;
};

export const rawPortfolioFile = portfolioJson as {
  schemaVersion: number;
  sources: Record<string, RawSourceRow>;
  schemes: Record<string, unknown>;
};

/** The series belonging to a scheme, keyed the way `lib/data` keys it. */
export function seriesFor(code: string): [string, number][] {
  return rawSeries[code] ?? [];
}

/**
 * The four fields the site's summary copy names by name. Duplicated from
 * `lib/data/core.ts` ON PURPOSE — importing its `HEADLINE_DISCLOSURES` (were
 * it exported) would make the test agree with the implementation by
 * construction. Written out here, a silent change to that list fails a test.
 */
export const HEADLINE_FIELDS = [
  "riskBand",
  "expenseRatio",
  "exitLoad",
  "minInvestment",
] as const;

/** Recomputed from disclosures.json, not from `hasFullDisclosures`. */
export function rawHasAllHeadlineFields(code: string): boolean {
  const entry = rawDisclosures[code];
  if (!entry) return false;
  return HEADLINE_FIELDS.every((field) => (entry[field] ?? null) !== null);
}
