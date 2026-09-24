import { riskBandNumber } from "@/lib/format";

import { amcAum, schemeAum } from "./aum";
import {
  amcById,
  hasFullDisclosures,
  navLastUpdated,
  strategies,
  strategyById,
  strategyByCode,
} from "./core";
import { currentTer, exitLoadParsed, liquidityBucket } from "./costs";
import { daysBetween } from "./dates";
import { faceValue, inception, schemeDocuments, schemeFacts } from "./facts";
import { getNav, navHistory } from "./nav";
import { maxDrawdown, monthlyReturns, trailingReturn, volatility } from "./returns";
import { normaliseBenchmark, strategyLabel, strategySlug } from "./taxonomy";
import {
  PERIODS,
  type Cell,
  type Period,
  type ReturnResult,
  type SifRow,
  type Strategy,
} from "./types";

/* ============================================================
   SifRow — every metric for one scheme, as plain serialisable values.

   The Tracker, Screener, Compare and /sif/[id] all read this one
   shape, built here on the server and passed to client islands as
   props. That is the other half of the client-bundle rule: an
   island that needs a 6M return or a drawdown receives the number,
   not the module that computes it from the NAV history.

   Every absent value is a `Cell` carrying its reason, never a 0, a
   placeholder or a borrowed neighbour — the page turns the reason
   into one of the three fixed phrases.
   ============================================================ */

/** A scheme younger than this is `recent` rather than `live`. */
const RECENT_DAYS = 90;

/** The name without its plan/option suffix — "… Fund - Regular Plan - Growth" → "… Fund". */
function shortNameOf(name: string, brand: string): string {
  const cut = name.match(/^(.*?\b(?:fund|sif))\b/i)?.[1] ?? name;
  /* The feed spaces hyphens inconsistently ("Ex- Top 100 Long - Short"); the
     short form is a display label, so it reads them the one way. */
  const tidy = cut.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
  if (tidy !== tidy.toUpperCase()) return tidy;

  /* A name AMFI publishes in capitals is title-cased — except the brand,
     which keeps the house's own casing ("INFINITY"). */
  const brandWord = brand.split(" ")[0];
  return tidy
    .split(" ")
    .map((word) =>
      word.toUpperCase() === brandWord.toUpperCase()
        ? brandWord
        : word
            .split("-")
            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
            .join("-"),
    )
    .join(" ");
}

function returnCell(r: ReturnResult): Cell<number> {
  return r.status === "ok" ? { v: r.pct } : { absent: r.status };
}

function buildRow(s: Strategy): SifRow {
  const amc = amcById.get(s.amcId);
  const facts = schemeFacts(s.amfiSchemeCode);
  const nav = getNav(s.id);
  const slug = strategySlug(s.type);
  const bench = normaliseBenchmark(s.benchmark);
  const began = inception(s.id);
  const ageDays = began ? daysBetween(began.date, navLastUpdated) : null;

  const returns = {} as SifRow["returns"];
  const returnsMeta = {} as SifRow["returnsMeta"];
  for (const p of PERIODS as readonly Period[]) {
    const r = trailingReturn(s.id, p);
    returns[p] = returnCell(r);
    returnsMeta[p] =
      r.status === "ok"
        ? { from: r.from.date, to: r.to.date, annualised: r.annualised, basis: r.basis }
        : {};
  }

  const vol = volatility(s.id);
  const mdd = maxDrawdown(s.id);
  const aum = schemeAum(s.amfiSchemeCode);
  const house = amcAum(s.amcId);
  const ter = currentTer(s.amfiSchemeCode);
  const documents = schemeDocuments(s.amfiSchemeCode);
  const brand = amc?.sifName ?? s.amcId;
  const face = faceValue(s.id);

  return {
    id: s.id,
    code: s.amfiSchemeCode,
    name: s.name,
    shortName: shortNameOf(s.name, brand),
    amcId: s.amcId,
    amcName: amc?.name ?? s.amcId,
    brand,
    logo: amc?.logo ?? null,

    category: s.category,
    strategy: slug,
    strategyLabel: slug ? strategyLabel(slug) : s.type,
    type: s.type,

    /* NaN only for a scheme whose feed row carries no NAV (none today) —
       every consumer tests Number.isFinite before printing it. */
    nav: nav.status === "live" ? nav.today : Number.NaN,
    navAsOf: nav.status === "live" ? nav.asOf : (navHistory(s.id).at(-1)?.date ?? ""),
    faceValue: face.value,
    faceValueBasis: face.basis,

    returns,
    returnsMeta,
    monthly: monthlyReturns(s.id),

    volatility: vol ? { v: vol.pct } : { absent: "insufficient-history" },
    maxDrawdown: mdd ? { v: mdd.pct } : { absent: "insufficient-history" },

    riskBand: riskBandNumber(s.riskBand),
    benchmark: bench?.label ?? null,
    benchmarkId: bench?.id ?? null,
    benchmarkText: s.benchmark,

    aumCr: aum ? { v: aum.cr } : { absent: "not-captured" },
    aumAsOf: aum?.asOf ?? null,
    /* A partial sum is not the house's AUM, so it is not offered as one. */
    amcAumCr: house?.complete ? { v: house.cr } : { absent: "not-captured" },

    ter: ter ? { v: ter.pct } : { absent: "not-captured" },
    terAsOf: ter?.asOf ?? null,
    ber: ter && ter.berPct !== null ? { v: ter.berPct } : { absent: "not-captured" },
    terMax:
      s.expenseRatio !== null && s.expenseRatioIsCap === true
        ? { v: s.expenseRatio }
        : { absent: "not-captured" },

    exitLoad: exitLoadParsed(s),

    liquidity: liquidityBucket(s.redemptionFrequency),
    redemptionText: s.redemptionFrequency,
    subscriptionText: facts.subscription?.value.text ?? null,
    subscriptionBucket: facts.subscription?.value.bucket ?? null,

    minInvestment: s.minInvestment,
    minAdditional: facts.minAdditional?.value ?? null,
    options: facts.options?.value ?? [],

    managers: facts.fundManagers?.value.map((m) => m.name) ?? [],
    inception: began,
    ageDays,
    status: ageDays !== null && ageDays <= RECENT_DAYS ? "recent" : "live",

    taxation: s.taxation,
    dividend: s.dividend,
    objective: facts.objective?.value ?? null,

    disclosures: {
      captured: s.disclosuresCaptured,
      full: hasFullDisclosures(s),
      factsheet: documents.some((d) => d.kind === "factsheet"),
      portfolio: documents.some((d) => d.kind === "portfolio"),
      sid: documents.some((d) => d.kind === "SID" || d.kind === "ISID"),
    },
    documents,
  };
}

let rows: SifRow[] | null = null;

/**
 * One row per scheme, in `strategies` order. Built once per process and
 * shared — treat the result as read-only.
 */
export function buildSifRows(): SifRow[] {
  rows ??= strategies.map(buildRow);
  return rows;
}

/** By scheme id, or by AMFI code in any case. */
export function sifRow(id: string): SifRow | undefined {
  const s = strategyById.get(id) ?? strategyByCode.get(id.trim().toUpperCase());
  return s ? buildSifRows().find((r) => r.id === s.id) : undefined;
}

/**
 * Raw `[date, nav]` pairs for up to four schemes, keyed by AMFI code, for the
 * Compare chart to REBASE on the client over a common window. Raw NAV only
 * ever travels to be rebased — plotting it as-is across schemes is the ₹10
 * vs ₹1,000 face-value trap. Codes are matched case-insensitively; unknown
 * codes and duplicates are dropped, and anything past the fourth is ignored.
 */
export function compareSeries(codes: string[]): Record<string, [string, number][]> {
  const out: Record<string, [string, number][]> = {};
  for (const raw of codes) {
    const s = strategyByCode.get(raw.trim().toUpperCase());
    if (!s || s.amfiSchemeCode in out) continue;
    if (Object.keys(out).length >= 4) break;
    out[s.amfiSchemeCode] = navHistory(s.id).map((p) => [p.date, p.nav]);
  }
  return out;
}
