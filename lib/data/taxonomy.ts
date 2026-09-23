import type { Category, StrategySlug } from "./types";

/* ============================================================
   Taxonomy: SEBI's seven strategies, and benchmark names.

   Both exist because the raw strings cannot be filtered on as they
   stand. schemes.json spells a mandate the way AMFI's feed does, and
   disclosures.json spells a benchmark the way each ISID does — the
   same Nifty 500 TRI arrives in several spellings, so a filter built
   on the raw text would offer the reader four "different" indices
   that are one index.
   ============================================================ */

/**
 * SEBI's seven SIF investment strategies, in the circular's order (27 Feb
 * 2025). All seven are listed even while some have no scheme — a strategy
 * with nothing filed renders inert, because the gap is information.
 */
export const SEBI_STRATEGIES: { slug: StrategySlug; label: string; category: Category }[] = [
  { slug: "equity-long-short", label: "Equity Long-Short", category: "equity" },
  {
    slug: "equity-ex-top-100-long-short",
    label: "Equity Ex-Top 100 Long-Short",
    category: "equity",
  },
  { slug: "sector-rotation-long-short", label: "Sector Rotation Long-Short", category: "equity" },
  { slug: "hybrid-long-short", label: "Hybrid Long-Short", category: "hybrid" },
  {
    slug: "active-asset-allocator-long-short",
    label: "Active Asset Allocator Long-Short",
    category: "hybrid",
  },
  { slug: "debt-long-short", label: "Debt Long-Short", category: "debt" },
  { slug: "sectoral-debt-long-short", label: "Sectoral Debt Long-Short", category: "debt" },
];

const STRATEGY_BY_SLUG = new Map(SEBI_STRATEGIES.map((s) => [s.slug, s]));

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The SEBI strategy a mandate string names, or null.
 *
 * Tolerant of the spacing the AMFI feed uses in scheme names ("Ex- Top 100
 * Long - Short"): punctuation and whitespace collapse before matching, so any
 * spelling that differs only in those resolves. An unknown mandate returns
 * null rather than the nearest match — a new SEBI strategy must be added to
 * the list above, not guessed into an old one.
 */
export function strategySlug(type: string): StrategySlug | null {
  const slug = slugify(type) as StrategySlug;
  return STRATEGY_BY_SLUG.has(slug) ? slug : null;
}

export function strategyLabel(slug: StrategySlug): string {
  return STRATEGY_BY_SLUG.get(slug)?.label ?? slug;
}

/* ============================================================
   Benchmarks
   ============================================================ */

/**
 * The indices the ISIDs name, and how to recognise each through its
 * spellings. Matched against a normalised key (see `benchmarkKey`), in order —
 * the hybrid composite goes first because it CONTAINS "nifty 50".
 *
 * `tri` marks an equity index whose total-return variant is the one named.
 * Every equity benchmark on file today names the TRI; an ISID that names the
 * price index would resolve to the plain id instead, never be folded into the
 * TRI one — they are different series. The hybrid composites carry no flag:
 * they are built from a total-return equity leg and a debt index, with no
 * separate price variant, so "(Total Return Index)" after one is a
 * restatement, not a second series.
 */
const INDICES: { id: string; label: string; test: RegExp; tri?: boolean }[] = [
  {
    id: "nifty-50-hybrid-composite-debt-50-50",
    label: "Nifty 50 Hybrid Composite Debt 50:50 Index",
    test: /\bnifty 50 hybrid composite debt 50 ?: ?50\b/,
  },
  {
    id: "crisil-hybrid-50-50-moderate",
    label: "CRISIL Hybrid 50+50 – Moderate Index",
    test: /\bcrisil hybrid 50 ?\+ ?50\b.*\bmoderate\b/,
  },
  {
    id: "crisil-hybrid-85-15-conservative",
    label: "CRISIL Hybrid 85+15 – Conservative Index",
    test: /\bcrisil hybrid 85 ?\+ ?15\b.*\bconservative\b/,
  },
  { id: "nifty-500", label: "Nifty 500", test: /\bnifty 500\b/, tri: true },
  { id: "nifty-200", label: "Nifty 200", test: /\bnifty 200\b/, tri: true },
  { id: "nifty-50", label: "Nifty 50", test: /\bnifty 50\b/, tri: true },
  { id: "bse-500", label: "BSE 500", test: /\bbse 500\b/, tri: true },
];

/**
 * The text reduced to what identifies the index: lower case, the ISIDs'
 * "Tier I / Tier II" scaffolding removed, and every way of writing "total
 * return index" folded to the token `tri`.
 */
function benchmarkKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/tier\s*(?:1|i)\s*benchmark\s*:/g, " ")
    .replace(/\((?:[^)]*\btier\b[^)]*)\)/g, " ")
    .replace(/\btotal return index\b|\(\s*tri\s*\)/g, " tri ")
    .replace(/[^a-z0-9+:%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whitespace collapsed, Tier scaffolding stripped — the ISID's words otherwise. */
function cleanLabel(text: string): string {
  return text
    .replace(/^\s*tier\s*(?:1|i)\s*benchmark\s*:\s*/i, "")
    .replace(/\s*\((?:[^)]*\btier\b[^)]*)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One canonical id and label per index, however the ISID spells it.
 *
 * A BLEND ("25% BSE SENSEX TRI + 60% CRISIL …") is its own benchmark — no
 * other scheme shares it — so it keeps its own words as the label and gets an
 * id derived from them. Anything unrecognised likewise keeps its own words
 * rather than being dropped: an unmatched benchmark is still a benchmark the
 * reader can filter on, and tests/taxonomy.test.ts fails on it so the list
 * above gets extended rather than silently bypassed.
 */
export function normaliseBenchmark(text: string | null): { id: string; label: string } | null {
  if (text === null || text.trim() === "") return null;

  const label = cleanLabel(text);
  if (/^\s*\d+(?:\.\d+)?\s*%/.test(label)) {
    return { id: `blend-${slugify(benchmarkKey(label))}`, label };
  }

  const key = benchmarkKey(text);
  for (const index of INDICES) {
    if (!index.test.test(key)) continue;
    if (index.tri && /\btri\b/.test(key)) {
      return { id: `${index.id}-tri`, label: `${index.label} TRI` };
    }
    return { id: index.id, label: index.label };
  }
  return { id: `other-${slugify(key)}`, label };
}
