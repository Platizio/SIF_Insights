/**
 * The returns engine on SYNTHETIC series, built to hit the edges the real
 * data happens not to: a stale start point either side of the 7-day rule, a
 * month offset that lands on a day the target month lacks, a tied peak, a
 * span past a year, and face-value SI from a sourced allotment date.
 *
 * The real series are daily with no gap over five days and no repeated high,
 * so mutating the gap rule or the peak tie-break in lib/data/returns.ts
 * passes tests/returns.test.ts untouched. These cases are what fail instead.
 *
 * The raw files are mocked, so lib/data AND the reference implementation both
 * read the synthetic data — every case is checked against hand-computed
 * values and against the reference.
 */
import { describe, expect, it, vi } from "vitest";

const synthetic = vi.hoisted(() => {
  const DAY = 86_400_000;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const daily = (from: string, to: string, nav: (i: number) => number) => {
    const out: [string, number][] = [];
    for (let t = at(from), i = 0; t <= at(to); t += DAY, i++) out.push([iso(t), nav(i)]);
    return out;
  };

  // Two years at exactly 10% a year, compounding daily.
  const long = daily("2024-01-01", "2025-12-31", (i) => 10 * Math.pow(1.1, i / 365));
  // A ten-day hole in January.
  const gap = [
    ...daily("2026-01-01", "2026-01-20", (i) => 10 + i * 0.01),
    ...daily("2026-02-01", "2026-03-01", (i) => 10.5 + i * 0.01),
  ];
  // A 3M target of 28 Feb from 31 May: clamping picks 27 Feb, overflow would pick 2 Mar.
  const clamp: [string, number][] = [
    ["2026-02-27", 10],
    ["2026-03-02", 10.2],
    ["2026-04-30", 10.4],
    ["2026-05-29", 10.5],
    ["2026-05-31", 11],
  ];
  // A high of 12 reached twice (days 1 and 3) before the fall to 9.
  const dd = daily("2026-01-01", "2026-05-31", (i) =>
    [10, 12, 11, 12, 9][i] ?? 9 + (i - 4) * 0.01,
  );
  const young = daily("2026-03-02", "2026-06-30", (i) => 10.05 + i * 0.001);
  const big = daily("2026-03-02", "2026-06-30", (i) => 998 + i * 0.1);

  const scheme = (id: string, code: string, series: [string, number][]) => ({
    id,
    amcId: "syn",
    name: `${id} Fund - Regular Plan - Growth`,
    category: "equity",
    type: "Equity Long-Short",
    amfiSchemeCode: code,
    isin: null,
    nav: series[series.length - 1][1],
    navAsOf: series[series.length - 1][0],
  });

  const rows = [
    scheme("syn-long", "SIF-9001", long),
    scheme("syn-gap", "SIF-9002", gap),
    scheme("syn-clamp", "SIF-9003", clamp),
    scheme("syn-dd", "SIF-9004", dd),
    scheme("syn-fv", "SIF-9005", young),
    scheme("syn-unverified", "SIF-9006", young),
    scheme("syn-badsrc", "SIF-9007", young),
    scheme("syn-big", "SIF-9008", big),
  ];

  const src = "isid-syn";
  const fact = (value: unknown, verified = true, s = src) => ({
    value,
    src: s,
    locator: "p.1",
    verified,
  });

  return {
    schemes: {
      source: "AMFI — https://portal.amfiindia.com/spages/SIF_NAVAll.txt",
      fetchedAt: "2026-06-30",
      navAsOf: "2026-06-30",
      schemes: rows,
      amcs: [{ id: "syn", name: "Synthetic Mutual Fund", sifName: "SynSIF" }],
    },
    history: {
      series: {
        "SIF-9001": long,
        "SIF-9002": gap,
        "SIF-9003": clamp,
        "SIF-9004": dd,
        "SIF-9005": young,
        "SIF-9006": young,
        "SIF-9007": young,
        "SIF-9008": big,
      },
    },
    facts: {
      schemaVersion: 1,
      sources: {
        [src]: {
          url: "https://example.org/isid.pdf",
          publisher: "Synthetic AMC",
          publisherKind: "AMC",
          docType: "ISID",
          title: "ISID",
          asOf: "2026-02-01",
          retrievedOn: "2026-06-30",
        },
      },
      schemes: {
        "SIF-9005": { allotmentDate: fact("2026-02-27"), faceValue: fact(10) },
        "SIF-9006": { allotmentDate: fact("2026-02-27", false), faceValue: fact(10) },
        "SIF-9007": {
          allotmentDate: fact("2026-02-27", true, "nowhere"),
          faceValue: fact(10, true, "nowhere"),
        },
      },
    },
  };
});

vi.mock("@/lib/data/raw/schemes.json", () => ({ default: synthetic.schemes }));
vi.mock("@/lib/data/raw/nav-history.json", () => ({ default: synthetic.history }));
vi.mock("@/lib/data/raw/scheme-facts.json", () => ({ default: synthetic.facts }));

import {
  PERIODS,
  faceValue,
  inception,
  maxDrawdown,
  monthlyReturns,
  schemeFacts,
  trailingReturn,
  volatility,
} from "@/lib/data";

import {
  refMaxDrawdown,
  refMonthlyReturns,
  refTrailingReturn,
  refVolatility,
} from "./reference/returns";

const ok = (id: string, p: (typeof PERIODS)[number], asOf?: string) => {
  const r = trailingReturn(id, p, { asOf });
  if (r.status !== "ok") throw new Error(`${id} ${p} @${asOf}: ${r.status}`);
  return r;
};

describe("synthetic edges — hand-computed", () => {
  it("annualises from a year: 10% a year reads as 10% CAGR over 1Y and SI", () => {
    const y1 = ok("syn-long", "1Y");
    expect(y1.annualised).toBe(true);
    expect(y1.pct).toBeCloseTo(10, 6);
    const si = ok("syn-long", "SI");
    expect(si.pct).toBeCloseTo(10, 6);
    expect(si.basis).toBe("nav");
    // Six months is absolute, not annualised.
    const m6 = ok("syn-long", "6M");
    expect(m6.annualised).toBe(false);
  });

  it("a series that starts after the target is insufficient, naming the target", () => {
    expect(trailingReturn("syn-long", "2Y")).toEqual({
      status: "insufficient-history",
      needsFrom: "2023-12-31",
    });
  });

  it("a start point more than 7 days before the target is stale; 7 or fewer is not", () => {
    // Target 28 Jan; last print 20 Jan — 8 days.
    expect(trailingReturn("syn-gap", "1M", { asOf: "2026-02-28" })).toEqual({
      status: "insufficient-history",
      needsFrom: "2026-01-28",
    });
    // Target 27 Jan; 20 Jan is exactly 7 days — still allowed.
    expect(ok("syn-gap", "1M", "2026-02-27").from.date).toBe("2026-01-20");
    // Target 26 Jan; 6 days.
    expect(ok("syn-gap", "1M", "2026-02-26").from.date).toBe("2026-01-20");
  });

  it("clamps a month offset to the target month's end rather than overflowing", () => {
    const m3 = ok("syn-clamp", "3M");
    expect(m3.from.date).toBe("2026-02-27");
    expect(m3.to.date).toBe("2026-05-31");
    expect(m3.pct).toBeCloseTo(10, 10);
  });

  it("takes the EARLIEST date at a repeated high as the drawdown's peak", () => {
    const d = maxDrawdown("syn-dd");
    expect(d).not.toBeNull();
    expect(d!.pct).toBeCloseTo(-25, 10);
    expect(d!.peak.date).toBe("2026-01-02");
    expect(d!.trough.date).toBe("2026-01-05");
  });

  it("measures SI from face value at a SOURCED, VERIFIED allotment date", () => {
    const si = ok("syn-fv", "SI");
    expect(si.basis).toBe("face-value");
    expect(si.from).toEqual({ date: "2026-02-27", nav: 10 });
    expect(inception("syn-fv")).toEqual({ date: "2026-02-27", basis: "allotment" });
    expect(faceValue("syn-fv")).toEqual({ value: 10, basis: "sourced" });
  });

  it("ignores an unverified or unsourced allotment date", () => {
    for (const id of ["syn-unverified", "syn-badsrc"]) {
      const si = ok(id, "SI");
      expect(si.basis).toBe("nav");
      expect(si.from.date).toBe("2026-03-02");
      expect(inception(id)).toEqual({ date: "2026-03-02", basis: "first-nav" });
    }
    expect(schemeFacts("SIF-9006").allotmentDate).toBeNull();
    expect(schemeFacts("SIF-9006").faceValue).not.toBeNull(); // the verified one survives
    expect(schemeFacts("SIF-9007").allotmentDate).toBeNull();
    expect(schemeFacts("SIF-9007").faceValue).toBeNull();
  });

  it("infers a ₹1,000 face value from a first NAV above 200, and ₹10 otherwise", () => {
    expect(faceValue("syn-big")).toEqual({ value: 1000, basis: "inferred" });
    // Its face-value fact names a source that does not exist, so it is inferred.
    expect(faceValue("syn-badsrc")).toEqual({ value: 10, basis: "inferred" });
  });

  it("measures age for the withheld rule from the allotment date when sourced", () => {
    // Allotted 27 Feb, last NAV 30 Jun: 123 days old.
    expect(trailingReturn("syn-fv", "1M", { minAgeDays: 124 }).status).toBe("withheld");
    expect(trailingReturn("syn-fv", "1M", { minAgeDays: 123 }).status).toBe("ok");
  });

  it("monthly returns cover every completed month after launch, and only those", () => {
    const months = monthlyReturns("syn-long").map((m) => m.month);
    expect(months[0]).toBe("2024-02");
    expect(months.at(-1)).toBe("2025-12");
    expect(months).toHaveLength(23);
  });
});

describe("synthetic edges — lib agrees with the reference", () => {
  const codes: [string, string][] = synthetic.schemes.schemes.map((s) => [s.id, s.amfiSchemeCode]);
  const asOfs = [undefined, "2026-02-26", "2026-02-27", "2026-02-28", "2026-05-31", "2025-06-30"];

  it.each(codes)("%s", (id, code) => {
    for (const asOf of asOfs) {
      for (const p of PERIODS) {
        const a = trailingReturn(id, p, { asOf });
        const b = refTrailingReturn(code, p, { asOf });
        expect(a.status).toBe(b.status);
        if (a.status === "ok" && b.status === "ok") {
          expect(a.pct).toBeCloseTo(b.pct, 9);
          expect(a.from).toEqual(b.from);
          expect(a.basis).toBe(b.basis);
        }
      }
      const v = volatility(id, { asOf });
      const rv = refVolatility(code, asOf);
      expect(v === null).toBe(rv === null);
      if (v && rv) expect(v.pct).toBeCloseTo(rv.pct, 9);
      const d = maxDrawdown(id, { asOf });
      const rd = refMaxDrawdown(code, asOf);
      expect(d?.peak ?? null).toEqual(rd?.peak ?? null);
      expect(d?.trough ?? null).toEqual(rd?.trough ?? null);
      expect(monthlyReturns(id, { asOf })).toEqual(
        refMonthlyReturns(code, asOf).map((m) => ({ month: m.month, pct: expect.closeTo(m.pct, 9) })),
      );
    }
  });
});
