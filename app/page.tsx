import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { AmcMarquee } from "@/components/sections/AmcMarquee";
import { WhatIsSif } from "@/components/sections/WhatIsSif";
import { VideoLibrary } from "@/components/sections/VideoLibrary";
import { WhyUs } from "@/components/sections/WhyUs";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { LeadPopup } from "@/components/leads/LeadPopup";

/* ============================================================
   Homepage metadata.

   NO `title` HERE, DELIBERATELY: `title.default` in app/layout.tsx IS the
   homepage title, and a `title` string here would become the route's own
   title (a layout's `title.template` does not apply to a page in the SAME
   segment — see node_modules/next/dist/docs/01-app/03-api-reference/
   04-functions/generate-metadata.md).

   `alternates` is withheld from app/layout.tsx on purpose — inherited, it
   would point every route's canonical at "/" — so each route declares its
   own, and this is the homepage's.

   `openGraph` REPLACES the layout's rather than merging into it (Next
   merges metadata shallowly), so every field is restated. `images` most of
   all: declaring an `openGraph` block drops the image the root
   app/opengraph-image.png convention contributes, and a card with no image
   silently downgrades twitter:card to `summary`.
   ============================================================ */
const DESCRIPTION =
  "SIF Insight brings India’s Specialised Investment Fund ecosystem together — connecting AMCs, fund managers, experts and investors on one platform. Research, track and compare SIFs, and access expert insights to make more informed investment decisions.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "SIF Insight — Understand, track and compare India's SIFs",
    description: DESCRIPTION,
    url: "/",
    images: "/opengraph-image",
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
};

/* Chrome — ticker, header, <main> and footer — lives in app/layout.tsx so
   every route inherits it. Pages render sections only. Order per PRD p.16:
   brand → SIFs we offer → what/why SIF → video library → why SIF Insight →
   final consultation CTA (footer is global). */

export default function Home() {
  return (
    <>
      <Hero />
      <AmcMarquee />
      <WhatIsSif />
      <VideoLibrary />
      <WhyUs />
      <ClosingCta />
      {/* PRD p.8: the contact prompt after 15 s, on the homepage only. It
          renders nothing on the server and nothing until its timer fires. */}
      <LeadPopup />
    </>
  );
}
