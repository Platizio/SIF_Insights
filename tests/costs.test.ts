/**
 * Exit load and liquidity, parsed out of the scheme documents' own sentences.
 *
 * The expectations are keyed by the EXACT text, not by scheme code: the text
 * is what is being parsed, and it only changes when someone re-reads an ISID.
 * A string on file that is not in the table still has to satisfy the
 * invariants below, so a new disclosure cannot slip through unparsed — but it
 * does not fail the suite merely for being new.
 */
import { describe, expect, it } from "vitest";

import { currentTer, exitLoadParsed, liquidityBucket, type ExitLoad } from "@/lib/data";

import { rawDisclosures } from "./raw-source";

type Expected = Omit<ExitLoad, "text">;

const nil: Expected = { applicable: false, pct: 0, periodDays: 0, tiered: false };
const load = (pct: number, periodDays: number, tiered = false): Expected => ({
  applicable: true,
  pct,
  periodDays,
  tiered,
});

/** Every exit-load sentence on file when this suite was written — all 30. */
const EXIT_LOADS: Record<string, Expected> = {
  "1% if redeemed/switched out on or before completion of 15 days from the date of allotment of units; No Exit Load if redeemed/switched-out after 15 days from the date of allotment":
    load(1, 15),
  "1% if redeemed/switched out on or before completion of 15 days from the date of allotment of units; Nil if redeemed/switched out after 15 days from the date of allotment.":
    load(1, 15),
  "If units are redeemed/switched out on or before 90 days from the date of allotment: 0.50% of the applicable NAV. If redeemed/switched out after 90 days from the date of allotment: Nil.":
    load(0.5, 90),
  // SIF-13 — tiered: 0.50% to 15 days, then 0.25% to a month.
  "0.50% if redeemed on or before 15 days from date of allotment; 0.25% if redeemed after 15 days but on or before 1 month; Nil after 1 month. No exit load on switching between Plans within the Investment Strategy or on units issued on IDCW re-investment.":
    load(0.5, 30, true),
  // SIF-21 — the "first 10% of units" is an allowance, not a 10% charge.
  "0.50% if redeemed/switched out on or before completion of 6 months from allotment (first 10% of units redeemable free); Nil after 6 months. Entry load: Not Applicable.":
    load(0.5, 183),
  "1% if redeemed/switched out on or before completion of 15 days from the date of allotment of units; Nil after 15 days":
    load(1, 15),
  "1% if redeemed/switched out on or before expiry of 1 year from date of allotment; Nil thereafter":
    load(1, 365),
  "1% of applicable Net Asset Value if the amount is redeemed or switched out within 12 months from allotment; NIL if redeemed or switched out after 12 months.":
    load(1, 365),
  "1% of applicable NAV if redeemed or switched out within 12 months from allotment; NIL if redeemed/switched out after 12 months":
    load(1, 365),
  "Entry Load: Nil; Exit Load: Nil": nil,
  "0.5% if redeemed within 3 months from the date of allotment of units; no exit load if redeemed after 3 months from the date of allotment.":
    load(0.5, 91),
  "0.50% of applicable NAV if redeemed/switched out on or within 30 days from date of allotment; Nil after 30 days. Entry Load: Not Applicable.":
    load(0.5, 30),
  "0.50% of applicable NAV for redemption/switch-out on or before 90 days from the date of allotment; Nil for redemption/switch-out after 90 days from the date of allotment.":
    load(0.5, 90),
  "0.5% if redeemed within 3 months from the date of allotment of units; Nil if redeemed after 3 months":
    load(0.5, 91),
  "1% if units redeemed within one year of allotment, NIL thereafter": load(1, 365),
  "1% if redeemed/switched out on or before expiry of 1 month from date of allotment; Nil if redeemed after 1 month":
    load(1, 30),
  "No exit load": nil,
  NIL: nil,
  "1% if redeemed or switched out on or before completion of 1 year from the date of allotment of units; Nil if redeemed or switched out after completion of 1 year from the date of allotment of units.":
    load(1, 365),
  "1% if redeemed/switched out on or before completion of 15 days from the date of allotment of units; No Exit Load if redeemed/switched-out after 15 days from the date of allotment.":
    load(1, 15),
  "0.50% of applicable NAV if redeemed/switched out on or before 90 days from date of allotment; Nil after 90 days. Units issued on IDCW reinvestment and bonus units are not subject to exit load.":
    load(0.5, 90),
  "1% of applicable NAV if redeemed/switched out within 12 months from allotment; NIL if redeemed/switched out after 12 months":
    load(1, 365),
  "2% of applicable NAV if redeemed/switched out on or before 1 year from date of allotment; Nil after 1 year":
    load(2, 365),
  "1% if redeemed within 90 days from date of allotment; Nil if redeemed after 90 days": load(1, 90),
  Nil: nil,
  "0.5% if redeemed within 3 months from date of allotment; Nil after 3 months": load(0.5, 91),
  "Nil. No exit load is chargeable on switches between different plans/options of the strategy, and units issued on reinvestment of IDCW are not subject to entry or exit load.":
    nil,
  "0.50% if redeemed/switched out on or before 3 months from date of allotment; Nil if redeemed after 3 months":
    load(0.5, 91),
};

const onFile = Object.entries(rawDisclosures)
  .map(([code, d]) => [code, d.exitLoad ?? null] as const)
  .filter((e): e is readonly [string, string] => e[1] !== null);

describe("exitLoadParsed", () => {
  it("covers the exit-load text of every scheme we hold, verbatim", () => {
    // The table is not a snapshot of codes: it holds each DISTINCT sentence.
    expect(onFile.length).toBeGreaterThanOrEqual(30);
    for (const [, text] of onFile) {
      const expected = EXIT_LOADS[text];
      if (!expected) continue; // a new sentence — held to the invariants below
      expect(exitLoadParsed({ exitLoad: text })).toEqual({ ...expected, text });
    }
  });

  it("every sentence on file resolves to a definite charge or a definite nil", () => {
    for (const [code, text] of onFile) {
      const e = exitLoadParsed({ exitLoad: text });
      expect(e.applicable, code).not.toBeNull();
      expect(e.text).toBe(text);
      if (e.applicable) {
        expect(e.pct, code).toBeGreaterThan(0);
        expect(e.periodDays, code).toBeGreaterThan(0);
      } else {
        expect(e).toMatchObject({ pct: 0, periodDays: 0, tiered: false });
      }
    }
  });

  it("never reads a conditional nil ('Nil after N days') as no load", () => {
    for (const [code, text] of onFile) {
      if (/\d+(\.\d+)?\s*%/.test(text) && !/10% of units/.test(text)) {
        expect(exitLoadParsed({ exitLoad: text }).applicable, code).toBe(true);
      }
    }
  });

  it("returns the not-captured shape for a missing value", () => {
    expect(exitLoadParsed({ exitLoad: null })).toEqual({
      applicable: null,
      pct: null,
      periodDays: null,
      tiered: false,
      text: null,
    });
    expect(exitLoadParsed({ exitLoad: "  " }).applicable).toBeNull();
  });

  it("treats a load it cannot read the figures of as charged, never free", () => {
    const e = exitLoadParsed({ exitLoad: "As per the addendum dated 1 June" });
    expect(e.applicable).toBe(true);
    expect(e.pct).toBeNull();
  });

  it("months are 365/12 days, so 12 months and one year agree", () => {
    const m12 = exitLoadParsed({ exitLoad: "1% within 12 months; Nil thereafter" });
    const y1 = exitLoadParsed({ exitLoad: "1% within 1 year; Nil thereafter" });
    expect(m12.periodDays).toBe(365);
    expect(y1.periodDays).toBe(365);
  });
});

/** Every redemption-frequency sentence on file, and the bucket it belongs in. */
const FREQUENCIES: Record<string, ReturnType<typeof liquidityBucket>> = {
  "Daily (only Business Days)": "daily",
  "Every Tuesday and Wednesday of the week (next business day if either falls on a non-business day).":
    "twice-weekly",
  "Every Monday and every Wednesday of the week (next business day if Monday/Wednesday is a non-business day)":
    "twice-weekly",
  "Two times a week (Monday & Thursday), or any lesser frequency as decided by the AMC":
    "twice-weekly",
  "Daily (Business Day)": "daily",
  "Once a month (first business day)": "monthly",
  "Daily (open ended - redemption/switch-out on each business day at NAV based prices)": "daily",
  "Twice a week (Monday and Wednesday); processed next business day if either falls on a non-business day":
    "twice-weekly",
  "Twice a week (Monday & Thursday)": "twice-weekly",
  "Daily (only business days)": "daily",
  "Daily (only on business days), or at such frequency as may be decided by the AMC subject to SEBI approval":
    "daily",
  "Twice a week (every Monday & Wednesday). If it falls on a non-business day, the immediate next business day.":
    "twice-weekly",
  "Every Monday of the week (next business day if Monday is a non-business day); redemption is otherwise not allowed except during the Specified Transaction Period":
    "weekly",
  "Every Tuesday and Wednesday of the week (next business day if either is a non-business day)":
    "twice-weekly",
  "Daily on all business days": "daily",
  "Daily (All business days)": "daily",
  Daily: "daily",
  "Daily (Only Business Days)": "daily",
  "Daily (open-ended; units offered for redemption/switch-out on each business day at NAV based prices; redemption proceeds dispatched within 3 working days)":
    "daily",
  "Twice a week (Monday and Wednesday); processed next business day if either is a non-business day":
    "twice-weekly",
  "Every Monday of the week": "weekly",
  "2 times a week (Monday and Thursday)": "twice-weekly",
  "Two times a week (Monday and Wednesday); next business day's NAV applies if either day is a non-business day":
    "twice-weekly",
  "Twice a week — Monday and Wednesday. Requests received after Wednesday 3.00 PM until Monday 3.00 PM are processed at Monday's NAV; those received after Monday 3.00 PM until Wednesday 3.00 PM at Wednesday's NAV. Where a Monday or Wednesday is a non-business day, the next business day's NAV applies.":
    "twice-weekly",
  "Daily (at applicable NAV)": "daily",
};

describe("liquidityBucket", () => {
  const frequencies = Object.entries(rawDisclosures)
    .map(([code, d]) => [code, d.redemptionFrequency ?? null] as const)
    .filter((e): e is readonly [string, string] => e[1] !== null);

  it("buckets every redemption sentence on file as the table says", () => {
    expect(frequencies.length).toBeGreaterThanOrEqual(30);
    for (const [code, text] of frequencies) {
      const expected = FREQUENCIES[text];
      if (expected) expect(liquidityBucket(text), code).toBe(expected);
    }
  });

  it("never leaves a sentence on file as 'other'", () => {
    for (const [code, text] of frequencies) {
      expect(liquidityBucket(text), code).not.toBe("other");
    }
  });

  it("null in, null out; the unrecognised is 'other', never guessed daily", () => {
    expect(liquidityBucket(null)).toBeNull();
    expect(liquidityBucket("")).toBeNull();
    expect(liquidityBucket("At the discretion of the trustee")).toBe("other");
    expect(liquidityBucket("Fortnightly (1st and 3rd Monday)")).toBe("fortnightly");
    expect(liquidityBucket("First Monday of the month")).toBe("monthly");
  });
});

describe("currentTer", () => {
  it("degrades to null for a scheme with nothing on file, or an unknown code", () => {
    expect(currentTer("SIF-3")).toBeNull();
    expect(currentTer("no-such-code")).toBeNull();
  });
});
