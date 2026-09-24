import schemesRaw from "./raw/schemes.json";
import disclosuresRaw from "./raw/disclosures.json";

import type { Amc, DocType, SourceRef } from "./types";

/* ============================================================
   The two pipeline-facing raw files, typed at the boundary.

   INTERNAL to lib/data — the barrel does not re-export this module.
   Pages read the derived exports in core.ts; the raw shapes are an
   implementation detail of how the nightly pipeline writes JSON.
   ============================================================ */

/**
 * schemes.json carries identity and price only — the exact surface the nightly
 * NAV pipeline rewrites. Researched terms live in disclosures.json, which only
 * changes when someone reads an ISID, so the two files can never collide.
 */
export type RawScheme = {
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
export type RawDisclosure = Partial<{
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

export const source = schemesRaw as {
  source: string;
  fetchedAt: string;
  navAsOf: string;
  schemes: RawScheme[];
  /** No `description`: it is editorial and derived — see `describeAmc`. */
  amcs: Omit<Amc, "logo" | "description">[];
};

/** Keyed by AMFI scheme code, matching nav-history.json. */
export const disclosures = (disclosuresRaw as { disclosures: Record<string, RawDisclosure> })
  .disclosures;

/** AMFI code → raw scheme row. */
export const rawSchemeByCode: ReadonlyMap<string, RawScheme> = new Map(
  source.schemes.map((s) => [s.amfiSchemeCode, s]),
);

/* ============================================================
   Researched-fact plumbing, shared by facts.ts, aum.ts and costs.ts
   ============================================================ */

/** A value as the research files store it, before verification is applied. */
export type RawFact<T> = { value: T; src: string; locator: string; verified?: boolean };

/** One entry of a research file's `sources` dict (the id is its key). */
export type RawSource = {
  url: string;
  publisher: string;
  publisherKind: "AMC" | "AMFI" | "SEBI";
  docType: string;
  title: string;
  asOf?: string | null;
  retrievedOn: string;
};

const DOC_TYPES: ReadonlySet<string> = new Set<DocType>([
  "ISID",
  "SID",
  "KIM",
  "SAI",
  "factsheet",
  "portfolio",
  "addendum",
  "ter-disclosure",
  "press-release",
  "amfi-data",
  "sebi-filing",
]);

const PUBLISHER_KINDS: ReadonlySet<string> = new Set(["AMC", "AMFI", "SEBI"]);

/**
 * A `sources` entry as a SourceRef, or null if it is not a usable citation.
 * Shared by facts.ts, aum.ts and costs.ts — each research file carries its
 * own `sources` dict, and all three resolve against it the same way.
 */
export function resolveSource(
  sources: Record<string, RawSource> | undefined,
  id: string,
): SourceRef | null {
  const s = sources?.[id];
  if (!s || typeof s.url !== "string" || !/^https:\/\//.test(s.url)) return null;
  if (!PUBLISHER_KINDS.has(s.publisherKind) || !DOC_TYPES.has(s.docType)) return null;
  return {
    id,
    url: s.url,
    publisher: s.publisher,
    publisherKind: s.publisherKind,
    docType: s.docType as DocType,
    title: s.title,
    asOf: s.asOf ?? null,
    retrievedOn: s.retrievedOn,
  };
}
