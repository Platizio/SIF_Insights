import type { Absent, Nfo, NfoStatus, Period } from "@/lib/data/types";

/* ============================================================
   Client-safe formatting and pure derivations.

   Everything here takes plain values and returns plain values — no
   JSON, no data-layer imports, nothing that reads a clock. That is
   the whole reason the module exists: these used to live in
   lib/data/index.ts, so a client island that only wanted
   `formatPct` value-imported the module that holds the full NAV
   history, and every page shipped it. `lib/data` re-exports all of
   them, so server code keeps importing from there unchanged.

   Only type imports from `@/lib/data/types` are allowed here —
   tests/client-imports.test.ts enforces it.
   ============================================================ */

/* ============================================================
   Money and prices — Indian numbering, tabular-safe
   ============================================================ */

/** The lakh/crore mantissa, at the precision `formatInr` documents below. */
function compactRupees(mantissa: number, unit: "L" | "Cr"): string {
  return `₹${mantissa.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit}`;
}

/**
 * A rupee figure in Indian grouping — ₹10,00,000. `compact` renders the
 * lakh/crore shorthand instead — ₹12.35 L, ₹1.25 Cr.
 *
 * DECIMALS ARE BOUNDED AT TWO, and that bound is the reason the option is
 * still here. Unbounded, `1_234_567` rendered "₹12.34567 L" — one character
 * LONGER than the ₹12,34,567 it was shortening, which is the one thing a
 * compact form must never be. Two places is not an arbitrary pick either:
 * `formatPct` and `formatExpense` already fix every inexact number on this
 * site at two, so the compact form reuses that policy rather than inventing a
 * third. Trailing zeros are dropped, so an exact ten lakh still reads "₹10 L"
 * rather than "₹10.00 L", and the mantissa itself goes through en-IN grouping
 * so a four-figure crore reads "₹1,000 Cr". (A figure within ₹500 of a crore
 * rounds to "₹100 L" rather than promoting to "₹1 Cr" — accepted, because
 * nothing that needs the boundary read exactly should be compacting it.)
 *
 * The shorthand belongs to a large APPROXIMATE quantity — an AUM, a chart
 * axis. It does not belong on a disclosed term an investor has to meet to the
 * rupee, which is why every minimum investment on the site prints in full.
 * AUM, which is held in crore already, has its own `formatCr` below.
 */
export function formatInr(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) {
    if (value >= 10_000_000) return compactRupees(value / 10_000_000, "Cr");
    if (value >= 100_000) return compactRupees(value / 100_000, "L");
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

/**
 * An amount already held in ₹ crore — AUM — in Indian grouping: "₹12,345 Cr".
 *
 * Separate from `formatInr({ compact })` because the unit is the input's, not
 * a choice made at render: aum.json stores crore (AMFI and every factsheet
 * publish it that way), and multiplying back to rupees only to divide again
 * invites a lakh/crore slip. Precision follows the magnitude — whole crore
 * from ₹1,000 Cr up, where a decimal is noise on a month-end figure, and up
 * to two places below it, where a small new scheme's ₹84.5 Cr would otherwise
 * round to a different claim. Trailing zeros are dropped.
 */
export function formatCr(cr: number): string {
  const digits = Math.abs(cr) >= 1000 ? 0 : 2;
  return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: digits })} Cr`;
}

/** NAVs carry up to 4 decimals in the feed; preserve what is published. */
export function formatNav(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}`;
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/**
 * An expense ratio, shown for what it actually is.
 *
 * ISIDs quote the MAXIMUM permissible TER, not the ratio a scheme currently
 * charges — the charged figure is published on the AMC's own site and moves.
 * Printing a cap as a bare percentage would state a fee the investor may not
 * be paying, so a known cap renders as a ceiling.
 *
 * `isCap` null means we do not know which the figure is (it predates the ISID
 * reads), and an unknown must not be dressed up as either.
 */
export function formatExpense(
  ratio: number | null,
  isCap: boolean | null,
): string | null {
  if (ratio === null) return null;
  const pct = `${ratio.toFixed(2)}%`;
  return isCap ? `Up to ${pct}` : pct;
}

/** "Risk Band 5" -> 5. Null when the scheme's band is not captured. */
export function riskBandNumber(riskBand: string | null): number | null {
  if (!riskBand) return null;
  const match = riskBand.match(/\d+/);
  const n = match ? Number(match[0]) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/* ============================================================
   Dates
   ============================================================ */

export function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-08" -> "Aug 2026". UTC, so the month cannot slip with the reader's zone. */
export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "15 days", "1 day". Indian grouping, so a 1,095-day lock reads as one. */
export function formatDays(days: number): string {
  return `${days.toLocaleString("en-IN")} ${Math.abs(days) === 1 ? "day" : "days"}`;
}

/* ============================================================
   Missing values — the only three phrases the site may print
   ============================================================ */

/**
 * The fixed text for each reason a value is missing.
 *
 * `withheld` deliberately borrows the insufficient-history phrase rather than
 * minting a fourth: the data contract allows exactly three missing-value
 * texts, and a scheme younger than the compliance age threshold IS, for
 * disclosure purposes, one without enough history to show.
 */
export const ABSENT_LABEL: Record<Absent, string> = {
  "insufficient-history": "N/A — Insufficient history",
  "not-captured": "Not captured",
  "not-applicable": "Not applicable",
  withheld: "N/A — Insufficient history",
};

export function absentLabel(reason: Absent): string {
  return ABSENT_LABEL[reason];
}

/* ============================================================
   Heatmap grade
   ============================================================ */

/**
 * Upper bounds of grades 1–3 by period; anything at or beyond the last bound
 * is grade 4. Short periods move less, so a flat reading on a day is not the
 * same size as a flat reading on a month — one scale for both would paint
 * every 1D cell pale and every 6M cell dark.
 */
const HEAT_BOUNDS_SHORT = [0.25, 1, 2.5] as const;
const HEAT_BOUNDS_LONG = [1, 3, 7] as const;

/**
 * A return's heatmap grade, −4..4, 0 = flat.
 *
 * The magnitude bands are half-open — [0, a) is 1, [a, b) is 2, [b, c) is 3,
 * [c, ∞) is 4 — with a/b/c = 0.25/1/2.5 for 1D and 1W and 1/3/7 for every
 * longer period. Zero is reserved for an exactly unchanged value, the same
 * test `formatPct` uses to drop the sign: a cell that prints "+0.00%" is a
 * (tiny) gain and grades +1, so the colour never contradicts the printed
 * sign. The grade is decoration on top of that printed signed figure, never
 * a replacement for it — colour alone must not carry gain or loss.
 */
export function heatGrade(pct: number, period: Period): number {
  if (!Number.isFinite(pct) || pct === 0) return 0;
  const bounds = period === "1D" || period === "1W" ? HEAT_BOUNDS_SHORT : HEAT_BOUNDS_LONG;
  const size = Math.abs(pct);
  let grade = 4;
  for (let i = 0; i < bounds.length; i++) {
    if (size < bounds[i]) {
      grade = i + 1;
      break;
    }
  }
  return pct > 0 ? grade : -grade;
}

/* ============================================================
   NFO window — pure date logic

   Here rather than in lib/data/nfo.ts because the client ticker has
   to re-run it against the reader's clock: a statically built page
   can sit open across a closing date. lib/data re-exports both, so
   server code imports them from there as before.

   All comparisons are on ISO date strings in UTC, so the answer
   cannot shift by a day with the reader's timezone. Both ends of a
   window are inclusive: an offer open "to 30 Jan" is open ON 30 Jan.
   ============================================================ */

/**
 * Where an offer stands on `today` (ISO date).
 *
 *  - `active: false` is the hand-set "withdrawn / done" flag → closed.
 *  - An open date in the future → upcoming.
 *  - Active with neither date → upcoming: announced, window not yet stated.
 *  - opensOn ≤ today ≤ closesOn (a missing opensOn counts as already open)
 *    → open.
 *  - Past its closing date → closed.
 *  - Opened but with no stated close → closed. It cannot be called open —
 *    an offer with no stated end is exactly the claim we cannot verify — and
 *    it is not upcoming either, since it has already opened. Closed is the
 *    one state that asserts nothing to the reader.
 */
export function nfoStatus(
  n: Pick<Nfo, "active" | "opensOn" | "closesOn">,
  today: string,
): NfoStatus {
  if (!n.active) return "closed";
  if (n.opensOn && n.opensOn > today) return "upcoming";
  if (!n.opensOn && !n.closesOn) return "upcoming";
  if (n.closesOn && n.closesOn >= today) return "open";
  return "closed";
}

/**
 * Is this offer still open on `today`?
 *
 * `active` alone is a hand-set flag with NO expiry, which is how three NFO
 * windows that closed in January stayed on the ticker under a "Live NFO"
 * label for seven months. An entry must also carry a `closesOn` that has not
 * passed — and, when it states one, an `opensOn` that has arrived: an
 * announced offer is not a live one.
 *
 * A missing `closesOn` returns false rather than true. An offer with no stated
 * end date is not evidence that it is open — it is an absence, and the ticker
 * is the one surface on this site that asserts liveness.
 *
 * Defined through `nfoStatus` so the two can never disagree.
 */
export function isOpenNfo(
  nfo: Pick<Nfo, "active" | "opensOn" | "closesOn">,
  today: Date = new Date(),
): boolean {
  return nfoStatus(nfo, today.toISOString().slice(0, 10)) === "open";
}
