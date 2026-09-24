import { industryAum, schemeAum } from "./aum";
import { amcs, hasFullDisclosures, mandates, strategies, strategiesByCategory } from "./core";
import { earliestNavDate, getNav, navHistory, navObservationCount } from "./nav";
import { activeNfos, upcomingNfos } from "./nfo";
import { strategySlug } from "./taxonomy";

/* ============================================================
   Derived counts — every figure on the site traces to here.

   Nothing in this object is typed by hand except the two SEBI
   constants at the end. A count that appears in copy is
   interpolated from here, so a new filing changes the sentence the
   day it lands in the feed instead of leaving a stale literal behind.
   ============================================================ */

const aum = industryAum();

export const stats = {
  amcCount: amcs.length,
  strategyCount: strategies.length,
  equityCount: strategiesByCategory.equity.length,
  hybridCount: strategiesByCategory.hybrid.length,
  debtCount: strategiesByCategory.debt.length,
  liveNavCount: strategies.filter((s) => getNav(s.id).status === "live").length,
  /**
   * How many schemes have a disclosures entry AT ALL.
   *
   * NOT the same as holding the full set — an entry may still leave individual
   * fields null. Copy that names specific fields must use
   * `fullyDisclosedCount`; this one only supports "we have read a document".
   */
  disclosedCount: strategies.filter((s) => s.disclosuresCaptured).length,
  /**
   * How many hold ALL FOUR fields the summary copy names.
   *
   * `disclosedCount` counts the presence of an entry, which is a weaker claim:
   * a scheme can hold a researched entry and still leave one of these four
   * fields null, so copy promising "risk band, expense, exit load and minimum"
   * over that count overstates what we have. Both counts stay because the gap
   * is the normal state, not a backlog: a scheme is entered from its
   * information document field by field, and any ISID that omits one reopens
   * it. Derived on both sides, so the copy follows the data rather than having
   * to be remembered.
   */
  fullyDisclosedCount: strategies.filter(hasFullDisclosures).length,
  /** Of those, how many a second reader confirmed against the source document. */
  disclosuresVerifiedCount: strategies.filter((s) => s.disclosuresVerified).length,
  mandateCount: mandates.length,
  /** Total published NAVs held across every scheme. */
  navObservations: navObservationCount(),
  /** Schemes with enough history to plot a line (two points or more). */
  chartableCount: strategies.filter((s) => navHistory(s.id).length > 1).length,
  /**
   * Earliest published NAV we hold, across every scheme — or null if we hold
   * no history at all.
   *
   * Nullable on purpose: a feed that arrived with no series would otherwise
   * hand `formatUpdated` an `undefined` and render "Invalid Date" into the page
   * meta — a date-shaped claim about data we do not have.
   */
  navHistoryFrom: earliestNavDate(),

  /** Offers open on `navLastUpdated` — the client ticker re-checks its own clock. */
  openNfoCount: activeNfos.length,
  /** Announced offers not yet open on `navLastUpdated`. */
  upcomingNfoCount: upcomingNfos.length,
  /**
   * Distinct SEBI strategies with at least one live scheme. A mandate string
   * no SEBI strategy matches still counts, once, as its own — an unmapped
   * type must not make the market look narrower than it is.
   */
  strategyTypeCount: new Set(strategies.map((s) => strategySlug(s.type) ?? `type:${s.type}`))
    .size,
  /** Schemes with any verified AUM on file, out of all schemes. */
  aumCoverage: {
    captured: strategies.filter((s) => schemeAum(s.amfiSchemeCode) !== null).length,
    total: strategies.length,
  },
  /** The month-end the industry AUM total is summed over, or null if none is held. */
  aumAsOf: aum?.asOf ?? null,

  minInvestment: 1_000_000,
  maxUnhedgedShortPct: 25,
};
