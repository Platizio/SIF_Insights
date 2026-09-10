import type { MetadataRoute } from "next";

/* ============================================================
   /robots.txt

   Everything here is crawlable, and that is the whole point: the site is
   30 static pages of public disclosure with no admin area, no login, no
   search or filter URLs that could multiply into a crawl trap, and no
   parameterised routes at all. There is nothing to hide from a crawler
   and no budget to protect from one — so a blanket Allow is correct, and
   any Disallow added later needs to name a route that actually exists.

   The single job this file does beyond that is announce the sitemap.
   Sitemap must be an absolute URL — a relative path is ignored by every
   major crawler — so the origin is repeated here rather than derived.
   ============================================================ */

/** Matches `metadataBase` in app/layout.tsx and `ORIGIN` in app/sitemap.ts
    and app/amc/[id]/page.tsx — four in total, and they move together. `www`
    because the apex 307s to it; see the note in app/layout.tsx. */
const ORIGIN = "https://www.sifinsight.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
