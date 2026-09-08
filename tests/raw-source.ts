/**
 * The raw JSON, read independently of `@/lib/data`.
 *
 * The whole point of this suite is that a derivation bug in `lib/data/index.ts`
 * is DETECTABLE. Re-importing `stats.equityCount` and asserting it equals
 * `stats.equityCount` proves nothing; every count here is recomputed from the
 * files the pipeline actually writes, so the two can disagree and the test can
 * fail.
 *
 * Nothing in this module may import from `@/lib/data`.
 */
import schemesJson from "@/lib/data/raw/schemes.json";
import disclosuresJson from "@/lib/data/raw/disclosures.json";
import historyJson from "@/lib/data/raw/nav-history.json";
import nfoJson from "@/lib/data/raw/nfo-news.json";

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

export type RawAmcRow = {
  id: string;
  name: string;
  sifName: string;
  description: string;
};

export type RawDisclosureRow = Partial<{
  overview: string | null;
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
};

export const rawNfos: RawNfoRow[] = nfoJson as RawNfoRow[];

/** The series belonging to a scheme, keyed the way `lib/data` keys it. */
export function seriesFor(code: string): [string, number][] {
  return rawSeries[code] ?? [];
}

/**
 * The four fields the site's summary copy names by name. Duplicated from
 * `lib/data/index.ts` ON PURPOSE — importing its `HEADLINE_DISCLOSURES` (were
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
