/**
 * The research loaders — AUM totals, charged TER, scheme facts, documents —
 * on a SYNTHETIC universe.
 *
 * The real research files are still empty seeds, so every relationship in
 * tests/raw-facts.test.ts holds vacuously today. Here the raw files are
 * mocked with a small, hand-computed universe that hits every branch the
 * loaders have: unverified and unsourced entries dropped, a value of the
 * wrong shape dropped, the total summed over the best-COVERED month rather
 * than the newest, a house total offered only when complete, the strategy
 * split summing to the industry figure, the latest TER winning, documents in
 * reading order — and the SifRow built on top of all of it.
 *
 *   AMC alpha: SIF-9101 (Equity L-S), SIF-9102 (Hybrid L-S)
 *   AMC beta:  SIF-9201 (Equity L-S), SIF-9202 (Equity Ex-Top 100 L-S)
 *
 *   verified AUM, ₹ Cr   2026-07   2026-08   2026-09
 *   SIF-9101                 100       120        —
 *   SIF-9102                  50        60        —   (a 2026-09 figure is unverified)
 *   SIF-9201                   —       300        —   (a 2026-07 figure cites no source)
 *   SIF-9202                   —         —       40
 *
 *   → industry: 2026-08 (3 of 4 schemes) = ₹480 Cr, not complete
 *   → alpha:    2026-07 and 2026-08 tie on coverage, the later wins: ₹180 Cr, complete
 *   → beta:     2026-08 and 2026-09 tie at 1 of 2, the later wins: ₹40 Cr, not complete
 */
import { describe, expect, it, vi } from "vitest";

const synthetic = vi.hoisted(() => {
  const series = (start: number): [string, number][] =>
    Array.from({ length: 5 }, (_, i) => [`2026-09-${String(10 + i).padStart(2, "0")}`, start + i * 0.01]);

  const scheme = (code: string, amcId: string, type: string, category: string) => ({
    id: `syn-${code.toLowerCase()}`,
    amcId,
    name: `Syn ${type} Fund - Regular Plan - Growth`,
    category,
    type,
    amfiSchemeCode: code,
    isin: null,
    nav: 10.04,
    navAsOf: "2026-09-14",
  });

  const source = (docType: string, url = "https://example.org/doc.pdf") => ({
    url,
    publisher: "Synthetic AMC",
    publisherKind: "AMC",
    docType,
    title: `${docType} document`,
    asOf: "2026-08-31",
    retrievedOn: "2026-09-15",
  });

  const aum = (month: string, aumCr: number, verified = true, src = "fs") => ({
    month,
    aumCr,
    src,
    locator: "p.2 'AUM'",
    verified,
  });

  const fact = (value: unknown, src = "isid", verified = true) => ({
    value,
    src,
    locator: "p.1",
    verified,
  });

  return {
    schemes: {
      source: "AMFI — https://portal.amfiindia.com/spages/SIF_NAVAll.txt",
      fetchedAt: "2026-09-14",
      navAsOf: "2026-09-14",
      schemes: [
        scheme("SIF-9101", "alpha", "Equity Long-Short", "equity"),
        scheme("SIF-9102", "alpha", "Hybrid Long-Short", "hybrid"),
        scheme("SIF-9201", "beta", "Equity Long-Short", "equity"),
        scheme("SIF-9202", "beta", "Equity Ex-Top 100 Long-Short", "equity"),
      ],
      amcs: [
        { id: "alpha", name: "Alpha Mutual Fund", sifName: "AlphaSIF" },
        { id: "beta", name: "Beta Mutual Fund", sifName: "BetaSIF" },
      ],
    },
    history: {
      series: {
        "SIF-9101": series(10),
        "SIF-9102": series(10),
        "SIF-9201": series(10),
        "SIF-9202": series(10),
      },
    },
    aum: {
      schemaVersion: 1,
      unit: "INR_CRORE",
      basis: "month-end",
      sources: { fs: source("factsheet") },
      schemes: {
        "SIF-9101": [aum("2026-07", 100), aum("2026-08", 120), aum("2026-8", 999), aum("2026-06", -5)],
        "SIF-9102": [aum("2026-07", 50), aum("2026-08", 60), aum("2026-09", 999, false)],
        "SIF-9201": [aum("2026-08", 300), aum("2026-07", 777, true, "nowhere")],
        "SIF-9202": [aum("2026-09", 40)],
      },
    },
    ter: {
      schemaVersion: 1,
      plan: "Regular",
      sources: { ter: source("ter-disclosure") },
      schemes: {
        "SIF-9101": [
          { asOf: "2026-08-01", terPct: 1.9, src: "ter", locator: "row 4", verified: true },
          { asOf: "2026-09-01", terPct: 1.8, src: "ter", locator: "row 4", verified: true },
          { asOf: "2026-09-15", terPct: 1.7, src: "ter", locator: "row 4", verified: false },
        ],
        "SIF-9102": [{ asOf: "2026-9-1", terPct: 1.5, src: "ter", locator: "row 5", verified: true }],
        "SIF-9201": [{ asOf: "2026-09-01", terPct: 1.6, src: "nowhere", locator: "row 6", verified: true }],
      },
    },
    facts: {
      schemaVersion: 1,
      sources: {
        isid: source("ISID"),
        insecure: source("ISID", "http://example.org/isid.pdf"),
        odd: source("brochure"),
      },
      schemes: {
        "SIF-9101": {
          allotmentDate: fact("2026-09-09"),
          faceValue: fact(10),
          fundManagers: fact([{ name: "A. Manager", since: "2026-09-09" }, { name: "B. Manager" }]),
          objective: fact("To generate long-term capital appreciation."),
          subscription: fact({ bucket: "daily", text: "Daily, on all business days" }),
          minAdditional: fact(10000),
          options: fact(["Growth", "IDCW"]),
          assetAllocation: fact([{ asset: "Equity", minPct: 80, maxPct: 100 }]),
        },
        "SIF-9102": {
          allotmentDate: fact("2026-02-31"),
          faceValue: fact("10"),
          fundManagers: fact([]),
          objective: fact("Unverified objective", "isid", false),
          subscription: fact({ bucket: "hourly", text: "Hourly" }),
          options: fact(["Growth"], "insecure"),
          minAdditional: fact(5000, "odd"),
          assetAllocation: fact([{ asset: "Equity", minPct: 90, maxPct: 10 }]),
        },
      },
    },
    documents: {
      schemaVersion: 1,
      schemes: {
        "SIF-9101": [
          { kind: "factsheet", title: "Factsheet Aug", url: "https://e.org/fs-aug.pdf", date: "2026-08-31", publisher: "Alpha", verified: true },
          { kind: "SID", title: "SID", url: "https://e.org/sid.pdf", date: "2025-01-01", publisher: "Alpha", verified: true },
          { kind: "factsheet", title: "Factsheet Jul", url: "https://e.org/fs-jul.pdf", date: "2026-07-31", publisher: "Alpha", verified: true },
          { kind: "KIM", title: "KIM", url: "https://e.org/kim.pdf", date: "2025-01-01", publisher: "Alpha", verified: false },
          { kind: "ISID", title: "ISID", url: "http://e.org/isid.pdf", date: "2025-01-01", publisher: "Alpha", verified: true },
          { kind: "brochure", title: "Brochure", url: "https://e.org/b.pdf", date: "2025-01-01", publisher: "Alpha", verified: true },
        ],
      },
      amcs: {},
    },
  };
});

vi.mock("@/lib/data/raw/schemes.json", () => ({ default: synthetic.schemes }));
vi.mock("@/lib/data/raw/nav-history.json", () => ({ default: synthetic.history }));
vi.mock("@/lib/data/raw/aum.json", () => ({ default: synthetic.aum }));
vi.mock("@/lib/data/raw/ter.json", () => ({ default: synthetic.ter }));
vi.mock("@/lib/data/raw/scheme-facts.json", () => ({ default: synthetic.facts }));
vi.mock("@/lib/data/raw/documents.json", () => ({ default: synthetic.documents }));

import {
  amcAum,
  aumByStrategy,
  buildSifRows,
  currentTer,
  industryAum,
  inception,
  schemeAum,
  schemeDocuments,
  schemeFacts,
  sifRow,
  stats,
  trailingReturn,
} from "@/lib/data";

describe("AUM", () => {
  it("a scheme's figure is its latest verified month, dated at month end", () => {
    expect(schemeAum("SIF-9101")).toMatchObject({ cr: 120, asOf: "2026-08-31" });
    expect(schemeAum("sif-9101")).toMatchObject({ cr: 120 }); // any case
    // The unverified September figure is not the latest — August is.
    expect(schemeAum("SIF-9102")).toMatchObject({ cr: 60, asOf: "2026-08-31" });
    expect(schemeAum("SIF-9202")).toMatchObject({ cr: 40, asOf: "2026-09-30" });
    expect(schemeAum("SIF-9101")!.source.docType).toBe("factsheet");
  });

  it("the industry total is summed over the best-covered month, not the newest", () => {
    expect(industryAum()).toEqual({
      cr: 480,
      asOf: "2026-08-31",
      counted: 3,
      total: 4,
      complete: false,
    });
  });

  it("a house total says how much of the house it counts", () => {
    expect(amcAum("alpha")).toEqual({
      cr: 180,
      asOf: "2026-08-31",
      counted: 2,
      total: 2,
      complete: true,
    });
    expect(amcAum("beta")).toEqual({
      cr: 40,
      asOf: "2026-09-30",
      counted: 1,
      total: 2,
      complete: false,
    });
    expect(amcAum("no-such-house")).toBeNull();
  });

  it("the strategy split is over the industry's month, and sums to it", () => {
    const split = aumByStrategy();
    expect(split).toEqual([
      { strategy: "equity-long-short", label: "Equity Long-Short", cr: 420, schemes: 2, asOf: "2026-08-31" },
      { strategy: "hybrid-long-short", label: "Hybrid Long-Short", cr: 60, schemes: 1, asOf: "2026-08-31" },
    ]);
    expect(split.reduce((n, s) => n + s.cr, 0)).toBe(industryAum()!.cr);
    expect(split.reduce((n, s) => n + s.schemes, 0)).toBe(industryAum()!.counted);
  });

  it("stats reports coverage and the month the total is dated", () => {
    expect(stats.aumCoverage).toEqual({ captured: 4, total: 4 });
    expect(stats.aumAsOf).toBe("2026-08-31");
  });
});

describe("charged TER", () => {
  it("is the latest VERIFIED dated figure", () => {
    expect(currentTer("SIF-9101")).toMatchObject({ pct: 1.8, asOf: "2026-09-01" });
  });

  it("drops a malformed date or an unresolvable source", () => {
    expect(currentTer("SIF-9102")).toBeNull();
    expect(currentTer("SIF-9201")).toBeNull();
  });
});

describe("scheme facts", () => {
  it("keeps verified, sourced, well-formed facts with their citation", () => {
    const f = schemeFacts("SIF-9101");
    expect(f.allotmentDate?.value).toBe("2026-09-09");
    expect(f.faceValue?.value).toBe(10);
    expect(f.fundManagers?.value.map((m) => m.name)).toEqual(["A. Manager", "B. Manager"]);
    expect(f.subscription?.value.bucket).toBe("daily");
    expect(f.options?.value).toEqual(["Growth", "IDCW"]);
    expect(f.allotmentDate?.source).toMatchObject({ id: "isid", docType: "ISID" });
  });

  it("drops the impossible date, the wrong shape, the empty list, the unverified and the unsourced", () => {
    const f = schemeFacts("SIF-9102");
    for (const value of Object.values(f)) expect(value).toBeNull();
  });

  it("an allotment date moves inception and SI onto the sourced basis", () => {
    expect(inception("syn-sif-9101")).toEqual({ date: "2026-09-09", basis: "allotment" });
    expect(inception("syn-sif-9102")).toEqual({ date: "2026-09-10", basis: "first-nav" });
    const si = trailingReturn("syn-sif-9101", "SI");
    expect(si.status === "ok" && si.basis).toBe("face-value");
    expect(si.status === "ok" && si.from).toEqual({ date: "2026-09-09", nav: 10 });
  });
});

describe("documents", () => {
  it("are verified https links of known kinds, governing documents first, newest first", () => {
    expect(schemeDocuments("SIF-9101").map((d) => d.title)).toEqual([
      "SID",
      "Factsheet Aug",
      "Factsheet Jul",
    ]);
    expect(schemeDocuments("SIF-9102")).toEqual([]);
  });
});

describe("SifRow over the research", () => {
  it("carries every researched value, and each absence with its reason", () => {
    const r = sifRow("SIF-9101")!;
    expect(r.aumCr).toEqual({ v: 120 });
    expect(r.aumAsOf).toBe("2026-08-31");
    expect(r.amcAumCr).toEqual({ v: 180 });
    expect(r.ter).toEqual({ v: 1.8 });
    expect(r.terAsOf).toBe("2026-09-01");
    expect(r.managers).toEqual(["A. Manager", "B. Manager"]);
    expect(r.subscriptionBucket).toBe("daily");
    expect(r.subscriptionText).toBe("Daily, on all business days");
    expect(r.minAdditional).toBe(10000);
    expect(r.options).toEqual(["Growth", "IDCW"]);
    expect(r.objective).toBe("To generate long-term capital appreciation.");
    expect(r.inception).toEqual({ date: "2026-09-09", basis: "allotment" });
    expect(r.disclosures).toMatchObject({ factsheet: true, sid: true, portfolio: false });
    expect(r.documents).toHaveLength(3);
  });

  it("offers a house total only where the house is fully counted", () => {
    expect(sifRow("SIF-9102")!.amcAumCr).toEqual({ v: 180 });
    expect(sifRow("SIF-9201")!.amcAumCr).toEqual({ absent: "not-captured" });
    expect(sifRow("SIF-9202")!.amcAumCr).toEqual({ absent: "not-captured" });
  });

  it("reads 'not captured' for what research has not reached", () => {
    const r = sifRow("SIF-9201")!;
    expect(r.ter).toEqual({ absent: "not-captured" });
    expect(r.terAsOf).toBeNull();
    expect(r.managers).toEqual([]);
    expect(r.options).toEqual([]);
    expect(r.objective).toBeNull();
    expect(buildSifRows()).toHaveLength(4);
  });
});
