import type { MetadataRoute } from "next";
import { amcs, navLastUpdated, strategiesByCategory } from "@/lib/data";

/* ============================================================
   /sitemap.xml

   This site is new, sits in a SEBI fund category that did not exist
   before 2025, and has essentially no backlink graph. A submitted
   sitemap is the only realistic way for a crawler to find the 30 pages
   it would otherwise have to stumble into.

   Two rules govern what is in here:

   1. Nothing is hard-coded that the data already knows. The 17 AMC
      routes come from `amcs`, which is the same expression
      app/amc/[id]/page.tsx feeds to generateStaticParams — so the
      sitemap and the prerender list cannot drift when an eighteenth
      house files. The three strategy routes come from the keys of
      `strategiesByCategory`, typed `Record<Category, Strategy[]>`, so
      they are locked to the `Category` union rather than retyped here.

   2. `lastModified` is only claimed where it can be sourced. Every
      figure on the data-backed routes comes out of the NAV dataset, so
      they carry `navLastUpdated` — the date the NAV file itself
      asserts. `new Date()` would stamp build time, which says the
      content changed when in fact only the deploy did.

   `changeFrequency` and `priority` are deliberately omitted. Google
   ignores both, and a `priority: 0.8` would be exactly the kind of
   figure this codebase refuses to invent.
   ============================================================ */

/** Absolute, because sitemap entries must be. Matches `metadataBase` in
    app/layout.tsx; app/robots.ts holds the same origin for the same
    reason. If the domain moves, both change. */
const ORIGIN = "https://sifinsight.com";

/**
 * Routes that render nothing out of the NAV dataset — neither page
 * imports `@/lib/data` at all, directly or through a section component.
 * They get no `lastModified` rather than a date we cannot source.
 */
const EDITORIAL_PATHS = ["/media", "/downloads"];

/**
 * Routes whose visible figures are counted from the NAV dataset, so a
 * NAV refresh genuinely changes what they say.
 *
 * `/` reaches the data through its section components (NavBoard,
 * NumbersBand, AmcMarquee, StrategyGrid…); `/about` and `/contact`
 * through `stats`, which is derived from the same source.
 */
const DATA_BACKED_PATHS = [
  "",
  "/about",
  "/what-is-sif",
  "/strategies",
  "/sif-tracker",
  "/nav-tracker",
  "/amc",
  "/contact",
  ...Object.keys(strategiesByCategory).map((c) => `/strategies/${c}`),
  ...amcs.map((amc) => `/amc/${amc.id}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...DATA_BACKED_PATHS.map((p) => ({
      url: `${ORIGIN}${p}`,
      lastModified: navLastUpdated,
    })),
    ...EDITORIAL_PATHS.map((p) => ({ url: `${ORIGIN}${p}` })),
  ];
}
