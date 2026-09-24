import type { MetadataRoute } from "next";
import { amcs, navLastUpdated, strategies, strategiesByCategory } from "@/lib/data";
import { SITE } from "@/lib/site";

/* ============================================================
   /sitemap.xml

   This site is new, sits in a SEBI fund category that did not exist
   before 2025, and has essentially no backlink graph. A submitted
   sitemap is the only realistic way for a crawler to find the pages
   it would otherwise have to stumble into.

   Two rules govern what is in here:

   1. Nothing is hard-coded that the data already knows. The AMC routes
      come from `amcs` and the SIF product pages from `strategies` — the
      same expressions their routes feed to generateStaticParams — so the
      sitemap and the prerender list cannot drift when a house or a scheme
      is added. The strategy-category routes come from the keys of
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

   RETIRED, and absent on purpose: /nav-tracker and /media. Both now 308
   (next.config.ts), and a sitemap entry that redirects is an entry for a
   page that is not there. Query-string states (/sif-screener?…,
   /compare?ids=…) are not listed either: each page canonicalises to its
   bare path, which is what is listed.
   ============================================================ */

/** Absolute, because sitemap entries must be. From lib/site.ts, the one
    place the origin is written — see the `www` note there. */
const ORIGIN = SITE.origin;

/**
 * Routes that render nothing out of the NAV dataset. They get no
 * `lastModified` rather than a date we cannot source.
 */
const EDITORIAL_PATHS = [
  "/learn",
  "/downloads",
  "/methodology",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/regulatory-disclosures",
];

/**
 * Routes whose visible figures are counted from the NAV dataset, so a
 * NAV refresh genuinely changes what they say.
 *
 * `/` reaches the data through its section components; `/about` and
 * `/contact` through `stats`, which is derived from the same source.
 */
const DATA_BACKED_PATHS = [
  "",
  "/about",
  "/what-is-sif",
  "/strategies",
  "/sif-tracker",
  "/sif-screener",
  "/compare",
  "/amc",
  "/contact",
  ...Object.keys(strategiesByCategory).map((c) => `/strategies/${c}`),
  ...amcs.map((amc) => `/amc/${amc.id}`),
  ...strategies.map((s) => `/sif/${s.id}`),
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
