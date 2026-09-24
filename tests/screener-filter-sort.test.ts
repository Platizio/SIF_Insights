/**
 * The Screener's filter and sort engines, and their null semantics.
 *
 * Most of this dataset is young, so "missing" is the common case, not the
 * edge: an active 6M filter meets a third of the schemes with six months of
 * history and two thirds without. Those are not "below 5%" — we do not know —
 * so an active filter EXCLUDES them and COUNTS them per field for the "N SIFs
 * hidden · Show them" line, and a sort puts them LAST in both directions,
 * because "insufficient history" is neither the lowest return nor the highest.
 *
 * Synthetic rows (tests/fixtures/sif-row.ts) pin each case exactly; the live
 * rows are then held to the same relationships.
 */
import { describe, expect, it } from "vitest";

import { buildSifRows } from "@/lib/data";
import type { FilterValue } from "@/lib/screener/fields";
import { filterRows, matchesQuery, normaliseSearch } from "@/lib/screener/filter";
import { sortRows } from "@/lib/screener/sort";

import { makeRow } from "./fixtures/sif-row";

const rows = [
  makeRow({
    code: "SIF-1",
    name: "Alpha Equity Long-Short Fund",
    amcId: "alpha",
    amcName: "Alpha MF",
    brand: "AlphaSIF",
    riskBand: 5,
    returns: { "6M": { v: 8 }, "1M": { v: 2 } },
    aumCr: { v: 500 },
    managers: ["Émile Zola"],
    inception: { date: "2025-10-01", basis: "allotment" },
    liquidity: "daily",
    exitLoad: { applicable: true, pct: 1, periodDays: 15, tiered: false, text: "1% …" },
  }),
  makeRow({
    code: "SIF-2",
    name: "Beta Hybrid Long-Short Fund",
    amcId: "beta",
    amcName: "Beta MF",
    category: "hybrid",
    strategy: "hybrid-long-short",
    strategyLabel: "Hybrid Long-Short",
    riskBand: 2,
    returns: { "6M": { v: 5 }, "1M": { v: 5 } },
    aumCr: { v: 1200 },
    liquidity: "twice-weekly",
    exitLoad: { applicable: false, pct: 0, periodDays: 0, tiered: false, text: "Nil" },
  }),
  makeRow({
    code: "SIF-3",
    name: "Gamma Equity Long-Short Fund",
    amcId: "gamma",
    amcName: "Gamma MF",
    riskBand: 5,
    // No 6M: launched four months ago.
    returns: { "1M": { v: -1 } },
    inception: { date: "2026-05-20", basis: "first-nav" },
    liquidity: "daily",
  }),
  makeRow({
    code: "SIF-4",
    name: "Delta Equity Long-Short Fund",
    amcId: "alpha",
    amcName: "Alpha MF",
    riskBand: null,
    returns: { "6M": { v: 2 } },
    aumCr: { v: 80 },
    managers: ["A. Rao", "B. Shah"],
  }),
];

const ids = (r: { code: string }[]) => r.map((x) => x.code);
const screen = (filters: Record<string, FilterValue>, extra: { q?: string; includeMissing?: boolean } = {}) =>
  filterRows(rows, { q: extra.q ?? "", filters, includeMissing: extra.includeMissing ?? false });

describe("filterRows", () => {
  it("no filter, no query: every row, nothing hidden", () => {
    expect(screen({})).toEqual({ rows, hiddenByMissing: {}, hiddenTotal: 0 });
  });

  it("a range is inclusive at both bounds", () => {
    expect(ids(screen({ r6m: { t: "range", min: 5, max: 8 } }).rows)).toEqual(["SIF-1", "SIF-2"]);
    expect(ids(screen({ r6m: { t: "range", min: 5, max: null } }).rows)).toEqual(["SIF-1", "SIF-2"]);
    expect(ids(screen({ r6m: { t: "range", min: null, max: 5 } }).rows)).toEqual(["SIF-2", "SIF-4"]);
  });

  it("excludes rows missing the filtered value — and counts them, per field", () => {
    const res = screen({ r6m: { t: "range", min: 0, max: null } });
    expect(ids(res.rows)).toEqual(["SIF-1", "SIF-2", "SIF-4"]);
    expect(res.hiddenByMissing).toEqual({ r6m: 1 });
    expect(res.hiddenTotal).toBe(1);
  });

  it("includeMissing brings the hidden rows back, and the count goes to zero", () => {
    const res = screen({ r6m: { t: "range", min: 0, max: null } }, { includeMissing: true });
    expect(ids(res.rows)).toEqual(["SIF-1", "SIF-2", "SIF-3", "SIF-4"]);
    expect(res.hiddenTotal).toBe(0);
    expect(res.hiddenByMissing).toEqual({});
  });

  it("a row that FAILS a filter on a value it has is out — never counted as hidden", () => {
    // SIF-3 has no 6M (missing) but its 1M of −1 fails 1M ≥ 0 outright.
    const res = screen({ r6m: { t: "range", min: 0, max: null }, r1m: { t: "range", min: 0, max: null } });
    expect(ids(res.rows)).toEqual(["SIF-1", "SIF-2"]);
    // SIF-4 has 6M but no 1M: hidden by 1M only.
    expect(res.hiddenByMissing).toEqual({ r1m: 1 });
    expect(res.hiddenTotal).toBe(1);
  });

  it("a row missing two filtered fields counts under both, once in the total", () => {
    const res = screen({ r6m: { t: "range", min: 0, max: null }, aum: { t: "range", min: 0, max: null } });
    // SIF-3 lacks both 6M and AUM.
    expect(res.hiddenByMissing).toEqual({ r6m: 1, aum: 1 });
    expect(res.hiddenTotal).toBe(1);
  });

  it("ANDs across fields and ORs within a set", () => {
    expect(ids(screen({ amc: { t: "set", ids: ["alpha", "gamma"] } }).rows)).toEqual([
      "SIF-1",
      "SIF-3",
      "SIF-4",
    ]);
    expect(
      ids(screen({ amc: { t: "set", ids: ["alpha", "gamma"] }, risk: { t: "set", ids: ["5"] } }).rows),
    ).toEqual(["SIF-1", "SIF-3"]);
    // Risk band not captured on SIF-4 → hidden, not failed.
    expect(screen({ amc: { t: "set", ids: ["alpha"] }, risk: { t: "set", ids: ["5"] } }).hiddenByMissing).toEqual({
      risk: 1,
    });
  });

  it("a list field matches when ANY of its values is in the set", () => {
    const res = screen({ mgr: { t: "set", ids: ["b-shah"] } });
    expect(ids(res.rows)).toEqual(["SIF-4"]);
    expect(res.hiddenByMissing).toEqual({ mgr: 2 }); // SIF-2, SIF-3 have no managers on file
  });

  it("flags match their value exactly; a not-captured flag is missing", () => {
    expect(ids(screen({ el: { t: "flag", v: false } }).rows)).toEqual(["SIF-2"]);
    expect(screen({ el: { t: "flag", v: true } }).hiddenByMissing).toEqual({ el: 2 });
  });

  it("a date range compares calendar days, inclusively", () => {
    const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
    const res = screen({ inc: { t: "range", min: day("2025-10-01"), max: null } });
    expect(ids(res.rows)).toEqual(["SIF-1", "SIF-3"]);
    expect(ids(screen({ inc: { t: "range", min: null, max: day("2025-10-01") } }).rows)).toEqual(["SIF-1"]);
  });

  it("ignores a filter on an unknown or planned field, or of the wrong shape", () => {
    expect(screen({ nope: { t: "range", min: 1, max: 2 } }).rows).toEqual(rows);
    expect(screen({ sharpe: { t: "range", min: 1, max: 2 } }).rows).toEqual(rows);
    expect(screen({ r6m: { t: "set", ids: ["5"] } }).rows).toEqual(rows);
  });
});

describe("search", () => {
  it("folds case, accents, hyphens and punctuation", () => {
    expect(normaliseSearch("Équity  Long-Short!")).toBe("equity long short");
    expect(ids(screen({}, { q: "long short hybrid" }).rows)).toEqual(["SIF-2"]);
    // "longshort" is no word in the haystack; with the spaces out, it matches.
    expect(ids(screen({}, { q: "Hybrid LongShort" }).rows)).toEqual(["SIF-2"]);
  });

  it("matches the name, AMC, brand, strategy and managers", () => {
    expect(ids(screen({}, { q: "alphasif" }).rows)).toEqual(["SIF-1"]);
    expect(ids(screen({}, { q: "gamma mf" }).rows)).toEqual(["SIF-3"]);
    expect(ids(screen({}, { q: "emile" }).rows)).toEqual(["SIF-1"]);
    expect(ids(screen({}, { q: "hybrid long-short" }).rows)).toEqual(["SIF-2"]);
    expect(matchesQuery(rows[0], "   ")).toBe(true);
  });

  it("a query and a filter compose; a search miss is not 'hidden'", () => {
    const res = screen({ r6m: { t: "range", min: 0, max: null } }, { q: "gamma" });
    expect(res.rows).toEqual([]);
    expect(res.hiddenByMissing).toEqual({ r6m: 1 });
    const miss = screen({ r6m: { t: "range", min: 0, max: null } }, { q: "alpha" });
    expect(miss.hiddenTotal).toBe(0);
  });
});

describe("sortRows", () => {
  it("puts a missing value LAST in both directions", () => {
    expect(ids(sortRows(rows, [{ id: "r6m", dir: "desc" }]))).toEqual(["SIF-1", "SIF-2", "SIF-4", "SIF-3"]);
    expect(ids(sortRows(rows, [{ id: "r6m", dir: "asc" }]))).toEqual(["SIF-4", "SIF-2", "SIF-1", "SIF-3"]);
  });

  it("breaks ties with the second key, then by name", () => {
    // Risk 5: SIF-1 (Alpha…), SIF-3 (Gamma…); risk 2: SIF-2; missing: SIF-4.
    expect(ids(sortRows(rows, [{ id: "risk", dir: "desc" }]))).toEqual(["SIF-1", "SIF-3", "SIF-2", "SIF-4"]);
    expect(
      ids(sortRows(rows, [{ id: "risk", dir: "desc" }, { id: "r1m", dir: "asc" }])),
    ).toEqual(["SIF-3", "SIF-1", "SIF-2", "SIF-4"]);
  });

  it("uses at most two keys", () => {
    const two = sortRows(rows, [{ id: "risk", dir: "desc" }, { id: "r1m", dir: "asc" }]);
    const three = sortRows(rows, [
      { id: "risk", dir: "desc" },
      { id: "r1m", dir: "asc" },
      { id: "aum", dir: "desc" },
    ]);
    expect(ids(three)).toEqual(ids(two));
  });

  it("with no usable key, orders by name — never by absolute NAV", () => {
    const byName = [...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r) => r.code);
    expect(ids(sortRows(rows, []))).toEqual(byName);
    expect(ids(sortRows(rows, [{ id: "nav", dir: "desc" }]))).toEqual(byName);
    expect(ids(sortRows(rows, [{ id: "sharpe", dir: "desc" }]))).toEqual(byName);
  });

  it("orders an enum by its label, not its id", () => {
    const named = [
      makeRow({ code: "SIF-7", name: "Z", amcId: "a-house", amcName: "Zeta MF" }),
      makeRow({ code: "SIF-8", name: "Y", amcId: "z-house", amcName: "Alpha MF" }),
    ];
    expect(ids(sortRows(named, [{ id: "amc", dir: "asc" }]))).toEqual(["SIF-8", "SIF-7"]);
  });

  it("returns a new array and leaves the input alone", () => {
    const before = ids(rows);
    const out = sortRows(rows, [{ id: "r6m", dir: "desc" }]);
    expect(out).not.toBe(rows);
    expect(ids(rows)).toEqual(before);
  });
});

describe("on the live rows", () => {
  const live = buildSifRows();

  it("every row is either kept, hidden by a missing value, or failed — and the counts add up", () => {
    const filters: Record<string, FilterValue> = { r3m: { t: "range", min: 0, max: null } };
    const res = filterRows(live, { q: "", filters, includeMissing: false });
    const missing = live.filter((r) => !("v" in r.returns["3M"])).length;
    const failed = live.filter((r) => "v" in r.returns["3M"] && r.returns["3M"].v < 0).length;
    expect(res.hiddenTotal).toBe(missing);
    expect(res.rows.length + missing + failed).toBe(live.length);
    const all = filterRows(live, { q: "", filters, includeMissing: true });
    expect(all.rows.length).toBe(live.length - failed);
  });

  it("a descending 6M sort puts every scheme with 6M ahead of every scheme without", () => {
    for (const dir of ["asc", "desc"] as const) {
      const sorted = sortRows(live, [{ id: "r6m", dir }]);
      const has = sorted.map((r) => "v" in r.returns["6M"]);
      expect(has).toEqual([...has].sort((a, b) => Number(b) - Number(a)));
    }
  });
});
