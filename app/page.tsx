import { Hero } from "@/components/sections/Hero";
import { AmcMarquee } from "@/components/sections/AmcMarquee";
import { CategoryComparison } from "@/components/sections/CategoryComparison";
import { NavBoard } from "@/components/sections/NavBoard";
import { StrategyGrid } from "@/components/sections/StrategyGrid";
import { NumbersBand } from "@/components/sections/NumbersBand";
import { TrustLoop } from "@/components/sections/TrustLoop";
import { Faq } from "@/components/sections/Faq";
import { ClosingCta } from "@/components/sections/ClosingCta";

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
