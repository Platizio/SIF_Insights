import terRaw from "./raw/ter.json";

import { resolveSource, type RawSource } from "./source";
import type { ExitLoad, LiquidityBucket, SourceRef, Strategy } from "./types";

/* ============================================================
   Costs and liquidity: exit load, redemption frequency, charged TER.

   The first two are parsed out of the scheme document's own
   sentences, because that is the only form they exist in. The page
   still PRINTS the sentence — "match it, don't restate it" — and the
   parsed shape exists only to bucket, filter and sort on. When the
   parse and the words could disagree, the parse errs toward "has a
   load" / "other": tallying a charging scheme as free, or a weekly
   scheme as daily, is the worse mistake.
   ============================================================ */

/* ============================================================
   Exit load

   A faithful port of `hasNoExitLoad` in app/sif-tracker/TrackerTable.tsx
   (which keeps its private copy until W3 retires that file), plus the
   rate and period the tracker never needed.
   ============================================================ */

/* Any rate the value quotes. A scheme that charges on the way out always
   names the figure — every one on file quotes 0.25%, 0.5%, 1% or 2% — so a
   non-zero rate anywhere in the string is the tell, wherever the sentence
   puts it. Zero is not a charge: "0.00%" is a nil stated in figures. */
const QUOTED_RATE = /(\d+(?:[.]\d+)?)\s*%/g;

/* A clause that states nil OUTRIGHT, with nothing attached. Whole-string,
   because bolting a qualifier on — "Nil after 90 days" — describes a scheme
   that DOES charge, for 90 days. */
const NIL_EXIT_LOAD =
  /^(nil|none|no exit load|nil exit load|not applicable|n\/?a|0([.]0+)?%?)$/;

/** Clause boundaries: `;`, newlines, and a full stop followed by whitespace —
    never the stop inside "0.50%". */
const CLAUSE = /[;\n]+|[.](?=\s|$)/;

/**
 * A nil exit load, however the information document phrases it.
 *
 * The trap is the CONDITIONAL nil, which is the commonest phrasing on file —
 * "1% ... on or before 15 days; Nil after 15 days" DOES carry a load. So a nil
 * has to clear two independent tests:
 *
 *  1. The value quotes no non-zero rate ANYWHERE. This is what a conditional
 *     nil always fails: the clause that charges names its figure. It is
 *     deliberately blunt — SIF-21's "first 10% of units redeemable free" is an
 *     allowance, not a charge, and still reads as one here, which errs toward
 *     "has a load", the safe direction.
 *  2. Its LEADING clause is a bare nil. This is what stops a value that names
 *     no figure — "No exit load after 90 days" — from passing test 1 on a
 *     technicality. A clause that LEADS with the entry load is dropped first —
 *     that is a different charge (SIF-40 states both) — but only when it
 *     leads, so "Nil after 6 months. Entry load: Not Applicable." still fails
 *     as it should.
 *
 * Both together also read "Nil. No exit load is chargeable on switches…"
 * correctly: a bare nil followed by a scope note is still a nil.
 */
function isNilExitLoad(text: string): boolean {
  const rates = text.match(QUOTED_RATE) ?? [];
  if (rates.some((rate) => parseFloat(rate) > 0)) return false;

  const [lead] = text
    .split(CLAUSE)
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0)
    .filter((c) => !/^entry\s*load\b/.test(c) || /exit\s*load/.test(c))
    .map((c) => c.replace(/^exit\s*load\s*[:\-–]\s*/, ""));

  return lead !== undefined && NIL_EXIT_LOAD.test(lead);
}

/* A CHARGED rate: any percentage except an allowance of units ("first 10% of
   units redeemable free"), which is the one place a figure in an exit-load
   sentence is not a fee. */
const CHARGED_RATE = /(\d+(?:[.]\d+)?)\s*%(?!\s*of\s+(?:the\s+)?units)/gi;

const PERIOD = /\b(\d+|one|two|three|six|twelve)\s*(day|month|year)s?\b/gi;
const WORD_NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, twelve: 12 };

/**
 * A period in days. Months are 365/12 days, rounded — so "12 months" and
 * "1 year", which the ISIDs use interchangeably, land on the same 365, and
 * "3 months" is 91 rather than the 90 a flat 30-day month would give. The
 * page prints the document's own words; this number exists to filter and sort.
 */
function periodDays(n: number, unit: string): number {
  if (unit === "day") return n;
  if (unit === "month") return Math.round((n * 365) / 12);
  return n * 365;
}

const NOT_CAPTURED: ExitLoad = {
  applicable: null,
  pct: null,
  periodDays: null,
  tiered: false,
  text: null,
};

/**
 * The scheme's exit load as data: whether one applies, the highest rate, how
 * long it lasts, and whether it steps down.
 *
 * A charging clause is one quoting a non-zero rate; its period is the longest
 * one it names ("after 15 days but on or before 1 month" → 1 month). Across
 * clauses, `pct` is the highest rate and `periodDays` the latest point at
 * which any load still applies — so SIF-13's 0.50%-then-0.25% reads as 0.50%
 * for a month, `tiered`. A load we can tell is charged but cannot read the
 * figures of stays `applicable: true` with null figures, never `false`.
 */
export function exitLoadParsed(s: Pick<Strategy, "exitLoad">): ExitLoad {
  const text = s.exitLoad;
  if (text === null || text.trim() === "") return NOT_CAPTURED;
  if (isNilExitLoad(text)) {
    return { applicable: false, pct: 0, periodDays: 0, tiered: false, text };
  }

  const tiers: { rate: number; days: number | null }[] = [];
  for (const clause of text.split(CLAUSE)) {
    const rates = [...clause.matchAll(CHARGED_RATE)]
      .map((m) => parseFloat(m[1]))
      .filter((r) => r > 0);
    if (rates.length === 0) continue;
    const days = [...clause.matchAll(PERIOD)].map((m) => {
      const raw = m[1].toLowerCase();
      return periodDays(WORD_NUMBER[raw] ?? Number(raw), m[2].toLowerCase());
    });
    tiers.push({ rate: Math.max(...rates), days: days.length ? Math.max(...days) : null });
  }

  if (tiers.length === 0) {
    return { applicable: true, pct: null, periodDays: null, tiered: false, text };
  }
  const periods = tiers.map((t) => t.days).filter((d): d is number => d !== null);
  return {
    applicable: true,
    pct: Math.max(...tiers.map((t) => t.rate)),
    periodDays: periods.length ? Math.max(...periods) : null,
    tiered: new Set(tiers.map((t) => t.rate)).size > 1,
    text,
  };
}

/* ============================================================
   Liquidity — redemption (and subscription) frequency
   ============================================================ */

const WEEKDAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g;

/**
 * A dealing-frequency sentence, bucketed.
 *
 * Read from the LEADING clause — the text before the first bracket, semicolon
 * or full stop — because the ISIDs follow the frequency with processing notes
 * ("requests received after Wednesday 3.00 PM until Monday…") that name
 * weekdays without changing how often you can deal. Order matters: "twice a
 * week" and "two times a week" are checked before any weekday is counted, and
 * a single named weekday ("Every Monday of the week") is weekly. Anything
 * unrecognised is `other` — never guessed into `daily`.
 */
export function liquidityBucket(text: string | null): LiquidityBucket | null {
  if (text === null || text.trim() === "") return null;
  const lead = text.toLowerCase().split(/[(;.]/)[0].trim();

  if (/^daily\b/.test(lead) || /\b(every|all|each) business day\b/.test(lead)) return "daily";
  if (/\b(twice|two times|2 times) a week\b/.test(lead)) return "twice-weekly";
  if (/\bfortnight(ly)?\b|\bevery (two|2) weeks\b/.test(lead)) return "fortnightly";
  if (/\b(once a month|monthly|every month|of (the|each|every) month)\b/.test(lead)) {
    return "monthly";
  }
  if (/\b(once a week|weekly)\b/.test(lead)) return "weekly";

  const days = new Set(lead.match(WEEKDAYS) ?? []);
  if (days.size === 2) return "twice-weekly";
  if (days.size === 1) return "weekly";
  if (/\bdaily\b/.test(lead)) return "daily";
  return "other";
}

/* ============================================================
   Charged TER
   ============================================================ */

type RawTer = {
  asOf: string;
  terPct: number;
  /** Base expense ratio from the same dated row, when the source states it. */
  berPct?: number;
  src: string;
  locator: string;
  verified?: boolean;
};

const terFile = terRaw as {
  sources: Record<string, RawSource>;
  schemes: Record<string, RawTer[]>;
};

/**
 * The TER the Regular plan actually CHARGES, as last disclosed — never the
 * ISID cap, which stays in `Strategy.expenseRatio` and is shown separately.
 * Null when nothing verified is on file.
 *
 * Since 1 April 2026 SEBI's cap applies to the BASE expense ratio only;
 * brokerage, transaction costs and statutory levies are charged on top. So
 * `pct` (the total) routinely exceeds the ISID cap, and `berPct` — the base
 * ratio from the same dated row, when the AMC's file states it — is the
 * figure the cap actually limits. The two are shown side by side, never
 * substituted for each other.
 */
export function currentTer(
  code: string,
): { pct: number; berPct: number | null; asOf: string; source: SourceRef } | null {
  let best: { pct: number; berPct: number | null; asOf: string; source: SourceRef } | null = null;
  for (const t of terFile.schemes[code.toUpperCase()] ?? []) {
    if (t.verified !== true || typeof t.terPct !== "number" || !Number.isFinite(t.terPct)) {
      continue;
    }
    if (t.terPct < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(t.asOf)) continue;
    const source = resolveSource(terFile.sources, t.src);
    if (!source) continue;
    const berPct =
      typeof t.berPct === "number" && Number.isFinite(t.berPct) && t.berPct >= 0 ? t.berPct : null;
    if (!best || t.asOf > best.asOf) best = { pct: t.terPct, berPct, asOf: t.asOf, source };
  }
  return best;
}
