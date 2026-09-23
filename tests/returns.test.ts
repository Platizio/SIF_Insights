/**
 * The returns engine against its independent reference (tests/reference/
 * returns.ts), for every scheme × every period × a set of fixed as-of dates,
 * plus the relationships any correct implementation must satisfy.
 *
 * Nothing here pins a return: the nightly NAV run appends a point every
 * business day, so a pinned "+4.63%" would fail tomorrow for no fault. The
 * fixed as-of dates are in the PAST, where history no longer moves, and the
 * default as-of is compared to the reference computed from the same file.
 */
import { describe, expect, it } from "vitest";

import {
  PERIODS,
  RETURN_RULES,
  getNav,
  maxDrawdown,
  monthlyReturns,
  navHistory,
  trailingReturn,
  volatility,
  type ReturnResult,
} from "@/lib/data";

import { rawSchemes, rawSchemesFile, seriesFor } from "./raw-source";
import {
  refMaxDrawdown,
  refMonthlyReturns,
  refTrailingReturn,
  refVolatility,
  type RefResult,
} from "./reference/returns";

/** Past month-ends, a mid-month day, a pre-launch date — and the file's own date. */
const AS_OF = [
  undefined,
  "2025-10-01",
  "2025-12-31",
  "2026-02-28",
  "2026-03-31",
  "2026-06-15",
  "2026-08-31",
  rawSchemesFile.navAsOf,
] as const;

function expectSame(actual: ReturnResult, expected: RefResult) {
  expect(actual.status).toBe(expected.status);
  if (actual.status === "ok" && expected.status === "ok") {
    expect(actual.pct).toBeCloseTo(expected.pct, 9);
    expect(actual.annualised).toBe(expected.annualised);
    expect(actual.basis).toBe(expected.basis);
    expect(actual.from).toEqual(expected.from);
    expect(actual.to).toEqual(expected.to);
  } else if (actual.status !== "ok" && expected.status !== "ok") {
    expect(actual.needsFrom).toBe(expected.needsFrom);
  }
}

describe("trailingReturn matches the reference implementation", () => {
  for (const s of rawSchemes) {
    it(`${s.amfiSchemeCode} — every period at every as-of date`, () => {
      for (const asOf of AS_OF) {
        for (const p of PERIODS) {
          expectSame(
            trailingReturn(s.id, p, { asOf }),
            refTrailingReturn(s.amfiSchemeCode, p, { asOf }),
          );
        }
      }
    });
  }
});

describe("volatility, maxDrawdown and monthlyReturns match the reference", () => {
  for (const s of rawSchemes) {
    it(`${s.amfiSchemeCode}`, () => {
      for (const asOf of AS_OF) {
        const vol = volatility(s.id, { asOf });
        const refVol = refVolatility(s.amfiSchemeCode, asOf);
        expect(vol === null).toBe(refVol === null);
        if (vol && refVol) {
          expect(vol.pct).toBeCloseTo(refVol.pct, 9);
          expect(vol.obs).toBe(refVol.obs);
        }

        const mdd = maxDrawdown(s.id, { asOf });
        const refMdd = refMaxDrawdown(s.amfiSchemeCode, asOf);
        expect(mdd === null).toBe(refMdd === null);
        if (mdd && refMdd) {
          expect(mdd.pct).toBeCloseTo(refMdd.pct, 9);
          expect(mdd.peak).toEqual(refMdd.peak);
          expect(mdd.trough).toEqual(refMdd.trough);
        }

        const months = monthlyReturns(s.id, { asOf });
        const refMonths = refMonthlyReturns(s.amfiSchemeCode, asOf);
        expect(months.map((m) => m.month)).toEqual(refMonths.map((m) => m.month));
        months.forEach((m, i) => expect(m.pct).toBeCloseTo(refMonths[i].pct, 9));
      }
    });
  }
});

describe("trailingReturn — relationships", () => {
  it("1D equals the NAV quote's change against the previous published close", () => {
    for (const s of rawSchemes) {
      const q = getNav(s.id);
      const r = trailingReturn(s.id, "1D");
      if (q.status !== "live" || q.changePct === null) {
        expect(r.status).toBe("insufficient-history");
        continue;
      }
      expect(r.status).toBe("ok");
      if (r.status === "ok") expect(r.pct).toBeCloseTo(q.changePct, 10);
    }
  });

  it("an ok result ends at the last NAV on or before asOf, and starts no later", () => {
    for (const s of rawSchemes) {
      for (const asOf of AS_OF) {
        const cut = asOf ?? rawSchemesFile.navAsOf;
        const tail = seriesFor(s.amfiSchemeCode).filter(([d]) => d <= cut).at(-1);
        for (const p of PERIODS) {
          const r = trailingReturn(s.id, p, { asOf });
          if (r.status !== "ok") continue;
          expect(r.to.date).toBe(tail?.[0]);
          expect(r.from.date <= r.to.date).toBe(true);
        }
      }
    }
  });

  it("is annualised exactly when the span reaches a year", () => {
    for (const s of rawSchemes) {
      for (const p of PERIODS) {
        const r = trailingReturn(s.id, p);
        if (r.status !== "ok") continue;
        const days =
          (Date.parse(r.to.date) - Date.parse(r.from.date)) / (24 * 60 * 60 * 1000);
        expect(r.annualised).toBe(days >= RETURN_RULES.annualiseFromDays);
      }
    }
  });

  it("insufficient history always says which date the series would have to reach", () => {
    for (const s of rawSchemes) {
      const first = seriesFor(s.amfiSchemeCode)[0]?.[0];
      for (const p of ["1W", "1M", "3M", "6M", "1Y", "2Y"] as const) {
        const r = trailingReturn(s.id, p);
        if (r.status !== "insufficient-history") continue;
        expect(r.needsFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // Either the series starts after it, or the nearest earlier print is stale.
        const before = seriesFor(s.amfiSchemeCode).filter(([d]) => d <= r.needsFrom!);
        if (before.length > 0) {
          const gap =
            (Date.parse(r.needsFrom!) - Date.parse(before.at(-1)![0])) / (24 * 60 * 60 * 1000);
          expect(gap).toBeGreaterThan(RETURN_RULES.maxStartGapDays);
        } else {
          expect(first! > r.needsFrom!).toBe(true);
        }
      }
    }
  });

  it("a scheme with only its first NAV has no 1D and no since-first-NAV return", () => {
    // Synthetic cut at each scheme's first published date.
    for (const s of rawSchemes) {
      const first = seriesFor(s.amfiSchemeCode)[0][0];
      expect(trailingReturn(s.id, "1D", { asOf: first }).status).toBe("insufficient-history");
      expect(trailingReturn(s.id, "SI", { asOf: first }).status).toBe("insufficient-history");
    }
  });

  it("an unknown scheme is not-captured, never an error", () => {
    expect(trailingReturn("no-such-scheme", "1M")).toEqual({ status: "not-captured" });
    expect(volatility("no-such-scheme")).toBeNull();
    expect(maxDrawdown("no-such-scheme")).toBeNull();
    expect(monthlyReturns("no-such-scheme")).toEqual([]);
  });

  it("withholds performance for schemes younger than the minimum age", () => {
    for (const s of rawSchemes) {
      const points = navHistory(s.id);
      const age =
        (Date.parse(points.at(-1)!.date) - Date.parse(points[0].date)) / (24 * 60 * 60 * 1000);
      for (const p of PERIODS) {
        const tooYoung = trailingReturn(s.id, p, { minAgeDays: age + 1 });
        expect(tooYoung.status).toBe("withheld");
        const oldEnough = trailingReturn(s.id, p, { minAgeDays: Math.max(age, 1) });
        if (age >= 1) expect(oldEnough.status).not.toBe("withheld");
        expectSame(oldEnough, refTrailingReturn(s.amfiSchemeCode, p, { minAgeDays: Math.max(age, 1) }));
      }
    }
  });
});

describe("risk metrics — relationships", () => {
  it("volatility counts daily returns, and is null below the observation floor", () => {
    for (const s of rawSchemes) {
      const returns = navHistory(s.id).length - 1;
      const v = volatility(s.id);
      if (returns < RETURN_RULES.minObsForRisk) expect(v).toBeNull();
      else {
        expect(v?.obs).toBe(returns);
        expect(v!.pct).toBeGreaterThan(0);
      }
    }
  });

  it("a drawdown is a fall: ≤ 0, peak before trough, and the pct is trough over peak", () => {
    for (const s of rawSchemes) {
      const d = maxDrawdown(s.id);
      if (!d) continue;
      expect(d.pct).toBeLessThanOrEqual(0);
      expect(d.peak.date <= d.trough.date).toBe(true);
      expect(d.pct).toBeCloseTo((d.trough.nav / d.peak.nav - 1) * 100, 10);
    }
  });

  it("monthly returns are completed calendar months, in order, never the launch month", () => {
    for (const s of rawSchemes) {
      const months = monthlyReturns(s.id).map((m) => m.month);
      expect(months).toEqual([...months].sort());
      const launch = seriesFor(s.amfiSchemeCode)[0][0].slice(0, 7);
      expect(months).not.toContain(launch);
      expect(months).not.toContain(rawSchemesFile.navAsOf.slice(0, 7));
    }
  });
});
