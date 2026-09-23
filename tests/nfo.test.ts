/**
 * NFO status — the only place on the site that asserts liveness.
 *
 * `active` on its own is a hand-set flag with no expiry, which is how three NFO
 * windows that closed in January stayed under a pulsing "Live NFO" label for
 * seven months. Status is now DERIVED from the dates by `nfoStatus`, and
 * `isOpenNfo` is defined through it: active AND a stated closing date that has
 * not passed AND, when one is stated, an opening date that has arrived — both
 * ends inclusive, compared as UTC calendar dates.
 *
 * The build-time lists are measured against `navLastUpdated`, never the wall
 * clock, so they are recomputed here from the raw file rather than pinned.
 */
import { describe, expect, it } from "vitest";

import {
  activeNfos,
  isOpenNfo,
  navLastUpdated,
  nfoStatus,
  nfos,
  stats,
  upcomingNfos,
  type Nfo,
} from "@/lib/data";

import { rawNfoEntries, rawNfos } from "./raw-source";

const base: Nfo = { id: 1, title: "Test NFO", date: "2026-01-01", active: true };
const today = new Date("2026-03-15T00:00:00Z");
const TODAY = "2026-03-15";

describe("nfoStatus", () => {
  it("is closed whenever the hand-set flag says so, whatever the dates", () => {
    expect(nfoStatus({ ...base, active: false }, TODAY)).toBe("closed");
    expect(
      nfoStatus({ ...base, active: false, opensOn: "2026-03-01", closesOn: "2026-03-31" }, TODAY),
    ).toBe("closed");
    expect(nfoStatus({ ...base, active: false, opensOn: "2026-04-01" }, TODAY)).toBe("closed");
  });

  it("is upcoming before the window opens, and on no date at all", () => {
    expect(nfoStatus({ ...base, opensOn: "2026-03-16", closesOn: "2026-03-30" }, TODAY)).toBe(
      "upcoming",
    );
    expect(nfoStatus({ ...base, opensOn: "2026-04-01" }, TODAY)).toBe("upcoming");
    // Announced, window not stated: upcoming — never open.
    expect(nfoStatus({ ...base }, TODAY)).toBe("upcoming");
  });

  it("is open across the whole window, both ends inclusive", () => {
    const w = { ...base, opensOn: "2026-03-10", closesOn: "2026-03-20" };
    expect(nfoStatus(w, "2026-03-09")).toBe("upcoming");
    expect(nfoStatus(w, "2026-03-10")).toBe("open");
    expect(nfoStatus(w, TODAY)).toBe("open");
    expect(nfoStatus(w, "2026-03-20")).toBe("open");
    expect(nfoStatus(w, "2026-03-21")).toBe("closed");
  });

  it("a one-day window is open on that day only", () => {
    const w = { ...base, opensOn: TODAY, closesOn: TODAY };
    expect(nfoStatus(w, "2026-03-14")).toBe("upcoming");
    expect(nfoStatus(w, TODAY)).toBe("open");
    expect(nfoStatus(w, "2026-03-16")).toBe("closed");
  });

  it("keeps the legacy close-only entries working: no opensOn counts as already open", () => {
    expect(nfoStatus({ ...base, closesOn: "2026-03-15" }, TODAY)).toBe("open");
    expect(nfoStatus({ ...base, closesOn: "2026-03-14" }, TODAY)).toBe("closed");
  });

  it("an opened offer with no stated close is closed — it cannot be asserted open", () => {
    expect(nfoStatus({ ...base, opensOn: "2026-03-01" }, TODAY)).toBe("closed");
  });

  it("moves only forward through the states as the date advances", () => {
    const order = { upcoming: 0, open: 1, closed: 2 } as const;
    const w = { ...base, opensOn: "2026-03-10", closesOn: "2026-03-20" };
    let last = -1;
    for (let d = 1; d <= 31; d++) {
      const s = nfoStatus(w, `2026-03-${String(d).padStart(2, "0")}`);
      expect(order[s]).toBeGreaterThanOrEqual(last);
      last = order[s];
    }
  });
});

describe("isOpenNfo", () => {
  it("is false for an entry with no closesOn — an absence is not evidence", () => {
    expect(isOpenNfo({ ...base }, today)).toBe(false);
    expect(isOpenNfo({ ...base, closesOn: undefined }, today)).toBe(false);
    expect(isOpenNfo({ ...base, opensOn: "2026-03-01" }, today)).toBe(false);
  });

  it("is false for a closesOn in the past", () => {
    expect(isOpenNfo({ ...base, closesOn: "2026-03-14" }, today)).toBe(false);
    expect(isOpenNfo({ ...base, closesOn: "2025-12-31" }, today)).toBe(false);
  });

  it("is true ON the closing date — the window is inclusive", () => {
    expect(isOpenNfo({ ...base, closesOn: "2026-03-15" }, today)).toBe(true);
  });

  it("is true for a closesOn in the future", () => {
    expect(isOpenNfo({ ...base, closesOn: "2026-03-16" }, today)).toBe(true);
    expect(isOpenNfo({ ...base, closesOn: "2027-01-01" }, today)).toBe(true);
  });

  it("is false before a stated opensOn, and true from it — an announced offer is not a live one", () => {
    expect(isOpenNfo({ ...base, opensOn: "2026-03-16", closesOn: "2026-03-30" }, today)).toBe(
      false,
    );
    expect(isOpenNfo({ ...base, opensOn: "2026-03-15", closesOn: "2026-03-30" }, today)).toBe(
      true,
    );
  });

  it("is false when active is false, however future the close date", () => {
    expect(isOpenNfo({ ...base, active: false, closesOn: "2027-01-01" }, today)).toBe(false);
    expect(isOpenNfo({ ...base, active: false, closesOn: "2026-03-15" }, today)).toBe(false);
  });

  it("compares in UTC, so a late-evening local clock cannot shift the answer", () => {
    const lateInTheDay = new Date("2026-03-15T23:59:59Z");
    expect(isOpenNfo({ ...base, closesOn: "2026-03-15" }, lateInTheDay)).toBe(true);
    const justAfter = new Date("2026-03-16T00:00:00Z");
    expect(isOpenNfo({ ...base, closesOn: "2026-03-15" }, justAfter)).toBe(false);
    const justBefore = new Date("2026-03-14T23:59:59Z");
    expect(isOpenNfo({ ...base, opensOn: "2026-03-15", closesOn: "2026-03-20" }, justBefore)).toBe(
      false,
    );
  });

  it("agrees with nfoStatus on every date, for every shape of entry", () => {
    const shapes: Nfo[] = [
      { ...base },
      { ...base, closesOn: "2026-03-15" },
      { ...base, opensOn: "2026-03-10" },
      { ...base, opensOn: "2026-03-10", closesOn: "2026-03-20" },
      { ...base, active: false, opensOn: "2026-03-10", closesOn: "2026-03-20" },
    ];
    for (const n of shapes) {
      for (let d = 1; d <= 31; d++) {
        const iso = `2026-03-${String(d).padStart(2, "0")}`;
        expect(isOpenNfo(n, new Date(`${iso}T12:00:00Z`))).toBe(nfoStatus(n, iso) === "open");
      }
    }
  });
});

describe("the build-time lists", () => {
  it("nfos is every offer in the file — the leading comment is not one", () => {
    expect(nfos.map((n) => n.id)).toEqual(rawNfoEntries.map((n) => n.id));
    expect(nfos.length).toBe(rawNfos.length - 1);
  });

  it("activeNfos is exactly the offers open on navLastUpdated, closing soonest first", () => {
    const expected = rawNfoEntries
      .filter((n) => nfoStatus(n as Nfo, navLastUpdated) === "open")
      .map((n) => n.id);
    expect(activeNfos.map((n) => n.id).sort()).toEqual([...expected].sort());
    const closes = activeNfos.map((n) => n.closesOn ?? "");
    expect(closes).toEqual([...closes].sort());
  });

  it("upcomingNfos is exactly the offers not yet open on navLastUpdated, dated first", () => {
    const expected = rawNfoEntries
      .filter((n) => nfoStatus(n as Nfo, navLastUpdated) === "upcoming")
      .map((n) => n.id);
    expect(upcomingNfos.map((n) => n.id).sort()).toEqual([...expected].sort());
    const dated = upcomingNfos.filter((n) => n.opensOn);
    expect(upcomingNfos.slice(0, dated.length)).toEqual(dated);
    const opens = dated.map((n) => n.opensOn!);
    expect(opens).toEqual([...opens].sort());
  });

  it("an offer is never both open and upcoming", () => {
    for (const n of activeNfos) expect(upcomingNfos).not.toContain(n);
  });

  it("never promotes a raw entry that lacks a closing date to open", () => {
    const undated = rawNfoEntries.filter((n) => !n.closesOn).map((n) => n.id);
    for (const id of undated) {
      expect(activeNfos.some((n) => n.id === id)).toBe(false);
    }
  });

  it("stats counts the same lists the pages render", () => {
    expect(stats.openNfoCount).toBe(activeNfos.length);
    expect(stats.upcomingNfoCount).toBe(upcomingNfos.length);
  });
});
