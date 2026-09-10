import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { AmcMarquee } from "@/components/sections/AmcMarquee";
import { CategoryComparison } from "@/components/sections/CategoryComparison";
import { NavBoard } from "@/components/sections/NavBoard";
import { StrategyGrid } from "@/components/sections/StrategyGrid";
import { NumbersBand } from "@/components/sections/NumbersBand";
import { TrustLoop } from "@/components/sections/TrustLoop";
import { Faq } from "@/components/sections/Faq";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { stats } from "@/lib/data";

/* ============================================================
   Homepage metadata.

   NO `title` AND NO `description` HERE, DELIBERATELY. This is the one
   route whose text metadata is the layout's: `title.default` in
   app/layout.tsx IS the homepage title, and the `description` beside it
   is written for this page. A page that omits `title` resolves to the
   closest parent's title, which is exactly what is wanted — whereas a
   `title` string here would become the route's own title and change it.
   (`title.template` would not rescue it either: a template in layout.js
   does not apply to a page.js in the SAME route segment. See
   node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
   generate-metadata.md.)

   What IS here is the pair the layout cannot supply.

   `alternates` is withheld from app/layout.tsx on purpose: inherited, it
   would point the canonical of /media, /privacy and the three
   /strategies/* routes at "/" — and a wrong canonical deindexes a page
   where a missing one merely costs it nothing. So every route declares
   its own, and this is the homepage's.

   `openGraph` REPLACES the layout's rather than merging into it — Next
   merges metadata shallowly — so every field the layout set is restated
   below and nothing may be dropped. `images` most of all: declaring an
   `openGraph` block also discards the image the root
   app/opengraph-image.png file convention contributes, and an OG card
   with no image silently downgrades twitter:card from
   summary_large_image to summary. Both counts stay interpolated, for the
   reason app/layout.tsx gives: a literal here would outlive the filing
   that changed it.
   ============================================================ */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "SIF Insight — India's SIF market, in full view",
    description: `Every Specialised Investment Fund in India, independently tracked: ${stats.strategyCount} schemes, ${stats.amcCount} asset managers, NAVs and disclosures as filed.`,
    url: "/",
    images: "/opengraph-image.png",
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
};

/* Chrome — ticker, header, <main> and footer — lives in app/layout.tsx so
   every route inherits it. Pages render sections only. */

export default function Home() {
  return (
    <>
      <Hero />
      <AmcMarquee />
      <CategoryComparison />
      <NavBoard />
      <StrategyGrid />
      <NumbersBand />
      <TrustLoop />
      <Faq />
      <ClosingCta />
    </>
  );
}
