/**
 * NAV series shape and the face-value invariant.
 *
 * Every point in `nav-history.json` is a figure AMFI published on that date —
 * nothing is modelled or interpolated. So the series has to behave like a
 * ledger: ascending, no date written twice, every value a real price.
 */
import { describe, expect, it } from "vitest";

import { getNav, liveQuotes, navHistory, strategies } from "@/lib/data";

import { rawSchemes, seriesFor } from "./raw-source";

describe("NAV series shape", () => {
  it.each(rawSchemes.map((s) => [s.id, s.amfiSchemeCode] as const))(
    "%s — dates ascending, no duplicates, values finite and > 0",
    (id, code) => {
      const points = navHistory(id);
      expect(points.length).toBeGreaterThan(0);
      // the exported view and the raw file agree on length
      expect(points).toHaveLength(seriesFor(code).length);

      const dates = points.map((p) => p.date);
      expect(new Set(dates).size).toBe(dates.length);

      for (let i = 1; i < dates.length; i++) {
        // ISO dates compare correctly as strings; strictly greater, so an
        // equal pair fails here too even if the Set check ever loosened.
        expect(dates[i] > dates[i - 1]).toBe(true);
      }

      for (const p of points) {
        expect(/^\d{4}-\d{2}-\d{2}$/.test(p.date)).toBe(true);
        expect(Number.isFinite(p.nav)).toBe(true);
        expect(p.nav).toBeGreaterThan(0);
      }
    },
  );
});

describe("series tail is the published quote", () => {
  it.each(rawSchemes.map((s) => [s.id] as const))(
    "%s — last point equals nav / navAsOf in schemes.json",
    (id) => {
      const raw = rawSchemes.find((s) => s.id === id)!;
      const points = navHistory(id);
      const tail = points[points.length - 1];

      expect(tail.date).toBe(raw.navAsOf);
      expect(tail.nav).toBe(raw.nav);

      const quote = getNav(id);
      expect(quote.status).toBe("live");
      if (quote.status !== "live") return;
      expect(quote.today).toBe(raw.nav);
      expect(quote.asOf).toBe(raw.navAsOf);
      expect(quote.observations).toBe(points.length);
    },
  );
});

describe("getNav", () => {
  it("returns { status: 'pending' } for an unknown id rather than throwing", () => {
    expect(() => getNav("no-such-scheme")).not.toThrow();
    expect(getNav("no-such-scheme")).toEqual({ status: "pending" });
    expect(getNav("")).toEqual({ status: "pending" });
  });

  it("changePct is measured against the previous published close", () => {
    for (const s of strategies) {
      const q = getNav(s.id);
      if (q.status !== "live") continue;
      if (q.previous === null || q.previous.nav === 0) {
        expect(q.changePct).toBeNull();
        continue;
      }
      const expected = ((q.today - q.previous.nav) / q.previous.nav) * 100;
      expect(q.changePct).toBeCloseTo(expected, 10);
      // `previous` must be the point BEFORE the tail, not the tail itself
      const points = navHistory(s.id);
      expect(q.previous.date).toBe(points[points.length - 2].date);
    }
  });
});

/**
 * DATA_MIGRATION.md calls this trap absolute: a couple of schemes are priced
 * off a face value ~100x the rest, so they are not "performing a hundred times
 * better" — absolute NAV is meaningless across schemes.
 */
describe("face-value invariant", () => {
  const navs = rawSchemes.map((s) => s.nav);
  const min = Math.min(...navs);
  const max = Math.max(...navs);

  it("the data really does span two face values", () => {
    // If this ever stops being true the guard below stops guarding anything,
    // so fail loudly rather than passing vacuously.
    expect(max / min).toBeGreaterThan(50);
    expect(navs.filter((n) => n > min * 50).length).toBeGreaterThanOrEqual(2);
  });

  it("liveQuotes() is name-ordered, NOT ranked by absolute NAV", () => {
    const quotes = liveQuotes();
    expect(quotes.length).toBeGreaterThan(1);

    const names = quotes.map((q) => q.strategy.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const ordered = quotes.map((q) => q.nav.today);
    const descending = [...ordered].sort((a, b) => b - a);
    const ascending = [...ordered].sort((a, b) => a - b);
    expect(ordered).not.toEqual(descending);
    expect(ordered).not.toEqual(ascending);
  });

  it("the high-face-value schemes are not at either end of the default order", () => {
    // A ranking or a bar scale keyed on absolute NAV would push them to an
    // extreme; in a name-ordered list they sit somewhere in the middle.
    const quotes = liveQuotes();
    const outliers = quotes
      .map((q, i) => ({ i, nav: q.nav.today }))
      .filter((q) => q.nav > min * 50)
      .map((q) => q.i);
    expect(outliers.length).toBeGreaterThan(0);
    for (const i of outliers) {
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(quotes.length - 1);
    }
  });
});
