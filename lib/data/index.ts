/* ============================================================
   lib/data — the barrel.

   SERVER ONLY. Importing a value from here pulls in every raw JSON
   file behind it, NAV history included, so a `"use client"` file
   must never do it (tests/client-imports.test.ts). Client islands
   take serialisable props from a server component, and may import:

     - types           → `import type { … } from "@/lib/data/types"`
     - formatters      → `@/lib/format`
     - screener logic  → `@/lib/screener/*`

   The module map, for finding the thing you want:

     types.ts     every type, PERIODS                 (client-safe)
     core.ts      sources, AMCs, schemes, mandates, FAQs
     nav.ts       the published series and latest quotes
     returns.ts   trailing / monthly returns, volatility, drawdown
     facts.ts     researched scheme facts, face value, inception, documents
     aum.ts       scheme AUM and every total derived from it
     costs.ts     exit load, liquidity bucket, charged TER
     taxonomy.ts  SEBI's seven strategies, benchmark normalisation
     nfo.ts       new fund offers
     rows.ts      SifRow — the one serialisable per-scheme record
     stats.ts     every count the copy interpolates

   source.ts and dates.ts are internal and deliberately not re-exported.
   The formatters live in lib/format.ts and are re-exported here so
   existing server imports keep compiling unchanged.
   ============================================================ */

export * from "./types";
export * from "./core";
export * from "./nav";
export * from "./returns";
export * from "./facts";
export * from "./aum";
export * from "./costs";
export * from "./taxonomy";
export * from "./nfo";
export * from "./rows";
export * from "./stats";
export * from "@/lib/format";
