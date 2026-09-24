import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/* ============================================================
   /robots.txt

   Everything here is crawlable. The site is static pages of public
   disclosure with no admin area and no login, so there is nothing to hide
   from a crawler — a blanket Allow is correct, and any Disallow added
   later needs to name a route that actually exists.

   Parameterised URLs DO exist now, and are left crawlable on purpose.
   The screener keeps its filters in the query string
   (/sif-screener?cat=equity&r6m=5~…) and Compare its selection
   (/compare?ids=SIF-3,SIF-21), so both can be shared. That is a
   potential crawl trap in principle, and it is contained without robots:
     · the screener writes its state with history.replaceState rather
       than linking to it, so there is no lattice of filter links for a
       crawler to walk;
     · each of the two pages canonicalises to its bare path (their own
       `alternates.canonical`), so a combination a crawler does meet
       folds back into the one URL that is indexed.
   A `Disallow: /*?` would be the wrong tool — it stops the crawler
   fetching those URLs at all, so it never reads the canonical that
   de-duplicates them.

   The single job this file does beyond that is announce the sitemap.
   Sitemap must be an absolute URL — a relative path is ignored by every
   major crawler — hence the origin from lib/site.ts.
   ============================================================ */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.origin}/sitemap.xml`,
  };
}
