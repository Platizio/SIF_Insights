import {
  SEBI_STRATEGIES,
  amcById,
  buildSifRows,
  formatUpdated,
  navLastUpdated,
  nfoStatus,
  nfos,
  sifRow,
  strategyLabel,
  strategySlug,
  type SifRow,
} from "@/lib/data";

import { trackerRow, type NfoItem, type StrategyDef, type TrackerRow } from "./model";

/* ============================================================
   SERVER ONLY — the props the tracker's islands are built from.

   Everything an island needs from lib/data is shaped here into plain
   serialisable values, so no "use client" file ever imports the data
   layer (tests/client-imports.test.ts). Import this from server
   components only.
   ============================================================ */

/** Every scheme, in the tracker's slim shape. */
export function trackerRows(): TrackerRow[] {
  return buildSifRows().map(trackerRow);
}

/** SEBI's seven strategies, copied so the island owns plain objects. */
export function strategyDefs(): StrategyDef[] {
  return SEBI_STRATEGIES.map((s) => ({ slug: s.slug, label: s.label, category: s.category }));
}

/**
 * Every offer that is open or upcoming on `navLastUpdated`, as the NFO cards
 * print it. The island re-derives status against the reader's clock, so an
 * offer the build saw as upcoming can turn open (or closed) without a
 * rebuild. Offers already closed are dropped here: time only moves forward,
 * so nothing closed on the build's date can be open on a later one.
 */
export function nfoItems(): NfoItem[] {
  return nfos.filter((n) => nfoStatus(n, navLastUpdated) !== "closed").map((n) => {
    const row: SifRow | undefined = n.schemeCode ? sifRow(n.schemeCode) : undefined;
    const amc = n.amcId ? amcById.get(n.amcId) : row ? amcById.get(row.amcId) : undefined;
    const slug = n.strategyType ? strategySlug(n.strategyType) : (row?.strategy ?? null);
    const def = slug ? SEBI_STRATEGIES.find((s) => s.slug === slug) : undefined;
    const source = n.sources?.[0];

    return {
      id: n.id,
      title: n.title,
      active: n.active,
      opensOn: n.opensOn,
      closesOn: n.closesOn,
      opensLabel: n.opensOn ? formatUpdated(n.opensOn) : null,
      closesLabel: n.closesOn ? formatUpdated(n.closesOn) : null,
      schemeName: n.schemeName ?? row?.shortName ?? n.title,
      amc: amc ? { id: amc.id, name: amc.name, sifName: amc.sifName, logo: amc.logo } : null,
      strategy: slug ? strategyLabel(slug) : (n.strategyType ?? row?.strategyLabel ?? null),
      category: n.category ?? def?.category ?? row?.category ?? null,
      minInvestment: n.minInvestment ?? null,
      benchmark: row?.benchmark ?? null,
      source: source ? { url: source.url, publisher: source.publisher, docType: source.docType } : null,
      sifId: row?.id ?? null,
    };
  });
}

/**
 * How the Since Inception column is measured, in words — derived from each
 * row's own basis so the sentence stays true as allotment dates are sourced.
 */
export function sinceInceptionBasis(rows: readonly SifRow[]): string {
  const withSi = rows.filter((r) => r.returnsMeta.SI.basis);
  const fromFace = withSi.filter((r) => r.returnsMeta.SI.basis === "face-value").length;
  const fromNav = withSi.length - fromFace;
  const annualised =
    "annualised only where the history spans a year or more, absolute otherwise";

  if (withSi.length > 0 && fromNav === 0) {
    return `measured from the face value on each SIF's allotment date, ${annualised}`;
  }
  if (fromFace === 0) {
    return `measured from each SIF's first published NAV (allotment dates are not yet captured), ${annualised}`;
  }
  return `measured from the face value on the allotment date for ${fromFace} SIF${
    fromFace === 1 ? "" : "s"
  } whose allotment date is sourced, and from the first published NAV for the other ${fromNav}; ${annualised}`;
}
