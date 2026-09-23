import aumRaw from "./raw/aum.json";

import { strategies } from "./core";
import { monthEnd } from "./dates";
import { resolveSource, type RawSource } from "./source";
import { SEBI_STRATEGIES, strategySlug } from "./taxonomy";
import type { SourceRef, StrategySlug } from "./types";

/* ============================================================
   Assets under management — scheme level, and every total derived.

   aum.json holds MONTH-END scheme AUM in ₹ crore and nothing else.
   Totals are never stored, because a stored total is a second claim
   that can disagree with the rows it sums. Every total here is summed
   over ONE month — the month the most schemes report — and says how
   many schemes it counts out of how many exist, so "₹X Cr" can never
   quietly mean "₹X Cr for the nine houses we happened to read". A sum
   across different months would add August to July and call it
   neither.
   ============================================================ */

type RawAum = { month: string; aumCr: number; src: string; locator: string; verified?: boolean };

const aumFile = aumRaw as {
  sources: Record<string, RawSource>;
  schemes: Record<string, RawAum[]>;
};

type AumPoint = { month: string; cr: number; source: SourceRef };

/** Verified, well-formed entries per code, newest month first. */
const byCode: ReadonlyMap<string, AumPoint[]> = new Map(
  Object.entries(aumFile.schemes).map(([code, entries]) => [
    code.toUpperCase(),
    (entries ?? [])
      .flatMap((e): AumPoint[] => {
        if (e.verified !== true || !/^\d{4}-\d{2}$/.test(e.month)) return [];
        if (typeof e.aumCr !== "number" || !Number.isFinite(e.aumCr) || e.aumCr < 0) return [];
        const source = resolveSource(aumFile.sources, e.src);
        return source ? [{ month: e.month, cr: e.aumCr, source }] : [];
      })
      .sort((a, b) => b.month.localeCompare(a.month))
      /* One figure per month. A duplicate would be summed twice by every
         total below; tests/raw-facts.test.ts rejects it at the source. */
      .filter((p, i, all) => i === 0 || all[i - 1].month !== p.month),
  ]),
);

/**
 * A scheme's latest month-end AUM. `asOf` is that month's last day.
 * Null when nothing verified is on file.
 */
export function schemeAum(code: string): { cr: number; asOf: string; source: SourceRef } | null {
  const latest = byCode.get(code.toUpperCase())?.[0];
  return latest ? { cr: latest.cr, asOf: monthEnd(latest.month), source: latest.source } : null;
}

type Total = { cr: number; asOf: string; counted: number; total: number; complete: boolean };

/**
 * The month with the most reporting schemes among `codes` — the latest such
 * month on a tie — and the sum over it. Choosing by coverage rather than
 * recency is deliberate: the first scheme researched for a new month must
 * not turn a 33-scheme total into a 1-scheme one.
 */
function totalOver(codes: string[]): (Total & { month: string }) | null {
  const perMonth = new Map<string, { cr: number; counted: number }>();
  for (const code of codes) {
    for (const p of byCode.get(code.toUpperCase()) ?? []) {
      const m = perMonth.get(p.month) ?? { cr: 0, counted: 0 };
      m.cr += p.cr;
      m.counted += 1;
      perMonth.set(p.month, m);
    }
  }
  let best: { month: string; cr: number; counted: number } | null = null;
  for (const [month, m] of perMonth) {
    if (
      !best ||
      m.counted > best.counted ||
      (m.counted === best.counted && month > best.month)
    ) {
      best = { month, ...m };
    }
  }
  if (!best) return null;
  return {
    month: best.month,
    cr: best.cr,
    asOf: monthEnd(best.month),
    counted: best.counted,
    total: codes.length,
    complete: best.counted === codes.length,
  };
}

const ALL_CODES = strategies.map((s) => s.amfiSchemeCode);

/** One house's SIF AUM, over its own best-covered month. */
export function amcAum(amcId: string): Total | null {
  const codes = strategies.filter((s) => s.amcId === amcId).map((s) => s.amfiSchemeCode);
  if (codes.length === 0) return null;
  const t = totalOver(codes);
  return t && { cr: t.cr, asOf: t.asOf, counted: t.counted, total: t.total, complete: t.complete };
}

/** Every SIF's AUM, over the best-covered month. */
export function industryAum(): Total | null {
  const t = totalOver(ALL_CODES);
  return t && { cr: t.cr, asOf: t.asOf, counted: t.counted, total: t.total, complete: t.complete };
}

/**
 * AUM split by SEBI strategy, over the SAME month `industryAum` uses, so the
 * slices sum to the industry figure rather than to something near it.
 * Strategies with nothing reported that month are omitted; largest first.
 */
export function aumByStrategy(): {
  strategy: StrategySlug;
  label: string;
  cr: number;
  schemes: number;
  asOf: string;
}[] {
  const industry = totalOver(ALL_CODES);
  if (!industry) return [];

  return SEBI_STRATEGIES.map(({ slug, label }) => {
    let cr = 0;
    let schemes = 0;
    for (const s of strategies) {
      if (strategySlug(s.type) !== slug) continue;
      const point = byCode.get(s.amfiSchemeCode.toUpperCase())?.find(
        (p) => p.month === industry.month,
      );
      if (!point) continue;
      cr += point.cr;
      schemes += 1;
    }
    return { strategy: slug, label, cr, schemes, asOf: industry.asOf };
  })
    .filter((row) => row.schemes > 0)
    .sort((a, b) => b.cr - a.cr);
}
