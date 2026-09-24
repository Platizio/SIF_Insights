import type { Metadata } from "next";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/primitives";
import { AumIntelligence } from "@/components/tracker/AumIntelligence";
import { nfoItems, strategyDefs, trackerRows } from "@/components/tracker/data";
import { LatestNavs } from "@/components/tracker/LatestNavs";
import { MarketSnapshot } from "@/components/tracker/MarketSnapshot";
import { NfoSection } from "@/components/tracker/NfoSection";
import { HeatmapSection, TopPerformersSection } from "@/components/tracker/Performance";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";
import { SITE } from "@/lib/site";

/* ============================================================
   /sif-tracker — the market-monitoring view (PRD p.22–29).

   Snapshot → NFOs → Top performers → Heatmap → AUM → Latest NAVs,
   with the anchors lib/nav.ts links to. Performance is the centre;
   NFOs, AUM and NAVs are the context around it. Every section is a
   server component; the filters, sorts and the NFO clock are the
   only islands, and each receives plain props from
   components/tracker/data.ts rather than touching lib/data.

   The old comparison table (./TrackerTable) is no longer rendered
   here; the Screener carries that job.
   ============================================================ */

const DESCRIPTION = `Track India’s Specialised Investment Fund market in one place — Live and Upcoming NFOs, performance, AUM, strategy trends and latest NAVs across ${stats.strategyCount} SIFs from ${stats.amcCount} asset managers.`;

/* `openGraph` repeats siteName/locale/type because Next merges metadata
   shallowly: declaring the key replaces the root layout's block. The image
   is restated for the same reason — declaring `openGraph` drops the one the
   file convention contributes. */
export const metadata: Metadata = {
  title: "SIF Tracker",
  description: DESCRIPTION,
  alternates: { canonical: "/sif-tracker" },
  openGraph: {
    title: "SIF Tracker — India’s SIF market in one place",
    description: DESCRIPTION,
    url: "/sif-tracker",
    images: "/opengraph-image.png",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

export default function SifTrackerPage() {
  const rows = trackerRows();
  const strategies = strategyDefs();
  const offers = nfoItems();

  return (
    <>
      <PageHeader
        eyebrow="SIF Tracker"
        lines={["SIF Tracker"]}
        standfirst="Track India’s Specialised Investment Fund market in one place — from Live and Upcoming NFOs to performance, AUM, strategy trends and latest NAVs across SIFs."
      />

      <MarketSnapshot
        nfoWindows={offers.map((o) => ({ active: o.active, opensOn: o.opensOn, closesOn: o.closesOn }))}
      />
      <NfoSection items={offers} />
      <TopPerformersSection rows={rows} strategies={strategies} />
      <HeatmapSection rows={rows} strategies={strategies} />
      <AumIntelligence />
      <LatestNavs />

      <ConsultCta
        lines={["Seen the market.", "Now talk it through."]}
        body="A tracker shows what is happening across SIFs; it cannot tell you what suits your goals, horizon or risk comfort. Tell us those and we will walk you through the strategies and the scheme documents behind them — the decision stays yours."
      />

      <Shell className="-mt-12 pb-[100px]">
        <p className="max-w-[80ch] text-[13px] leading-[20px] text-muted">
          SIF Insight is a distributor of Mutual Funds and Specialised Investment Funds, not an
          investment adviser or an AMC. Rankings, heatmaps and totals on this page describe
          historical data only and are not recommendations. Risk bands are as stated in each
          scheme&apos;s documents and may change. NAV data fetched from AMFI, as of{" "}
          {formatUpdated(navLastUpdated)}.
        </p>
      </Shell>
    </>
  );
}
