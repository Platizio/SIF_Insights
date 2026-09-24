/**
 * SifRow — the one serialisable per-scheme record the Tracker, Screener,
 * Compare and /sif/[id] read as props.
 *
 * A row is a denormalised copy of what the data layer computes, so the risk
 * is drift: a row whose 6M return differs from `trailingReturn`, or whose
 * charged TER is quietly the ISID cap. Each field is held to the function it
 * was built from, and to the raw files where that is possible. Nothing here
 * pins a value the nightly NAV moves.
 */
import { describe, expect, it } from "vitest";

import {
  PERIODS,
  amcAum,
  buildSifRows,
  compareSeries,
  currentTer,
  exitLoadParsed,
  faceValue,
  inception,
  industryAum,
  liquidityBucket,
  maxDrawdown,
  monthlyReturns,
  navHistory,
  navLastUpdated,
  normaliseBenchmark,
  riskBandNumber,
  schemeAum,
  sifRow,
  stats,
  strategies,
  strategySlug,
  trailingReturn,
  volatility,
} from "@/lib/data";

import { rawDisclosures, rawSchemes, seriesFor } from "./raw-source";

const rows = buildSifRows();
const DAY = 86_400_000;

describe("buildSifRows", () => {
  it("is one row per scheme, in scheme order, built once", () => {
    expect(rows.map((r) => r.id)).toEqual(strategies.map((s) => s.id));
    expect(rows.map((r) => r.code)).toEqual(rawSchemes.map((s) => s.amfiSchemeCode));
    expect(buildSifRows()).toBe(rows);
  });

  it("is plain data: it survives a JSON round trip unchanged", () => {
    const finite = rows.filter((r) => Number.isFinite(r.nav));
    expect(JSON.parse(JSON.stringify(finite))).toEqual(finite);
  });

  it("every return cell is the returns engine's answer, with its dates", () => {
    for (const r of rows) {
      for (const p of PERIODS) {
        const t = trailingReturn(r.id, p);
        if (t.status === "ok") {
          expect(r.returns[p]).toEqual({ v: t.pct });
          expect(r.returnsMeta[p]).toEqual({
            from: t.from.date,
            to: t.to.date,
            annualised: t.annualised,
            basis: t.basis,
          });
        } else {
          expect(r.returns[p]).toEqual({ absent: t.status });
          expect(r.returnsMeta[p]).toEqual({});
        }
      }
      expect(r.monthly).toEqual(monthlyReturns(r.id));
    }
  });

  it("risk cells are the risk engine's answer, or insufficient history", () => {
    for (const r of rows) {
      const vol = volatility(r.id);
      const mdd = maxDrawdown(r.id);
      expect(r.volatility).toEqual(vol ? { v: vol.pct } : { absent: "insufficient-history" });
      expect(r.maxDrawdown).toEqual(mdd ? { v: mdd.pct } : { absent: "insufficient-history" });
    }
  });

  it("carries the latest published NAV and date — never ranked, but always the file's", () => {
    for (const s of rawSchemes) {
      const r = sifRow(s.id)!;
      expect(r.nav).toBe(s.nav);
      expect(r.navAsOf).toBe(s.navAsOf);
      expect(seriesFor(s.amfiSchemeCode).at(-1)?.[1]).toBe(s.nav);
    }
  });

  it("face value is ₹1,000 exactly for schemes that first priced above ₹200", () => {
    for (const r of rows) {
      const first = navHistory(r.id)[0]?.nav;
      const fv = faceValue(r.id);
      expect(r.faceValue).toBe(fv.value);
      expect(r.faceValueBasis).toBe(fv.basis);
      if (fv.basis === "inferred") expect(r.faceValue).toBe(first! > 200 ? 1000 : 10);
    }
  });

  it("keeps the charged TER and the ISID cap apart", () => {
    for (const r of rows) {
      const d = rawDisclosures[r.code];
      const ter = currentTer(r.code);
      expect(r.ter).toEqual(ter ? { v: ter.pct } : { absent: "not-captured" });
      expect(r.terAsOf).toBe(ter?.asOf ?? null);
      const isCap = d?.expenseRatioIsCap === true && typeof d.expenseRatio === "number";
      expect(r.terMax).toEqual(isCap ? { v: d!.expenseRatio } : { absent: "not-captured" });
    }
  });

  it("AUM is the scheme's own, and the house total only when every scheme is counted", () => {
    for (const r of rows) {
      const aum = schemeAum(r.code);
      expect(r.aumCr).toEqual(aum ? { v: aum.cr } : { absent: "not-captured" });
      expect(r.aumAsOf).toBe(aum?.asOf ?? null);
      const house = amcAum(r.amcId);
      expect(r.amcAumCr).toEqual(house?.complete ? { v: house.cr } : { absent: "not-captured" });
    }
  });

  it("the parsed terms match their parsers, and the text is the document's own", () => {
    for (const s of strategies) {
      const r = sifRow(s.id)!;
      expect(r.exitLoad).toEqual(exitLoadParsed(s));
      expect(r.exitLoad.text).toBe(s.exitLoad);
      expect(r.liquidity).toBe(liquidityBucket(s.redemptionFrequency));
      expect(r.redemptionText).toBe(s.redemptionFrequency);
      expect(r.riskBand).toBe(riskBandNumber(s.riskBand));
      expect(r.minInvestment).toBe(s.minInvestment);
      const bench = normaliseBenchmark(s.benchmark);
      expect(r.benchmarkId).toBe(bench?.id ?? null);
      expect(r.benchmark).toBe(bench?.label ?? null);
      expect(r.benchmarkText).toBe(s.benchmark);
      expect(r.strategy).toBe(strategySlug(s.type));
      expect(r.category).toBe(s.category);
    }
  });

  it("age runs from inception to navLastUpdated, and 'recent' means 90 days or fewer", () => {
    for (const r of rows) {
      const began = inception(r.id);
      expect(r.inception).toEqual(began);
      const age = began ? (Date.parse(navLastUpdated) - Date.parse(began.date)) / DAY : null;
      expect(r.ageDays).toBe(age);
      expect(r.status).toBe(age !== null && age <= 90 ? "recent" : "live");
    }
  });

  it("disclosure flags follow the data they describe", () => {
    for (const r of rows) {
      expect(r.disclosures.captured).toBe(r.code in rawDisclosures);
      if (!r.disclosures.captured) expect(r.disclosures.full).toBe(false);
      expect(r.disclosures.factsheet).toBe(r.documents.some((d) => d.kind === "factsheet"));
      expect(r.disclosures.portfolio).toBe(r.documents.some((d) => d.kind === "portfolio"));
    }
  });

  it("a short name drops the plan and option suffix, and never comes out empty", () => {
    for (const r of rows) {
      expect(r.shortName.length).toBeGreaterThan(0);
      expect(r.shortName).not.toMatch(/\b(regular|direct) plan\b/i);
      expect(r.shortName.length).toBeLessThanOrEqual(r.name.length);
    }
  });
});

describe("sifRow", () => {
  it("finds a row by scheme id or by AMFI code in any case", () => {
    const r = rows[0];
    expect(sifRow(r.id)).toBe(r);
    expect(sifRow(r.code)).toBe(r);
    expect(sifRow(r.code.toLowerCase())).toBe(r);
    expect(sifRow(` ${r.code} `)).toBe(r);
  });

  it("returns undefined for an unknown id", () => {
    expect(sifRow("SIF-999999")).toBeUndefined();
    expect(sifRow("")).toBeUndefined();
  });
});

describe("compareSeries", () => {
  const codes = rawSchemes.map((s) => s.amfiSchemeCode);

  it("returns each scheme's raw [date, nav] pairs, keyed by code", () => {
    const out = compareSeries(codes.slice(0, 2));
    expect(Object.keys(out)).toEqual(codes.slice(0, 2));
    for (const code of codes.slice(0, 2)) expect(out[code]).toEqual(seriesFor(code));
  });

  it("is case-insensitive, drops unknowns and repeats, and stops at four", () => {
    const out = compareSeries([codes[0].toLowerCase(), codes[0], "SIF-999999", ...codes.slice(1, 6)]);
    expect(Object.keys(out)).toEqual(codes.slice(0, 4));
  });

  it("an empty request is an empty answer", () => {
    expect(compareSeries([])).toEqual({});
  });
});

describe("stats — the counts the new pages interpolate", () => {
  it("strategyTypeCount is the number of distinct strategies across the rows", () => {
    expect(stats.strategyTypeCount).toBe(new Set(rows.map((r) => r.strategy ?? `type:${r.type}`)).size);
  });

  it("aumCoverage counts the rows that carry an AUM, out of every row", () => {
    expect(stats.aumCoverage).toEqual({
      captured: rows.filter((r) => "v" in r.aumCr).length,
      total: rows.length,
    });
  });

  it("aumAsOf is the industry total's month end, or null with no total", () => {
    expect(stats.aumAsOf).toBe(industryAum()?.asOf ?? null);
  });
});
