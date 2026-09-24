import {
  amcAum,
  amcById,
  buildSifRows,
  currentTer,
  maxDrawdown,
  navHistory,
  schemeAum,
  schemeFacts,
  sifRow,
  strategyById,
  trailingReturn,
  volatility,
  PERIODS,
  type Amc,
  type NavPoint,
  type Period,
  type ReturnResult,
  type SchemeFacts,
  type SifRow,
  type Strategy,
} from "@/lib/data";
import disclosuresRaw from "@/lib/data/raw/disclosures.json";

/* ============================================================
   Everything /sif/[id] renders, gathered once on the server.

   SERVER ONLY — this file value-imports the data layer. The one
   client island on the page (the NAV chart's period switch)
   receives this scheme's own points as a prop and nothing else,
   so no other scheme's history ever reaches the browser.

   `SifRow` carries every metric as a plain value; the page also
   needs the few things a row deliberately drops — the citation
   behind each researched fact, the dates a drawdown ran between,
   the date an absent return would have had to reach back to —
   so those are read here beside it rather than widening the row.
   ============================================================ */

export type SifDetail = {
  row: SifRow;
  strategy: Strategy;
  amc: Amc | undefined;
  facts: SchemeFacts;
  /** This scheme's published NAVs, oldest first. */
  points: NavPoint[];
  /** The engine's own results — `needsFrom` survives here, not on the row. */
  returns: Record<Period, ReturnResult>;
  volatility: ReturnType<typeof volatility>;
  drawdown: ReturnType<typeof maxDrawdown>;
  ter: ReturnType<typeof currentTer>;
  aum: ReturnType<typeof schemeAum>;
  houseAum: ReturnType<typeof amcAum>;
  /** Every scheme of the same house, this one included, in feed order. */
  siblings: SifRow[];
  /**
   * Which copy of the scheme document the disclosure fields were read from,
   * in the researcher's own words (e.g. "ISID/KIM, independently re-read").
   * Null when no disclosure entry is held or it names no copy.
   */
  verifiedAgainst: string | null;
};

const disclosureEntries = (disclosuresRaw as {
  disclosures: Record<string, { verifiedAgainst?: unknown }>;
}).disclosures;

function verifiedAgainstOf(code: string): string | null {
  const v = disclosureEntries[code]?.verifiedAgainst;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export function sifDetail(id: string): SifDetail | null {
  const strategy = strategyById.get(id);
  const row = strategy ? sifRow(strategy.id) : undefined;
  if (!strategy || !row) return null;

  const returns = {} as Record<Period, ReturnResult>;
  for (const p of PERIODS) returns[p] = trailingReturn(strategy.id, p);

  return {
    row,
    strategy,
    amc: amcById.get(strategy.amcId),
    facts: schemeFacts(strategy.amfiSchemeCode),
    points: navHistory(strategy.id),
    returns,
    volatility: volatility(strategy.id),
    drawdown: maxDrawdown(strategy.id),
    ter: currentTer(strategy.amfiSchemeCode),
    aum: schemeAum(strategy.amfiSchemeCode),
    houseAum: amcAum(strategy.amcId),
    siblings: buildSifRows().filter((r) => r.amcId === strategy.amcId),
    verifiedAgainst: verifiedAgainstOf(strategy.amfiSchemeCode),
  };
}
