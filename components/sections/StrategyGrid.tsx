import { amcById, getNav, stats, strategies } from "@/lib/data";

import { StrategyGridClient, type GridCard } from "./StrategyGridClient";

/**
 * The scheme card grid. SERVER wrapper: it resolves each scheme's house and
 * latest quote here and passes the client island only the fields a card
 * prints, so the island's bundle carries no data layer and the RSC payload
 * carries no taxation prose it never renders. See StrategyGridClient.tsx for
 * the grid itself, including what `embedded` suppresses.
 */
export function StrategyGrid({ embedded = false }: { embedded?: boolean }) {
  const cards: GridCard[] = strategies.map((s) => {
    const nav = getNav(s.id);
    return {
      strategy: {
        id: s.id,
        name: s.name,
        category: s.category,
        type: s.type,
        minInvestment: s.minInvestment,
        expenseRatio: s.expenseRatio,
        expenseRatioIsCap: s.expenseRatioIsCap,
        exitLoad: s.exitLoad,
        riskBand: s.riskBand,
        disclosuresCaptured: s.disclosuresCaptured,
      },
      sifName: amcById.get(s.amcId)?.sifName ?? null,
      nav: nav.status === "live" ? { today: nav.today, asOf: nav.asOf } : null,
    };
  });

  return (
    <StrategyGridClient
      embedded={embedded}
      cards={cards}
      counts={{
        all: stats.strategyCount,
        equity: stats.equityCount,
        hybrid: stats.hybridCount,
        debt: stats.debtCount,
        disclosed: stats.disclosedCount,
      }}
    />
  );
}
