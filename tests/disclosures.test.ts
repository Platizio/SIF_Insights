/**
 * `hasFullDisclosures` and the count derived from it.
 *
 * The site's summary copy names four fields — "risk band, expense, exit load
 * and minimum". `disclosuresCaptured` only says a document was read; a scheme
 * can have an entry and still leave one of those four null. Counting the
 * former under a sentence that promises the latter overstates coverage, which
 * is the bug this pair exists to prevent.
 *
 * These tests deliberately do NOT require the gap to exist. Four schemes were
 * each missing one headline field until those fields were read out of the
 * AMFI-hosted ISIDs; pinning "there are exactly four" made closing the gap
 * fail the suite, which is backwards — filling a hole is the goal, not a
 * regression. What must hold either way is the RELATIONSHIP: a null headline
 * field means `hasFullDisclosures` is false and the scheme is outside
 * `fullyDisclosedCount`. That is asserted over whatever the data holds today,
 * and over a synthetic hole so the false branch is exercised even at full
 * coverage.
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
    for (const raw of partiallyDisclosed) {
      const s = strategies.find((x) => x.id === raw.id)!;
      expect(s.disclosuresCaptured).toBe(true); // it HAS an entry …
      expect(hasFullDisclosures(s)).toBe(false); // … but not the full set
    }
  });

  it("every partially-disclosed scheme is genuinely missing a headline field", () => {
    // Guards the reverse direction: nothing lands in `partiallyDisclosed`
    // unless a headline field really is null in disclosures.json. Vacuous at
    // full coverage, which is the point — it must not fail when the gap closes.
    for (const raw of partiallyDisclosed) {
      const entry = rawDisclosures[raw.amfiSchemeCode];
      const missing = HEADLINE_FIELDS.filter(
        (field) => (entry[field] ?? null) === null,
      );
      expect(missing.length).toBeGreaterThan(0);
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

  it("never exceeds strategyCount, and falls below it exactly when a hole exists", () => {
    expect(stats.fullyDisclosedCount).toBeLessThanOrEqual(stats.strategyCount);
    expect(stats.fullyDisclosedCount < stats.strategyCount).toBe(
      partiallyDisclosed.length > 0 ||
        stats.disclosedCount < stats.strategyCount,
    );
  });
});
