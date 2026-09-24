import Link from "next/link";
import { Rise } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { buildSifRows, formatUpdated, navLastUpdated } from "@/lib/data";

import { sinceInceptionBasis } from "./data";
import { Heatmap } from "./Heatmap";
import type { StrategyDef, TrackerRow } from "./model";
import { SectionHead } from "./SectionHead";
import { TopPerformers } from "./TopPerformers";

/* ============================================================
   The two performance sections — server frames around the two
   islands. Headings, dates and compliance copy render here; the
   islands own only the filters and the table.
   ============================================================ */

type Props = { rows: TrackerRow[]; strategies: StrategyDef[] };

const returnsAsOf = () => <AsOf iso={navLastUpdated} format={formatUpdated} />;

export function TopPerformersSection({ rows, strategies }: Props) {
  return (
    <Section id="top-performers">
      <Shell>
        <SectionHead
          eyebrow="Performance"
          lines={["Top Performing SIFs"]}
          copy="View SIF performance and filter by category, strategy and time period."
          aside={returnsAsOf()}
        />
        <Rise delay={0.05} className="mt-10">
          <TopPerformers rows={rows} strategies={strategies} asOfLabel={formatUpdated(navLastUpdated)} />
        </Rise>
      </Shell>
    </Section>
  );
}

export function HeatmapSection({ rows, strategies }: Props) {
  return (
    <Section id="performance">
      <Shell>
        <SectionHead
          eyebrow="Performance heatmap"
          lines={["SIF Performance", "Heatmap"]}
          copy="Every SIF across seven periods at once, shaded by the size and direction of its return, with its AMC, strategy and risk band alongside."
          aside={returnsAsOf()}
        />
        <Rise delay={0.05} className="mt-10">
          <Heatmap rows={rows} strategies={strategies} asOfLabel={formatUpdated(navLastUpdated)} />
        </Rise>
        <Rise>
          <div className="mt-6 max-w-[80ch] space-y-2 text-[13px] leading-[20px] text-muted">
            <p>{PAST_PERFORMANCE_NOTE}</p>
            <p>
              Returns under 1 year are absolute; 1 year and above are annualised (CAGR). Since
              Inception: {sinceInceptionBasis(buildSifRows())}.{" "}
              <Link
                href="/methodology"
                className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current"
              >
                Methodology →
              </Link>
            </p>
          </div>
        </Rise>
      </Shell>
    </Section>
  );
}
