/**
 * `stats.*` is the site's single source of every number it prints
 * (DESIGN_CONTRACT.md: "every number traces to @/lib/data"). A wrong count here
 * is not a rendering bug — it is the page stating a false fact about the
 * market.
 *
 * Each assertion recomputes its figure from `lib/data/raw/*.json` rather than
 * re-reading the expression under test, so a broken derivation shows up as a
 * disagreement between the two.
 */
import { describe, expect, it } from "vitest";

import {
  amcs,
  mandates,
  navHistory,
  navLastUpdated,
  stats,
  strategies,
  strategiesByCategory,
} from "@/lib/data";

import {
  rawAmcs,
  rawDisclosures,
  rawSchemes,
  rawSchemesFile,
  rawHasAllHeadlineFields,
  seriesFor,
} from "./raw-source";

describe("stats — identity counts", () => {
  it("strategyCount is the number of schemes in schemes.json", () => {
    expect(stats.strategyCount).toBe(rawSchemes.length);
    expect(strategies).toHaveLength(rawSchemes.length);
  });

  it("amcCount is the number of AMCs in schemes.json", () => {
    expect(stats.amcCount).toBe(rawAmcs.length);
    expect(amcs).toHaveLength(rawAmcs.length);
  });

  it("scheme ids and AMC ids are unique", () => {
    expect(new Set(rawSchemes.map((s) => s.id)).size).toBe(rawSchemes.length);
    expect(new Set(rawAmcs.map((a) => a.id)).size).toBe(rawAmcs.length);
  });

  it("every scheme's amcId resolves to a known AMC", () => {
    const known = new Set(rawAmcs.map((a) => a.id));
    for (const s of rawSchemes) expect(known.has(s.amcId)).toBe(true);
  });
});

describe("stats — category split", () => {
  const countOf = (category: string) =>
    rawSchemes.filter((s) => s.category === category).length;

  it("equityCount matches schemes.json", () => {
    expect(stats.equityCount).toBe(countOf("equity"));
    expect(strategiesByCategory.equity).toHaveLength(countOf("equity"));
  });

  it("hybridCount matches schemes.json", () => {
    expect(stats.hybridCount).toBe(countOf("hybrid"));
    expect(strategiesByCategory.hybrid).toHaveLength(countOf("hybrid"));
  });

  it("debtCount matches schemes.json", () => {
    expect(stats.debtCount).toBe(countOf("debt"));
    expect(strategiesByCategory.debt).toHaveLength(countOf("debt"));
  });

  it("the three buckets account for every scheme — no category falls through", () => {
    // A scheme with a category outside the union would silently vanish from all
    // three lists while still counting in strategyCount.
    expect(stats.equityCount + stats.hybridCount + stats.debtCount).toBe(
      stats.strategyCount,
    );
    for (const s of rawSchemes) {
      expect(["equity", "hybrid", "debt"]).toContain(s.category);
    }
  });
});

describe("stats — disclosure counts", () => {
  it("disclosedCount is the number of schemes with an entry in disclosures.json", () => {
    const expected = rawSchemes.filter(
      (s) => s.amfiSchemeCode in rawDisclosures,
    ).length;
    expect(stats.disclosedCount).toBe(expected);
  });

  it("fullyDisclosedCount recomputed from disclosures.json", () => {
    const expected = rawSchemes.filter((s) =>
      rawHasAllHeadlineFields(s.amfiSchemeCode),
    ).length;
    expect(stats.fullyDisclosedCount).toBe(expected);
  });

  it("disclosuresVerifiedCount is the number of entries flagged verified", () => {
    const expected = rawSchemes.filter(
      (s) => rawDisclosures[s.amfiSchemeCode]?.verified === true,
    ).length;
    expect(stats.disclosuresVerifiedCount).toBe(expected);
  });

  it("fullyDisclosedCount can never exceed disclosedCount", () => {
    expect(stats.fullyDisclosedCount).toBeLessThanOrEqual(stats.disclosedCount);
  });
});

describe("stats — NAV counts", () => {
  it("liveNavCount is the number of schemes carrying a finite NAV", () => {
    const expected = rawSchemes.filter((s) => Number.isFinite(s.nav)).length;
    expect(stats.liveNavCount).toBe(expected);
  });

  it("navObservations is the total number of published NAVs held", () => {
    const expected = rawSchemes.reduce(
      (n, s) => n + seriesFor(s.amfiSchemeCode).length,
      0,
    );
    expect(stats.navObservations).toBe(expected);
  });

  it("chartableCount is the number of schemes with two or more points", () => {
    const expected = rawSchemes.filter(
      (s) => seriesFor(s.amfiSchemeCode).length > 1,
    ).length;
    expect(stats.chartableCount).toBe(expected);
    // and the exported accessor agrees with the raw file, scheme by scheme
    for (const s of rawSchemes) {
      expect(navHistory(s.id)).toHaveLength(seriesFor(s.amfiSchemeCode).length);
    }
  });

  it("navHistoryFrom is the earliest date across every non-empty series", () => {
    const expected = rawSchemes
      .map((s) => seriesFor(s.amfiSchemeCode))
      .filter((points) => points.length > 0)
      .map((points) => points[0][0])
      .sort()[0];
    expect(stats.navHistoryFrom).toBe(expected);
  });
});

describe("stats — mandates", () => {
  it("mandateCount is the number of distinct scheme types", () => {
    const expected = new Set(rawSchemes.map((s) => s.type)).size;
    expect(stats.mandateCount).toBe(expected);
    expect(mandates).toHaveLength(expected);
  });

  it("mandate counts sum to the scheme count and are ordered commonest first", () => {
    expect(mandates.reduce((n, m) => n + m.count, 0)).toBe(rawSchemes.length);
    for (let i = 1; i < mandates.length; i++) {
      expect(mandates[i - 1].count).toBeGreaterThanOrEqual(mandates[i].count);
    }
  });
});

describe("stats — regulatory constants", () => {
  it("minInvestment is SEBI's 10 lakh SIF floor and no disclosed minimum sits below it", () => {
    expect(stats.minInvestment).toBe(1_000_000);
    for (const entry of Object.values(rawDisclosures)) {
      if (entry.minInvestment != null) {
        expect(entry.minInvestment).toBeGreaterThanOrEqual(stats.minInvestment);
      }
    }
  });

  it("maxUnhedgedShortPct is 25", () => {
    expect(stats.maxUnhedgedShortPct).toBe(25);
  });
});

describe("navLastUpdated", () => {
  it("is the file-level navAsOf, and no scheme is dated after it", () => {
    expect(navLastUpdated).toBe(rawSchemesFile.navAsOf);
    for (const s of rawSchemes) {
      expect(s.navAsOf <= rawSchemesFile.navAsOf).toBe(true);
    }
  });
});
