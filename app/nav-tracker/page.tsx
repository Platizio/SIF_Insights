import type { Metadata } from "next";
import { GlassField } from "@/components/motion/GlassField";
import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rise } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { NavBoard } from "@/components/sections/NavBoard";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";
import { NavExplorer } from "./NavExplorer";

/* The fund selector holds client state, and `metadata` is Server-Component
   only, so the interactive half lives in ./NavExplorer — the split Next
   prescribes in next/dist/docs/.../generate-metadata.md. */

/** Counted, never asserted — 17 of the 30 schemes carry no disclosures. */
const notCaptured = stats.strategyCount - stats.disclosedCount;

export const metadata: Metadata = {
  title: "NAV tracker — net asset value, as filed",
  description: `One AMFI-published net asset value for each of India's ${stats.strategyCount} Specialised Investment Fund schemes, with its observation date and source.`,
};

export default function NavTrackerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Live NAV"
        lines={["Net asset value,", "as filed."]}
        standfirst={
          <>
            Every SIF scheme’s net asset value exactly as filed with AMFI — no
            modelled prices, no interpolated history. We hold{" "}
            {stats.navObservations.toLocaleString("en-IN")} published NAVs
            across the {stats.strategyCount} schemes, each one a figure AMFI
            filed on its date, so every scheme is shown as a dated series rather
            than a single number.
          </>
        }
        meta={[
          "Source: AMFI",
          `Updated ${formatUpdated(navLastUpdated)}`,
          `${stats.liveNavCount} of ${stats.strategyCount} schemes priced`,
          `Series from ${formatUpdated(stats.navHistoryFrom)}`,
        ]}
      />

      <NavExplorer />

      {/* The full board, not a rebuild of it. `embedded` suppresses its own
          eyebrow and heading — the PageHeader above already carries both. */}
      <NavBoard embedded />

      <Section className="relative isolate overflow-x-clip">
        <Shell>
          <div className="border border-hairline bg-accent-wash p-8 sm:p-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <Rise>
                  <Eyebrow>Consult</Eyebrow>
                </Rise>

                <LineReveal
                  as="h2"
                  lines={["NAV is one number.", "Fit is the question."]}
                  className="mt-4 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.22] text-ink"
                />

                <Rise delay={0.12}>
                  <p className="mt-6 max-w-[54ch] text-[17px] leading-[30px] text-body">
                    A single net asset value tells you very little about whether
                    a scheme suits you — and for {notCaptured} of the{" "}
                    {stats.strategyCount} schemes the disclosures behind it are
                    not yet captured. Tell us your goals, horizon and risk
                    comfort and we will walk you through what is on file.
                  </p>
                </Rise>
              </div>

              <Rise delay={0.2} className="relative isolate lg:justify-self-end">
                <GlassField />
                <Magnetic className="inline-block">
                  <Button href="/contact" variant="primary">
                    Book a consultation
                  </Button>
                </Magnetic>
              </Rise>
            </div>

            <p className="mt-10 max-w-[70ch] text-[14px] leading-[20px] text-muted">
              SIF Insight is a distributor of Mutual Funds and Specialised
              Investment Funds, not an investment adviser or an AMC. A published
              net asset value is a point-in-time valuation, not a forecast of
              future value.
            </p>
          </div>
        </Shell>
      </Section>
    </>
  );
}
