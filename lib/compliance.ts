/* ============================================================
   Compliance copy and thresholds — one place, so a wording change
   signed off by compliance is a one-line diff rather than a sweep.

   Client-safe: constants only, no imports.

   Everything here is PENDING SIGN-OFF (Vividh Sir) — see the PR
   checklist. The strings are the ones the PRD and the plan specify;
   do not paraphrase them at the point of use, import them.
   ============================================================ */

/**
 * Schemes younger than this many days have their performance withheld —
 * `trailingReturn` returns `{ status: "withheld" }` for them.
 *
 * 0 = show everything we can compute. Compliance sets the real figure; it is
 * a constant here rather than a literal inside the returns engine so that
 * decision is visible and reviewable on its own.
 */
export const PERFORMANCE_MIN_AGE_DAYS = 0;

/** Wherever returns are ranked or compared: Top 5, heatmap, Compare, the SIF page. */
export const PAST_PERFORMANCE_NOTE =
  "Past performance may or may not be sustained in the future. Returns shown are historical, for the selected period, and are not an indication or guarantee of future returns or a recommendation.";

/** Compare, when the selected SIFs do not share one investment strategy. */
export const MIXED_STRATEGY_NOTE =
  "These SIFs follow different investment strategies. Performance and risk metrics should be interpreted in the context of their respective investment objectives and benchmarks.";

/**
 * Phrases the site must never print about itself or a fund. Checked by the
 * static-HTML verifier. Matched case-insensitively.
 *
 * "Live NFO" is NOT here: it is allowed as a subscription status. "Live NAV"
 * is — a NAV is published once a day, so it is the latest, never live.
 */
export const BANNED_COPY: string[] = [
  "Live NAV",
  "real-time",
  "Updated daily",
  "best SIF",
  "winner",
  "recommended",
  "safest",
  "better fund",
];

export const FOOTER_DISCLAIMER_SHORT =
  "Investments in SIFs are subject to market risks. Please read all applicable scheme-related documents carefully before investing. Past performance may or may not be sustained in the future. SIF Insight does not guarantee investment returns or future performance.";
