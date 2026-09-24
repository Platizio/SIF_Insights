import type { SifRow } from "@/lib/data/types";

import { filterKind, getField, isoDay, type Field, type FilterValue, type ScreenState } from "./fields";

/* ============================================================
   The filter engine.

   AND across fields, OR within a set, range bounds inclusive. The
   interesting part is the missing value, because most of this
   dataset is young: a 6M filter meets eleven schemes with six months
   of history and twenty-two without. Those twenty-two are not "below
   5%" — we do not know — so they are EXCLUDED by an active filter,
   and COUNTED, so the page can say so ("4 SIFs hidden — 6M return:
   N/A, insufficient history · Show them") instead of silently
   shrinking the list. `includeMissing` (the URL's `nulls=1`) is the
   "Show them".

   Pure; client-safe (type-only data imports).
   ============================================================ */

/** Case, accents, hyphens and punctuation folded away: "Long-Short" matches "long short". */
export function normaliseSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Name, AMC, brand, strategy and managers — what a reader types to find a fund. */
function haystack(r: SifRow): string {
  return normaliseSearch(
    [r.name, r.shortName, r.amcName, r.brand, r.strategyLabel, r.type, ...r.managers].join(" "),
  );
}

/**
 * Every word of the query appears somewhere in the haystack — or, with the
 * spaces taken out of both, the whole query does, so "longshort" and
 * "long-short" find the same funds.
 */
export function matchesQuery(r: SifRow, q: string): boolean {
  const query = normaliseSearch(q);
  if (!query) return true;
  const hay = haystack(r);
  return (
    query.split(" ").every((word) => hay.includes(word)) ||
    hay.replace(/ /g, "").includes(query.replace(/ /g, ""))
  );
}

type Verdict = "pass" | "fail" | "missing";

function isMissing(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    (typeof v === "number" && !Number.isFinite(v)) ||
    (Array.isArray(v) && v.length === 0)
  );
}

function judge(field: Field, value: FilterValue, r: SifRow): Verdict {
  const v = field.get(r);
  if (isMissing(v)) return "missing";

  if (value.t === "set") {
    const have = Array.isArray(v) ? v : [String(v)];
    return have.some((id) => value.ids.includes(id)) ? "pass" : "fail";
  }
  if (value.t === "flag") return v === value.v ? "pass" : "fail";

  const n = field.kind === "date" ? isoDay(String(v)) : (v as number);
  if (n === null) return "missing";
  if (value.min !== null && n < value.min) return "fail";
  if (value.max !== null && n > value.max) return "fail";
  return "pass";
}

export type FilterResult = {
  rows: SifRow[];
  /**
   * Per active field: rows that would be shown but for a MISSING value of
   * that field. A row missing two filtered fields counts under both.
   */
  hiddenByMissing: Record<string, number>;
  /** Distinct rows hidden only by missing values — what "Show them" brings back. */
  hiddenTotal: number;
};

/**
 * Apply a screen's search and filters. A filter on an unknown or planned
 * field, or one of the wrong shape for its field, is ignored — the URL codec
 * already drops those, and a stale state object must not blank the table.
 * A row that FAILS any filter on a value it has is simply out; only rows
 * that pass everything they can be judged on are counted as hidden.
 */
export function filterRows(
  rows: SifRow[],
  state: Pick<ScreenState, "q" | "filters" | "includeMissing">,
): FilterResult {
  const active: [string, Field, FilterValue][] = [];
  for (const [id, value] of Object.entries(state.filters)) {
    const field = getField(id);
    if (field && filterKind(field) === value.t) active.push([id, field, value]);
  }

  const kept: SifRow[] = [];
  const hiddenByMissing: Record<string, number> = {};
  let hiddenTotal = 0;

  for (const r of rows) {
    if (!matchesQuery(r, state.q)) continue;

    const missing: string[] = [];
    let failed = false;
    for (const [id, field, value] of active) {
      const verdict = judge(field, value, r);
      if (verdict === "fail") {
        failed = true;
        break;
      }
      if (verdict === "missing") missing.push(id);
    }
    if (failed) continue;

    if (missing.length === 0 || state.includeMissing) {
      kept.push(r);
      continue;
    }
    hiddenTotal += 1;
    for (const id of missing) hiddenByMissing[id] = (hiddenByMissing[id] ?? 0) + 1;
  }

  return { rows: kept, hiddenByMissing, hiddenTotal };
}
