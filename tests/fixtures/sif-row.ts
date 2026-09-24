/**
 * A synthetic SifRow, for the screener engine tests.
 *
 * The engines are pure functions of rows, so they are tested on rows built to
 * hit each case exactly — a missing 6M return, a tie, a boundary value —
 * rather than on the live dataset, whose values the nightly NAV run moves.
 * Every field starts "absent" or empty; a case sets only what it is about.
 */
import { PERIODS, type Cell, type Period, type SifRow } from "@/lib/data/types";

const NONE: Cell<number> = { absent: "not-captured" };

export function makeRow(
  overrides: Partial<Omit<SifRow, "returns">> & { returns?: Partial<Record<Period, Cell<number>>> },
): SifRow {
  const { returns, ...rest } = overrides;
  const code = rest.code ?? "SIF-1";
  return {
    id: code.toLowerCase(),
    code,
    name: `${code} Fund`,
    shortName: `${code} Fund`,
    amcId: "amc",
    amcName: "AMC Mutual Fund",
    brand: "AMC SIF",
    logo: null,
    category: "equity",
    strategy: "equity-long-short",
    strategyLabel: "Equity Long-Short",
    type: "Equity Long-Short",
    nav: 10,
    navAsOf: "2026-09-22",
    faceValue: 10,
    faceValueBasis: "inferred",
    returns: Object.fromEntries(
      PERIODS.map((p) => [p, returns?.[p] ?? { absent: "insufficient-history" }]),
    ) as SifRow["returns"],
    returnsMeta: Object.fromEntries(PERIODS.map((p) => [p, {}])) as SifRow["returnsMeta"],
    monthly: [],
    volatility: { absent: "insufficient-history" },
    maxDrawdown: { absent: "insufficient-history" },
    riskBand: null,
    benchmark: null,
    benchmarkId: null,
    benchmarkText: null,
    aumCr: NONE,
    aumAsOf: null,
    amcAumCr: NONE,
    amcAumAsOf: null,
    ter: NONE,
    terAsOf: null,
    ber: NONE,
    terMax: NONE,
    exitLoad: { applicable: null, pct: null, periodDays: null, tiered: false, text: null },
    liquidity: null,
    redemptionText: null,
    subscriptionText: null,
    subscriptionBucket: null,
    minInvestment: null,
    minAdditional: null,
    options: [],
    managers: [],
    inception: null,
    ageDays: null,
    status: "live",
    taxation: null,
    dividend: null,
    objective: null,
    disclosures: { captured: false, full: false, factsheet: false, portfolio: false, sid: false },
    documents: [],
    ...rest,
  };
}
