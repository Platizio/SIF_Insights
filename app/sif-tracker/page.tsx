import type { Metadata } from "next";
import { GlassField } from "@/components/motion/GlassField";
import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rise } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";
import { TrackerTable } from "./TrackerTable";

/* The interactive comparison lives in ./TrackerTable because `metadata`
   is Server-Component-only (next/dist/docs/.../generate-metadata.md), and
   this route needs both a title and client state. */

export const metadata: Metadata = {
  title: "SIF Tracker — every scheme, side by side",
  description: `Filter and compare all ${stats.strategyCount} Specialised Investment Fund schemes from ${stats.amcCount} asset managers across ${stats.mandateCount} mandates — NAV, and for the ${stats.disclosedCount} schemes whose disclosures we hold, risk band, expense ratio, exit load, redemption and taxation, as filed.`,
};

export default function SifTrackerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Compare"
        lines={["Every SIF scheme,", "side by side."]}
        standfirst={
          <>
            All {stats.strategyCount} Specialised Investment Fund schemes from{" "}
            {stats.amcCount} asset managers in one table, each with a live NAV.
            Filter by house, category or mandate across all{" "}
            {stats.strategyCount} — then by risk band, cost, exit load or
            redemption across the {stats.disclosedCount} whose scheme
            information documents we have captured. Put any two side by side.
            Every figure is as filed, and a field we do not hold says so.
          </>
        }
        meta={[
          `${stats.strategyCount} schemes`,
          `${stats.amcCount} asset managers`,
          `${stats.mandateCount} mandates`,
          `Disclosures captured for ${stats.disclosedCount}`,
          `NAV as at ${formatUpdated(navLastUpdated)}`,
        ]}
      />

      <TrackerTable />

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
                  lines={["Compare freely.", "Then talk it through."]}
                  className="mt-4 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.22] text-ink"
                />

                <Rise delay={0.12}>
                  <p className="mt-6 max-w-[54ch] text-[17px] leading-[30px] text-body">
                    A table narrows the field; it cannot tell you what suits
                    your goals, horizon or risk comfort. Tell us those and we
                    will walk you through the disclosures behind each scheme —
                    including the {stats.strategyCount - stats.disclosedCount}{" "}
                    whose documents are not yet in the table.
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
              Investment Funds, not an investment adviser or an AMC. Risk bands
              are indicative and may vary with market conditions and portfolio
              composition. NAV data fetched from AMFI. Updated daily; NAVs as at{" "}
              {formatUpdated(navLastUpdated)}.
            </p>
          </div>
        </Shell>
      </Section>
    </>
  );
}
