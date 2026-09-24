/* ============================================================
   Calendar arithmetic on ISO date strings, in UTC.

   Every date in the data is a bare "YYYY-MM-DD" — a publication
   date, not an instant — so all of this works in whole UTC days.
   A local-time Date would move "2026-03-31" to the 30th for any
   reader west of Greenwich and quietly change which NAV a period
   starts from.

   Internal to lib/data (the barrel does not re-export it).
   ============================================================ */

const DAY_MS = 86_400_000;

/** Whole days since 1970-01-01 (UTC). */
export function epochDay(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
}

export function fromEpochDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** `b` minus `a`, in days. */
export function daysBetween(a: string, b: string): number {
  return epochDay(b) - epochDay(a);
}

export function addDays(iso: string, days: number): string {
  return fromEpochDay(epochDay(iso) + days);
}

/** Days in a month; `month0` is 0-based, as Date.UTC expects. */
function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/**
 * The same day `months` calendar months earlier, clamped to the end of the
 * target month: 31 May − 3M is 28 (or 29) Feb, never 3 March. Clamping, not
 * overflowing, is the convention every published trailing return uses — an
 * overflow would make a "3M" period shorter than three months.
 */
export function minusMonths(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4));
  const m0 = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  const total = y * 12 + m0 - months;
  const ty = Math.floor(total / 12);
  const tm0 = total - ty * 12;
  const day = Math.min(d, daysInMonth(ty, tm0));
  return `${String(ty).padStart(4, "0")}-${String(tm0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2026-08-14" -> "2026-08". */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** "2026-02" -> "2026-02-28". */
export function monthEnd(month: string): string {
  const y = Number(month.slice(0, 4));
  const m0 = Number(month.slice(5, 7)) - 1;
  return `${month}-${String(daysInMonth(y, m0)).padStart(2, "0")}`;
}

/** "2026-01" -> "2025-12". */
export function previousMonth(month: string): string {
  return monthOf(minusMonths(`${month}-01`, 1));
}
