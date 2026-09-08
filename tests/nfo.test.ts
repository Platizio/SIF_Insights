/**
 * `isOpenNfo` — the only place on the site that asserts liveness.
 *
 * `active` on its own is a hand-set flag with no expiry, which is how three NFO
 * windows that closed in January stayed under a pulsing "Live NFO" label for
 * seven months. The rule is now: active AND a stated closing date that has not
 * passed, inclusive of the closing date itself.
 */
import { describe, expect, it } from "vitest";

import { activeNfos, isOpenNfo, type Nfo } from "@/lib/data";

import { rawNfos } from "./raw-source";

const base: Nfo = { id: 1, title: "Test NFO", date: "2026-01-01", active: true };
const today = new Date("2026-03-15T00:00:00Z");

describe("isOpenNfo", () => {
  it("is false for an entry with no closesOn — an absence is not evidence", () => {
    expect(isOpenNfo({ ...base }, today)).toBe(false);
    expect(isOpenNfo({ ...base, closesOn: undefined }, today)).toBe(false);
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

  it("is false when active is false, however future the close date", () => {
    expect(
      isOpenNfo({ ...base, active: false, closesOn: "2027-01-01" }, today),
    ).toBe(false);
    expect(isOpenNfo({ ...base, active: false, closesOn: "2026-03-15" }, today)).toBe(
      false,
    );
  });

  it("compares in UTC, so a late-evening local clock cannot shift the answer", () => {
    const lateInTheDay = new Date("2026-03-15T23:59:59Z");
    expect(isOpenNfo({ ...base, closesOn: "2026-03-15" }, lateInTheDay)).toBe(true);
    const justAfter = new Date("2026-03-16T00:00:00Z");
    expect(isOpenNfo({ ...base, closesOn: "2026-03-15" }, justAfter)).toBe(false);
  });
});

describe("activeNfos", () => {
  it("contains only entries isOpenNfo accepts", () => {
    for (const n of activeNfos) expect(isOpenNfo(n)).toBe(true);
  });

  it("never promotes a raw entry that lacks a closing date", () => {
    const undated = rawNfos.filter((n) => !n.closesOn).map((n) => n.id);
    for (const id of undated) {
      expect(activeNfos.some((n) => n.id === id)).toBe(false);
    }
  });
});
