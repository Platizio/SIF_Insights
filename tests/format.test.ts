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
