import { Rise } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { formatUpdated, navLastUpdated } from "@/lib/data";

import type { NfoItem } from "./model";
import { NfoList } from "./NfoList";
import { SectionHead } from "./SectionHead";

/* ============================================================
   Live NFOs and Upcoming SIFs — where the snapshot's two NFO
   tiles land (#live-nfos, #upcoming). One section, two anchors.

   Open offers take the wider column: they are the ones a reader can
   act on today. Both lists re-derive on the client (NfoList), and
   both state plainly when they are empty rather than disappearing.
   ============================================================ */

export function NfoSection({ items }: { items: NfoItem[] }) {
  const fallbackLabel = formatUpdated(navLastUpdated);

  return (
    <Section id="live-nfos">
      <Shell>
        <SectionHead
          eyebrow="New fund offers"
          lines={["Live NFOs and", "upcoming SIFs."]}
          copy="Offers open for subscription now, and SIF launches announced but not yet open — each with its window, minimum investment and the document it was read from."
        />

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <Rise>
            <h3 className="text-[15px] leading-[22px] text-ink">Live NFOs</h3>
            <p className="mb-5 mt-1 text-[13px] leading-[20px] text-muted">Open for subscription today</p>
            <NfoList
              items={items}
              kind="open"
              fallbackIso={navLastUpdated}
              fallbackLabel={fallbackLabel}
            />
          </Rise>

          <div id="upcoming" className="scroll-mt-24">
            <Rise delay={0.08}>
              <h3 className="text-[15px] leading-[22px] text-ink">Upcoming SIFs</h3>
              <p className="mb-5 mt-1 text-[13px] leading-[20px] text-muted">Announced, not yet open</p>
              <NfoList
                items={items}
                kind="upcoming"
                fallbackIso={navLastUpdated}
                fallbackLabel={fallbackLabel}
              />
            </Rise>
          </div>
        </div>
      </Shell>
    </Section>
  );
}
