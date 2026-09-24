/**
 * The hand-researched files — scheme-facts, aum, ter, documents, portfolio.
 *
 * The loaders in lib/data are forgiving on purpose: an unverified fact, a
 * dangling `src` or a malformed value quietly becomes "Not captured", so a bad
 * research merge can never take the build down. That makes THIS file the
 * strict half. Every entry must be verified, cite a source that resolves, and
 * key a scheme the site actually knows — so what the loader drops is caught
 * here, loudly, instead of silently vanishing from the page.
 *
 * Reads the raw JSON through tests/raw-source.ts; the loaders are only used
 * to check they agree with the file.
 */
import { describe, expect, it } from "vitest";

import {
  currentTer,
  schemeAum,
  schemeDocuments,
  schemeFacts,
  type SchemeFacts,
} from "@/lib/data";

import {
  rawAumFile,
  rawDisclosures,
  rawDocumentsFile,
  rawFactsFile,
  rawNfoEntries,
  rawPortfolioFile,
  rawSchemes,
  rawTerFile,
  seriesFor,
  type RawSourceRow,
} from "./raw-source";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const PUBLISHER_KINDS = ["AMC", "AMFI", "SEBI"];
const DOC_TYPES = [
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
];
const DOCUMENT_KINDS = ["SID", "KIM", "SAI", "ISID", "factsheet", "portfolio", "addendum"];
const FACT_FIELDS: (keyof SchemeFacts)[] = [
  "allotmentDate",
  "faceValue",
  "fundManagers",
  "objective",
  "subscription",
  "redemptionTerms",
  "minAdditional",
  "options",
  "assetAllocation",
];

/** A code the site knows: a live scheme, or the code an NFO will carry. */
const KNOWN_CODES = new Set([
  ...rawSchemes.map((s) => s.amfiSchemeCode),
  ...rawNfoEntries.map((n) => n.schemeCode).filter((c): c is string => typeof c === "string"),
]);

function expectSources(file: string, sources: Record<string, RawSourceRow>) {
  for (const [id, s] of Object.entries(sources)) {
    const where = `${file} sources.${id}`;
    expect(s.url, where).toMatch(/^https:\/\//);
    expect(PUBLISHER_KINDS, where).toContain(s.publisherKind);
    expect(DOC_TYPES, where).toContain(s.docType);
    expect(s.publisher.trim().length, where).toBeGreaterThan(0);
    expect(s.title.trim().length, where).toBeGreaterThan(0);
    expect(s.retrievedOn, where).toMatch(ISO_DATE);
    if (s.asOf !== undefined && s.asOf !== null) expect(s.asOf, where).toMatch(ISO_DATE);
  }
}

describe("every research file is a valid document", () => {
  it("carries its schema version and the shape the loaders expect", () => {
    for (const f of [rawFactsFile, rawAumFile, rawTerFile, rawDocumentsFile, rawPortfolioFile]) {
      expect(f.schemaVersion).toBe(1);
      expect(typeof f.schemes).toBe("object");
    }
    expect(rawAumFile.unit).toBe("INR_CRORE");
    expect(rawAumFile.basis).toBe("month-end");
    expect(rawTerFile.plan).toBe("Regular");
    expect(typeof rawDocumentsFile.amcs).toBe("object");
  });

  it("every `sources` entry is a usable citation", () => {
    expectSources("scheme-facts.json", rawFactsFile.sources);
    expectSources("aum.json", rawAumFile.sources);
    expectSources("ter.json", rawTerFile.sources);
    expectSources("portfolio.json", rawPortfolioFile.sources);
  });

  it("portfolio.json stays schema-only until comparable data exists", () => {
    expect(Object.keys(rawPortfolioFile.schemes)).toEqual([]);
  });
});

describe("scheme-facts.json", () => {
  const entries = Object.entries(rawFactsFile.schemes);

  it("keys only schemes the site knows", () => {
    for (const [code] of entries) expect(KNOWN_CODES.has(code), code).toBe(true);
  });

  it("every fact is verified, located, and cites a source in the file", () => {
    for (const [code, facts] of entries) {
      for (const [field, fact] of Object.entries(facts)) {
        const where = `${code}.${field}`;
        expect(FACT_FIELDS as string[], where).toContain(field);
        expect(fact.verified, where).toBe(true);
        expect(fact.src in rawFactsFile.sources, `${where} → ${fact.src}`).toBe(true);
        expect(fact.locator.trim().length, where).toBeGreaterThan(0);
      }
    }
  });

  it("the loader keeps every fact the file holds — none is dropped for its shape", () => {
    for (const [code, facts] of entries) {
      const loaded = schemeFacts(code);
      for (const field of Object.keys(facts) as (keyof SchemeFacts)[]) {
        expect(loaded[field], `${code}.${field} was dropped by lib/data/facts.ts`).not.toBeNull();
        expect(loaded[field]!.source.id).toBe(facts[field].src);
      }
    }
  });

  /* Two files, two readings of one document: disclosures.json's `dividend`
     prose and scheme-facts.json's `options` list. SIF-34 once carried both
     "Growth only (IDCW disabled)" and "Growth and IDCW available" on one page. */
  it("the dividend text never offers IDCW where the options list is Growth only", () => {
    const offersIdcw = (text: string) =>
      /\bIDCW\b/i.test(text) &&
      /\bavailable\b|\boffered\b/i.test(text) &&
      !/not applicable|disabled|not offering|not offered|no IDCW|growth option only|only the growth/i.test(text);
    for (const [code, facts] of entries) {
      const options = facts.options?.value;
      const dividend = rawDisclosures[code]?.dividend;
      if (!Array.isArray(options) || !dividend) continue;
      if (options.some((o) => /IDCW/i.test(String(o)))) continue;
      expect(offersIdcw(dividend), `${code}: options [${options.join(", ")}] vs dividend "${dividend}"`).toBe(
        false,
      );
    }
  });

  it("an allotment date is never after the scheme's first published NAV", () => {
    for (const s of rawSchemes) {
      const allotted = schemeFacts(s.amfiSchemeCode).allotmentDate;
      const first = seriesFor(s.amfiSchemeCode)[0]?.[0];
      if (!allotted || !first) continue;
      expect(allotted.value <= first, s.amfiSchemeCode).toBe(true);
    }
  });
});

describe("aum.json", () => {
  const entries = Object.entries(rawAumFile.schemes);

  it("keys only schemes the site knows, one figure per month", () => {
    for (const [code, rows] of entries) {
      expect(KNOWN_CODES.has(code), code).toBe(true);
      const months = rows.map((r) => r.month);
      expect(new Set(months).size, `${code} repeats a month`).toBe(months.length);
    }
  });

  it("every figure is verified, month-end, in crore, and cites a source in the file", () => {
    for (const [code, rows] of entries) {
      for (const r of rows) {
        const where = `${code} ${r.month}`;
        expect(r.month, where).toMatch(MONTH);
        expect(Number.isFinite(r.aumCr) && r.aumCr >= 0, where).toBe(true);
        expect(r.verified, where).toBe(true);
        expect(r.src in rawAumFile.sources, `${where} → ${r.src}`).toBe(true);
        expect(r.locator.trim().length, where).toBeGreaterThan(0);
      }
    }
  });

  it("schemeAum reads the latest month on file", () => {
    for (const [code, rows] of entries) {
      const latest = [...rows].sort((a, b) => b.month.localeCompare(a.month))[0];
      const aum = schemeAum(code);
      if (!latest) continue;
      expect(aum?.cr).toBe(latest.aumCr);
      expect(aum?.asOf.slice(0, 7)).toBe(latest.month);
    }
  });
});

describe("ter.json", () => {
  const entries = Object.entries(rawTerFile.schemes);

  it("every figure is verified, dated, a percentage, and cites a source in the file", () => {
    for (const [code, rows] of entries) {
      expect(KNOWN_CODES.has(code), code).toBe(true);
      for (const r of rows) {
        const where = `${code} ${r.asOf}`;
        expect(r.asOf, where).toMatch(ISO_DATE);
        /* A sanity bound against unit slips (basis points or 225 for 2.25),
           not a policy limit. Since April 2026 the charged TER is the base
           expense ratio PLUS brokerage, transaction cost and statutory levies,
           and a new scheme's first month can carry ~2.5% of levies alone —
           SIF-157 is 5.28% on 22 Sep 2026 per SBI's TER file. */
        expect(r.terPct >= 0 && r.terPct < 10, where).toBe(true);
        expect(r.verified, where).toBe(true);
        expect(r.src in rawTerFile.sources, `${where} → ${r.src}`).toBe(true);
      }
    }
  });

  it("currentTer is the latest dated figure", () => {
    for (const [code, rows] of entries) {
      const latest = [...rows].sort((a, b) => b.asOf.localeCompare(a.asOf))[0];
      if (!latest) continue;
      expect(currentTer(code)).toMatchObject({ pct: latest.terPct, asOf: latest.asOf });
    }
  });
});

describe("documents.json", () => {
  it("every document is verified, of a known kind, and linked over https", () => {
    for (const [code, docs] of Object.entries(rawDocumentsFile.schemes)) {
      expect(KNOWN_CODES.has(code), code).toBe(true);
      for (const d of docs) {
        const where = `${code} ${d.kind} ${d.title}`;
        expect(DOCUMENT_KINDS, where).toContain(d.kind);
        expect(d.url, where).toMatch(/^https:\/\//);
        expect(d.date, where).toMatch(ISO_DATE);
        expect(d.verified, where).toBe(true);
        expect(d.title.trim().length, where).toBeGreaterThan(0);
        expect(d.publisher.trim().length, where).toBeGreaterThan(0);
      }
      expect(schemeDocuments(code)).toHaveLength(docs.length);
    }
  });
});

describe("the loaders degrade, never throw", () => {
  it("an unknown or unresearched code reads as not captured", () => {
    for (const code of ["SIF-999999", "not-a-code", ""]) {
      const facts = schemeFacts(code);
      for (const field of FACT_FIELDS) expect(facts[field]).toBeNull();
      expect(schemeAum(code)).toBeNull();
      expect(currentTer(code)).toBeNull();
      expect(schemeDocuments(code)).toEqual([]);
    }
  });

  it("every scheme resolves, whether or not anything was researched for it", () => {
    for (const s of rawSchemes) {
      expect(() => schemeFacts(s.amfiSchemeCode)).not.toThrow();
      expect(() => schemeAum(s.amfiSchemeCode)).not.toThrow();
      expect(() => currentTer(s.amfiSchemeCode)).not.toThrow();
      expect(() => schemeDocuments(s.amfiSchemeCode)).not.toThrow();
    }
  });
});
