import type { ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";
import { Odometer } from "@/components/motion/Odometer";
import { Rise } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { cn } from "@/lib/cn";
import { formatCr, formatMonth, formatUpdated, industryAum, navLastUpdated, stats } from "@/lib/data";

import type { NfoItem } from "./model";
import { NfoStat } from "./NfoStat";
import { StatBody, STAT_FIGURE } from "./stat";

/* ============================================================
   1 · SIF Market Snapshot (PRD p.22–23)

   Seven market numbers in two ledger bands: the size of the market
   first, then what is moving in it. Every figure is interpolated
   from `stats` / `industryAum()`, and every one carries its own
   dated line — the NAV file's date for counts, the month-end for
   AUM. The two NFO tiles are the only ones that re-derive on the
   client (see NfoStat), and they link down to the offers.
   ============================================================ */

const TILE = "relative border-b border-r border-hairline p-5 sm:p-8";

export function MarketSnapshot({ nfoWindows }: { nfoWindows: Pick<NfoItem, "active" | "opensOn" | "closesOn">[] }) {
  const navDate = formatUpdated(navLastUpdated);
  const navAsOf = <AsOf date={navDate} iso={navLastUpdated} />;
  const aum = industryAum();

  return (
    <Section id="snapshot" className="pt-0">
      <Shell>
        <Rise>
          <h2 className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
            SIF Market Snapshot
          </h2>
        </Rise>

        <Rise delay={0.05}>
          <ul className="mt-8 grid grid-cols-2 border-l border-t border-hairline lg:grid-cols-4">
            <li className={TILE}>
              <StatBody figure={<Odometer value={stats.strategyCount} />} label="Total SIFs" asOf={navAsOf} />
            </li>
            <li className={TILE}>
              <StatBody figure={<Odometer value={stats.amcCount} />} label="Asset Managers" asOf={navAsOf} />
            </li>
            <li className={TILE}>
              <StatBody
                figure={<Odometer value={stats.strategyTypeCount} />}
                label="Strategy Types"
                asOf={navAsOf}
              />
            </li>
            <li className={TILE}>
              <StatBody
                figure={<Odometer value={stats.fullyDisclosedCount} suffix={` / ${stats.strategyCount}`} />}
                label="Disclosures Captured"
                asOf={navAsOf}
              />
            </li>
          </ul>
        </Rise>

        <Rise delay={0.1}>
          <ul className="grid grid-cols-2 border-l border-hairline lg:grid-cols-[1fr_1fr_2fr]">
            <li className="border-b border-r border-hairline">
              <JumpTile href="#live-nfos" label="See live NFOs">
                <NfoStat
                  windows={nfoWindows}
                  which="open"
                  label="Live NFOs"
                  fallbackIso={navLastUpdated}
                  fallbackLabel={navDate}
                />
              </JumpTile>
            </li>
            <li className="border-b border-r border-hairline">
              <JumpTile href="#upcoming" label="See upcoming SIFs">
                <NfoStat
                  windows={nfoWindows}
                  which="upcoming"
                  label="Upcoming SIFs"
                  fallbackIso={navLastUpdated}
                  fallbackLabel={navDate}
                />
              </JumpTile>
            </li>
            <li className={cn(TILE, "col-span-2 lg:col-span-1")}>
              {aum ? (
                <StatBody
                  figure={formatCr(aum.cr)}
                  label="Total SIF AUM"
                  detail={
                    aum.complete ? undefined : (
                      <>
                        across <span className="tabular">{aum.counted}</span> of{" "}
                        <span className="tabular">{aum.total}</span> SIFs
                      </>
                    )
                  }
                  asOf={<AsOf date={`${formatMonth(aum.asOf.slice(0, 7))} month-end`} iso={aum.asOf} />}
                />
              ) : (
                <StatBody
                  figure={<NotCaptured className={cn(STAT_FIGURE, "font-sans text-muted")} />}
                  label="Total SIF AUM"
                  asOf={navAsOf}
                />
              )}
            </li>
          </ul>
        </Rise>
      </Shell>
    </Section>
  );
}

/** A tile that jumps to its section below. The whole tile is the target. */
function JumpTile({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group relative block h-full p-5 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2 sm:p-8"
    >
      {children}
      <span className="sr-only"> — {label}</span>
      <span
        aria-hidden="true"
        className="absolute right-5 top-5 text-accent transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 sm:right-8 sm:top-8"
      >
        <ArrowIcon size={18} />
      </span>
    </a>
  );
}
