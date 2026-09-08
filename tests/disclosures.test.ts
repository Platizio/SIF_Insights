/**
 * `hasFullDisclosures` and the count derived from it.
 *
 * The site's summary copy names four fields — "risk band, expense, exit load
 * and minimum". `disclosuresCaptured` only says a document was read; four
 * schemes have an entry and still leave one of those four null. Counting the
 * former under a sentence that promises the latter overstates coverage, which
 * is the bug this pair exists to prevent.
 */
import { describe, expect, it } from "vitest";

import { hasFullDisclosures, stats, strategies } from "@/lib/data";

import { HEADLINE_FIELDS, rawDisclosures, rawSchemes } from "./raw-source";

/** Recomputed from disclosures.json, field by field. */
const partiallyDisclosed = rawSchemes.filter((s) => {
  const entry = rawDisclosures[s.amfiSchemeCode];
  if (!entry) return false;
  return HEADLINE_FIELDS.some((field) => (entry[field] ?? null) === null);
});

describe("hasFullDisclosures", () => {
  it("is false for every scheme missing one of the four headline fields", () => {
    expect(partiallyDisclosed.length).toBeGreaterThan(0);
    for (const raw of partiallyDisclosed) {
      const s = strategies.find((x) => x.id === raw.id)!;
      expect(s.disclosuresCaptured).toBe(true); // it HAS an entry …
      expect(hasFullDisclosures(s)).toBe(false); // … but not the full set
    }
  });

  it("the four known partial schemes are each missing exactly one field", () => {
    // Documented in the audit: four schemes, one hole each. If this changes the
    // summary copy's coverage claim needs re-checking, so pin it.
    expect(partiallyDisclosed).toHaveLength(4);
    for (const raw of partiallyDisclosed) {
      const entry = rawDisclosures[raw.amfiSchemeCode];
      const missing = HEADLINE_FIELDS.filter(
        (field) => (entry[field] ?? null) === null,
      );
      expect(missing).toHaveLength(1);
    }
  });

  it("is true exactly when all four fields are non-null", () => {
    for (const s of strategies) {
      const expected = HEADLINE_FIELDS.every((field) => s[field] !== null);
      expect(hasFullDisclosures(s)).toBe(expected);
    }
  });

  it("is false for a scheme with no researched entry at all", () => {
    const none = strategies.find((s) => !s.disclosuresCaptured);
    if (none) expect(hasFullDisclosures(none)).toBe(false);

    // and synthetically, so the assertion holds even when every scheme is captured
    const hollow = { ...strategies[0], riskBand: null };
    expect(hasFullDisclosures(hollow)).toBe(false);
  });
});

describe("stats.fullyDisclosedCount", () => {
  it("equals the number of schemes passing hasFullDisclosures", () => {
    expect(stats.fullyDisclosedCount).toBe(
      strategies.filter(hasFullDisclosures).length,
    );
  });

  it("equals disclosedCount minus the partially-disclosed schemes", () => {
    expect(stats.fullyDisclosedCount).toBe(
      stats.disclosedCount - partiallyDisclosed.length,
    );
  });

  it("is strictly below strategyCount while any scheme has a hole", () => {
    expect(stats.fullyDisclosedCount).toBeLessThan(stats.strategyCount);
  });
});
