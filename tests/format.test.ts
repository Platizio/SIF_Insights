/**
 * Output shapes of the formatters.
 *
 * These are the last hop before a number reaches the page, so their exact
 * output IS the published fact — a hyphen where a minus sign belongs, or a
 * bare percentage where a regulatory cap belongs, is a wrong statement, not a
 * styling nit.
 */
import { describe, expect, it } from "vitest";

import {
  formatExpense,
  formatInr,
  formatNav,
  formatPct,
  formatUpdated,
  riskBandNumber,
} from "@/lib/data";
import * as fmt from "@/lib/format";

import { rawSchemes } from "./raw-source";

const MINUS = "−"; // U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS

describe("formatNav", () => {
  it("always shows four decimals, the precision AMFI publishes", () => {
    expect(formatNav(11.0412)).toBe("₹11.0412");
    expect(formatNav(10)).toBe("₹10.0000");
  });

  it("groups in the Indian system", () => {
    expect(formatNav(1004.8148)).toBe("₹1,004.8148");
    expect(formatNav(100000)).toBe("₹1,00,000.0000");
  });

  it("renders every published NAV as rupees with four decimals", () => {
    for (const s of rawSchemes) {
      expect(formatNav(s.nav)).toMatch(/^₹[\d,]+\.\d{4}$/);
    }
  });
});

describe("formatPct", () => {
  it("zero carries NO sign", () => {
    expect(formatPct(0)).toBe("0.00%");
    expect(formatPct(0)).not.toContain("+");
    expect(formatPct(0)).not.toContain(MINUS);
    expect(formatPct(0)).not.toContain("-");
  });

  it("positives carry a plus", () => {
    expect(formatPct(1.5)).toBe("+1.50%");
    expect(formatPct(0.004)).toBe("+0.00%"); // rounds to zero, still a real gain
  });

  it("negatives use U+2212 MINUS SIGN, never a hyphen-minus", () => {
    expect(formatPct(-1.5)).toBe(`${MINUS}1.50%`);
    expect(formatPct(-1.5).charCodeAt(0)).toBe(0x2212);
    expect(formatPct(-1.5)).not.toContain("-");
    expect(formatPct(-0.125)).toBe(`${MINUS}0.13%`);
  });

  it("always shows exactly two decimals", () => {
    for (const v of [0, 1, -1, 12.3456, -99.999]) {
      expect(formatPct(v)).toMatch(/^[+−]?\d+\.\d{2}%$/);
    }
  });
});

describe("formatExpense", () => {
  it("prefixes 'Up to ' when the figure is the ISID's permissible cap", () => {
    expect(formatExpense(2.25, true)).toBe("Up to 2.25%");
    expect(formatExpense(1.3, true)).toBe("Up to 1.30%");
  });

  it("prints a bare percentage when the figure is the charged ratio", () => {
    expect(formatExpense(2.25, false)).toBe("2.25%");
  });

  it("an unknown provenance is not dressed up as a cap", () => {
    expect(formatExpense(2.25, null)).toBe("2.25%");
  });

  it("returns null — not a placeholder — when the ratio is not captured", () => {
    expect(formatExpense(null, true)).toBeNull();
    expect(formatExpense(null, null)).toBeNull();
  });
});

describe("formatInr", () => {
  it("groups in the Indian system by default", () => {
    expect(formatInr(1_000_000)).toBe("₹10,00,000");
    expect(formatInr(1000)).toBe("₹1,000");
  });

  it("compacts to lakh and crore above the respective thresholds", () => {
    expect(formatInr(1_000_000, { compact: true })).toBe("₹10 L");
    expect(formatInr(100_000, { compact: true })).toBe("₹1 L");
    expect(formatInr(20_000_000, { compact: true })).toBe("₹2 Cr");
    expect(formatInr(10_000_000, { compact: true })).toBe("₹1 Cr");
  });

  it("falls back to full grouping below one lakh", () => {
    expect(formatInr(50_000, { compact: true })).toBe("₹50,000");
  });
});

describe("riskBandNumber", () => {
  it("extracts the band, and rejects anything outside 1–5", () => {
    expect(riskBandNumber("Risk Band 5")).toBe(5);
    expect(riskBandNumber("Risk Band 2")).toBe(2);
    expect(riskBandNumber("Risk Band 9")).toBeNull();
    expect(riskBandNumber("Not captured")).toBeNull();
    expect(riskBandNumber(null)).toBeNull();
  });
});

describe("formatUpdated", () => {
  // The month abbreviation is ICU's ("Sept" vs "Sep" differs between CLDR
  // releases), so assert the parts that carry meaning: the day must not slip,
  // and the year must be the ISO year.
  it("keeps the day and year of the ISO string — no timezone slip", () => {
    expect(formatUpdated("2026-01-01")).toBe("1 Jan 2026");
    expect(formatUpdated("2026-09-04")).toMatch(/^4 \S+ 2026$/);
    expect(formatUpdated("2026-12-31")).toMatch(/^31 \S+ 2026$/);
  });

  it("renders every scheme's navAsOf on its own calendar day", () => {
    for (const s of rawSchemes) {
      const day = String(Number(s.navAsOf.slice(8, 10)));
      const year = s.navAsOf.slice(0, 4);
      expect(formatUpdated(s.navAsOf)).toMatch(
        new RegExp(`^${day} \\S+ ${year}$`),
      );
    }
  });
});

/* ============================================================
   The client-safe additions — imported from lib/format directly,
   which is the path a client island uses.
   ============================================================ */

describe("formatCr", () => {
  it("prints crore in Indian grouping, whole crore from ₹1,000 Cr", () => {
    expect(fmt.formatCr(12_345.67)).toBe("₹12,346 Cr");
    expect(fmt.formatCr(1_00_000)).toBe("₹1,00,000 Cr");
    expect(fmt.formatCr(1000)).toBe("₹1,000 Cr");
  });

  it("keeps up to two places below ₹1,000 Cr, dropping trailing zeros", () => {
    expect(fmt.formatCr(84.5)).toBe("₹84.5 Cr");
    expect(fmt.formatCr(999.456)).toBe("₹999.46 Cr");
    expect(fmt.formatCr(500)).toBe("₹500 Cr");
  });
});

describe("formatDays", () => {
  it("pluralises and groups", () => {
    expect(fmt.formatDays(1)).toBe("1 day");
    expect(fmt.formatDays(15)).toBe("15 days");
    expect(fmt.formatDays(0)).toBe("0 days");
    expect(fmt.formatDays(1095)).toBe("1,095 days");
  });
});

describe("absentLabel", () => {
  it("maps every reason to one of exactly three phrases", () => {
    const phrases = new Set(
      (["insufficient-history", "not-captured", "not-applicable", "withheld"] as const).map(
        fmt.absentLabel,
      ),
    );
    expect(phrases).toEqual(
      new Set(["N/A — Insufficient history", "Not captured", "Not applicable"]),
    );
  });
});

describe("heatGrade", () => {
  const LONG = ["1M", "3M", "6M", "1Y", "2Y", "SI"] as const;

  it("is 0 only for an exactly unchanged (or non-finite) value", () => {
    for (const p of [...LONG, "1D", "1W"] as const) {
      expect(fmt.heatGrade(0, p)).toBe(0);
      expect(fmt.heatGrade(-0, p)).toBe(0);
      expect(fmt.heatGrade(Number.NaN, p)).toBe(0);
      expect(fmt.heatGrade(0.0001, p)).toBe(1);
      expect(fmt.heatGrade(-0.0001, p)).toBe(-1);
    }
  });

  it("grades ≥1M periods at <1, 1–3, 3–7, >7", () => {
    for (const p of LONG) {
      expect([0.99, 1, 2.9, 3, 3.01, 7, 7.01, 40].map((x) => fmt.heatGrade(x, p))).toEqual([
        1, 2, 2, 2, 3, 3, 4, 4,
      ]);
    }
  });

  it("grades 1D and 1W at <0.25, 0.25–1, 1–2.5, >2.5", () => {
    for (const p of ["1D", "1W"] as const) {
      expect([0.24, 0.25, 1, 1.01, 2.5, 2.51].map((x) => fmt.heatGrade(x, p))).toEqual([
        1, 2, 2, 3, 3, 4,
      ]);
    }
  });

  it("is symmetric in sign, so a loss is graded like the gain of the same size", () => {
    for (const p of [...LONG, "1D", "1W"] as const) {
      for (const x of [0.1, 0.5, 1.5, 2, 5, 9]) {
        expect(fmt.heatGrade(-x, p)).toBe(-fmt.heatGrade(x, p));
      }
    }
  });

  it("never contradicts the printed sign", () => {
    for (const x of [-12, -3.2, -0.004, 0, 0.004, 0.8, 5]) {
      const printed = fmt.formatPct(x);
      const g = fmt.heatGrade(x, "3M");
      if (printed.startsWith("+")) expect(g).toBeGreaterThan(0);
      else if (printed.startsWith("−")) expect(g).toBeLessThan(0);
      else expect(g).toBe(0);
    }
  });
});

describe("formatMonth", () => {
  it("names the month in UTC, whatever the reader's zone", () => {
    expect(fmt.formatMonth("2026-01")).toBe("Jan 2026");
    expect(fmt.formatMonth("2026-12")).toMatch(/^\S+ 2026$/);
  });
});
