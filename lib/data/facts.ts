import factsRaw from "./raw/scheme-facts.json";
import documentsRaw from "./raw/documents.json";

import { strategyById } from "./core";
import { navHistory } from "./nav";
import { resolveSource, type RawFact, type RawSource } from "./source";
import type {
  DocumentKind,
  DocumentRef,
  Fact,
  LiquidityBucket,
  SchemeFacts,
} from "./types";

/* ============================================================
   Researched scheme facts, face value, inception, documents.

   Every value here was read by a person out of a named document and
   checked by a second one. The loaders are deliberately forgiving in
   ONE direction only: a scheme with no entry, a fact that is not
   verified, a `src` that does not resolve, or a value of the wrong
   shape all collapse to null — "Not captured" on the page — and
   never to a default, and never to a thrown error at build time. A
   missing research entry must not be able to take the site down.
   The strictness lives in tests/raw-facts.test.ts instead, which
   fails loudly on exactly the entries this module quietly drops.
   ============================================================ */

type RawSchemeFacts = Partial<Record<keyof SchemeFacts, RawFact<unknown>>>;

const factsFile = factsRaw as {
  sources: Record<string, RawSource>;
  schemes: Record<string, RawSchemeFacts>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BUCKETS: ReadonlySet<string> = new Set<LiquidityBucket>([
  "daily",
  "twice-weekly",
  "weekly",
  "fortnightly",
  "monthly",
  "other",
]);

const isPositive = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The shape each field's `value` must have. A verified fact whose value fails
 * its check is dropped like an unverified one: the research merge wrote
 * something the page cannot state as the field it claims to be.
 */
const VALID: { [K in keyof SchemeFacts]: (v: unknown) => boolean } = {
  allotmentDate: (v) => typeof v === "string" && ISO_DATE.test(v),
  faceValue: isPositive,
  fundManagers: (v) =>
    Array.isArray(v) && v.length > 0 && v.every((m) => isRecord(m) && isText(m.name)),
  objective: isText,
  subscription: (v) => isRecord(v) && BUCKETS.has(String(v.bucket)) && isText(v.text),
  redemptionTerms: isRecord,
  minAdditional: isPositive,
  options: (v) => Array.isArray(v) && v.length > 0 && v.every(isText),
  assetAllocation: (v) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (a) =>
        isRecord(a) &&
        isText(a.asset) &&
        typeof a.minPct === "number" &&
        typeof a.maxPct === "number" &&
        a.minPct <= a.maxPct,
    ),
};

const FACT_KEYS = Object.keys(VALID) as (keyof SchemeFacts)[];

const NONE: SchemeFacts = Object.freeze({
  allotmentDate: null,
  faceValue: null,
  fundManagers: null,
  objective: null,
  subscription: null,
  redemptionTerms: null,
  minAdditional: null,
  options: null,
  assetAllocation: null,
});

function toFact<T>(
  raw: RawFact<unknown> | undefined,
  sources: Record<string, RawSource>,
  valid: (v: unknown) => boolean,
): Fact<T> | null {
  if (!raw || raw.verified !== true || !valid(raw.value)) return null;
  const source = resolveSource(sources, raw.src);
  if (!source) return null;
  return { value: raw.value as T, src: raw.src, locator: raw.locator, source };
}

const factsCache = new Map<string, SchemeFacts>();

/**
 * Every researched fact for a scheme, keyed by AMFI code.
 *
 * Each field is a `Fact` (value + its citation) or null. An unknown code, or a
 * scheme nobody has researched, returns all nulls rather than throwing.
 */
export function schemeFacts(code: string): SchemeFacts {
  const key = code.toUpperCase();
  const cached = factsCache.get(key);
  if (cached) return cached;

  const raw = factsFile.schemes[key];
  let facts: SchemeFacts = NONE;
  if (raw) {
    const built = { ...NONE } as Record<keyof SchemeFacts, Fact<unknown> | null>;
    for (const k of FACT_KEYS) built[k] = toFact(raw[k], factsFile.sources, VALID[k]);
    facts = built as SchemeFacts;
  }
  factsCache.set(key, facts);
  return facts;
}

/* ============================================================
   Face value and inception
   ============================================================ */

/**
 * The rupee value of one unit at allotment.
 *
 * `sourced` when a verified document states it. Otherwise `inferred` from the
 * FIRST published NAV: a scheme that started trading above ₹200 was issued at
 * ₹1,000 (SIF-21 and SIF-96 today), everything else at ₹10. The first NAV
 * rather than today's because a ₹10 scheme could in principle compound past
 * 200 — its first print cannot have. The basis is carried so a page can say
 * which it is showing.
 */
export function faceValue(id: string): { value: number; basis: "sourced" | "inferred" } {
  const s = strategyById.get(id);
  const sourced = s ? schemeFacts(s.amfiSchemeCode).faceValue : null;
  if (sourced) return { value: sourced.value, basis: "sourced" };

  const first = navHistory(id)[0]?.nav;
  return { value: first !== undefined && first > 200 ? 1000 : 10, basis: "inferred" };
}

/**
 * When the scheme began.
 *
 * `allotment` is the sourced allotment date. Without one the best we hold is
 * the date of the first NAV AMFI published — usually the day after allotment,
 * but not a claim about it, so the basis travels with the date and the page
 * must say "since first published NAV" rather than "since inception". Null
 * only when we hold no NAV at all.
 */
export function inception(
  id: string,
): { date: string; basis: "allotment" | "first-nav" } | null {
  const s = strategyById.get(id);
  const allotted = s ? schemeFacts(s.amfiSchemeCode).allotmentDate : null;
  if (allotted) return { date: allotted.value, basis: "allotment" };

  const first = navHistory(id)[0];
  return first ? { date: first.date, basis: "first-nav" } : null;
}

/* ============================================================
   Documents
   ============================================================ */

type RawDocument = {
  kind: string;
  title: string;
  url: string;
  date: string;
  publisher: string;
  verified?: boolean;
};

const documentsFile = documentsRaw as {
  schemes: Record<string, RawDocument[]>;
  amcs: Record<string, RawDocument[]>;
};

/** Reading order on a scheme page: the governing documents first. */
const KIND_ORDER: DocumentKind[] = [
  "ISID",
  "SID",
  "KIM",
  "SAI",
  "factsheet",
  "portfolio",
  "addendum",
];

/**
 * The scheme's documents, governing documents first and newest first within
 * a kind. Only verified entries with an https URL — a link we have not opened
 * is not one we hand a reader.
 */
export function schemeDocuments(code: string): DocumentRef[] {
  const raw = documentsFile.schemes[code.toUpperCase()] ?? [];
  return raw
    .filter(
      (d) =>
        d.verified === true &&
        (KIND_ORDER as string[]).includes(d.kind) &&
        typeof d.url === "string" &&
        /^https:\/\//.test(d.url) &&
        isText(d.title),
    )
    .map((d) => ({
      kind: d.kind as DocumentKind,
      title: d.title,
      url: d.url,
      date: d.date,
      publisher: d.publisher,
    }))
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        b.date.localeCompare(a.date),
    );
}
