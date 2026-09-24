/**
 * The taxonomy: SEBI's seven strategies and the benchmark names.
 *
 * Every mandate string in schemes.json and every benchmark string in
 * disclosures.json must land on a canonical entry — an unmapped mandate would
 * drop a scheme out of every strategy filter, and an unmapped benchmark would
 * show up in the Screener as a one-off "index" nobody else tracks. The
 * spellings are read from the raw files, so a new ISID wording fails here
 * rather than slipping into the filters unrecognised.
 */
import { describe, expect, it } from "vitest";

import {
  SEBI_STRATEGIES,
  normaliseBenchmark,
  stats,
  strategyLabel,
  strategySlug,
} from "@/lib/data";
import { STRATEGIES } from "@/lib/screener/fields";

import { rawDisclosures, rawSchemes } from "./raw-source";

const rawTypes = [...new Set(rawSchemes.map((s) => s.type))];
const rawBenchmarks = [
  ...new Set(
    Object.values(rawDisclosures)
      .map((d) => d.benchmark ?? null)
      .filter((b): b is string => b !== null),
  ),
];

describe("SEBI_STRATEGIES", () => {
  it("lists SEBI's seven strategies once each, three categories deep", () => {
    expect(SEBI_STRATEGIES).toHaveLength(7);
    expect(new Set(SEBI_STRATEGIES.map((s) => s.slug)).size).toBe(7);
    expect(new Set(SEBI_STRATEGIES.map((s) => s.label)).size).toBe(7);
    expect(new Set(SEBI_STRATEGIES.map((s) => s.category))).toEqual(
      new Set(["equity", "hybrid", "debt"]),
    );
  });

  it("each slug is its label, slugified — so strategySlug(label) round-trips", () => {
    for (const s of SEBI_STRATEGIES) {
      expect(strategySlug(s.label)).toBe(s.slug);
      expect(strategyLabel(s.slug)).toBe(s.label);
    }
  });

  it("the client-side copy in lib/screener/fields.ts agrees entry for entry", () => {
    expect(Object.keys(STRATEGIES).sort()).toEqual(SEBI_STRATEGIES.map((s) => s.slug).sort());
    for (const s of SEBI_STRATEGIES) {
      expect(STRATEGIES[s.slug]).toEqual({ label: s.label, category: s.category });
    }
  });
});

describe("strategySlug", () => {
  it("maps every mandate string in schemes.json", () => {
    expect(rawTypes.length).toBeGreaterThan(0);
    for (const type of rawTypes) expect(strategySlug(type), type).not.toBeNull();
  });

  it("maps each scheme into a strategy of its own category", () => {
    for (const s of rawSchemes) {
      const slug = strategySlug(s.type)!;
      const strategy = SEBI_STRATEGIES.find((x) => x.slug === slug)!;
      expect(strategy.category, s.amfiSchemeCode).toBe(s.category);
    }
  });

  it("tolerates the feed's spacing and case, and nothing more", () => {
    expect(strategySlug("Equity Ex- Top 100 Long - Short")).toBe("equity-ex-top-100-long-short");
    expect(strategySlug("HYBRID LONG-SHORT")).toBe("hybrid-long-short");
    expect(strategySlug("Hybrid  Long Short")).toBe("hybrid-long-short");
    // An unknown mandate is null — never the nearest strategy.
    expect(strategySlug("Equity Market Neutral")).toBeNull();
    expect(strategySlug("")).toBeNull();
  });

  it("stats.strategyTypeCount is the number of distinct strategies the schemes run", () => {
    expect(stats.strategyTypeCount).toBe(new Set(rawTypes.map((t) => strategySlug(t))).size);
    expect(stats.strategyTypeCount).toBeLessThanOrEqual(SEBI_STRATEGIES.length);
  });
});

describe("normaliseBenchmark", () => {
  it("recognises every benchmark spelling in disclosures.json", () => {
    expect(rawBenchmarks.length).toBeGreaterThan(0);
    for (const text of rawBenchmarks) {
      const b = normaliseBenchmark(text);
      expect(b, text).not.toBeNull();
      // `other-` is the fallback for a spelling the index list does not know.
      expect(b!.id.startsWith("other-"), `unrecognised benchmark: ${text}`).toBe(false);
      expect(b!.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("collapses the spellings: fewer canonical indices than raw strings", () => {
    const ids = new Set(rawBenchmarks.map((t) => normaliseBenchmark(t)!.id));
    expect(ids.size).toBeLessThan(rawBenchmarks.length);
  });

  it("one id always carries one label", () => {
    const labels = new Map<string, Set<string>>();
    for (const t of rawBenchmarks) {
      const b = normaliseBenchmark(t)!;
      labels.set(b.id, (labels.get(b.id) ?? new Set()).add(b.label));
    }
    for (const [id, set] of labels) expect(set.size, id).toBe(1);
  });

  it("folds case, 'Total Return Index' and '(TRI)' into one TRI id", () => {
    const ids = [
      "Nifty 500 TRI",
      "NIFTY 500 Total Return Index (TRI)",
      "Nifty 500 Total Return Index (TRI)",
      "nifty 500 total return index",
    ].map((t) => normaliseBenchmark(t)!.id);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe("nifty-500-tri");
  });

  it("never folds a price index into its total-return variant", () => {
    expect(normaliseBenchmark("Nifty 500")!.id).not.toBe(normaliseBenchmark("Nifty 500 TRI")!.id);
    expect(normaliseBenchmark("Nifty 50")!.id).not.toBe(normaliseBenchmark("Nifty 50 TRI")!.id);
  });

  it("keeps Nifty 50, Nifty 200 and Nifty 500 apart, and the hybrid composite apart from Nifty 50", () => {
    const ids = [
      "Nifty 50 TRI",
      "Nifty 200 TRI",
      "Nifty 500 TRI",
      "NIFTY 50 Hybrid Composite Debt 50:50 Index",
    ].map((t) => normaliseBenchmark(t)!.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("strips the ISIDs' Tier I / Tier II scaffolding", () => {
    const plain = normaliseBenchmark("NIFTY 50 Hybrid Composite Debt 50:50 Index")!;
    for (const t of [
      "Tier I Benchmark: NIFTY 50 Hybrid Composite Debt 50:50 Index (Tier II: Not Applicable)",
      "NIFTY 50 Hybrid Composite Debt 50:50 Index (Tier 1)",
    ]) {
      expect(normaliseBenchmark(t)).toEqual(plain);
    }
    expect(normaliseBenchmark("CRISIL Hybrid 85+15 Conservative Index (Tier 1; Tier 2: NA)")!.label).not.toMatch(
      /tier/i,
    );
  });

  it("a weighted blend is its own benchmark, in its own words", () => {
    const text =
      "25% BSE SENSEX TRI + 60% CRISIL Short Term Bond Fund Index + 15% iCOMDEX Composite Index";
    const b = normaliseBenchmark(text)!;
    expect(b.id.startsWith("blend-")).toBe(true);
    expect(b.label).toBe(text);
    // Not folded into the index it happens to mention.
    expect(b.id).not.toBe(normaliseBenchmark("BSE SENSEX TRI")!.id);
  });

  it("an unknown index keeps its own words rather than being dropped or guessed", () => {
    const b = normaliseBenchmark("MSCI India Index")!;
    expect(b.id.startsWith("other-")).toBe(true);
    expect(b.label).toBe("MSCI India Index");
  });

  it("null and blank in, null out", () => {
    expect(normaliseBenchmark(null)).toBeNull();
    expect(normaliseBenchmark("")).toBeNull();
    expect(normaliseBenchmark("   ")).toBeNull();
  });
});
