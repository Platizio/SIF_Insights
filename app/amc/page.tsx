import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { ConsultCta } from "@/components/ConsultCta";
import { AmcMark } from "@/components/AmcMark";
import { PageHeader } from "@/components/PageHeader";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import {
  amcs,
  formatUpdated,
  getNav,
  navLastUpdated,
  stats,
  strategies,
  type Amc,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Asset managers",
  description: `The ${stats.amcCount} asset managers running Specialised Investment Funds in India, the SIF sub-brand each files under, and how many of their ${stats.strategyCount} schemes we hold the disclosure set for.`,
};

/* ============================================================
   Coverage, counted from the strategy list.

   Nothing on this page asserts a total — every figure is derived,
   including the gaps. Every scheme now carries a NAV, so the gap
   worth rendering is no longer price: it is DISCLOSURE. AMFI's feed
   publishes scheme code, ISIN, name, category and NAV and nothing
   else, so minimum / expense / exit load / risk band exist only for
   the schemes whose information documents we have actually read.
   ============================================================ */

type House = {
  amc: Amc;
  total: number;
  equity: number;
  hybrid: number;
  live: number;
  disclosed: number;
};

const houses: House[] = amcs.map((amc) => {
  const own = strategies.filter((s) => s.amcId === amc.id);
  return {
    amc,
    total: own.length,
    equity: own.filter((s) => s.category === "equity").length,
    hybrid: own.filter((s) => s.category === "hybrid").length,
    live: own.filter((s) => getNav(s.id).status === "live").length,
    disclosed: own.filter((s) => s.disclosuresCaptured).length,
  };
});

/** Houses holding at least one scheme we have no disclosures for, widest gap first. */
const undisclosedHouses = houses
  .filter((h) => h.disclosed < h.total)
  .sort(
    (a, b) =>
      b.total - b.disclosed - (a.total - a.disclosed) ||
      a.amc.sifName.localeCompare(b.amc.sifName),
  );

const undisclosedSchemes = stats.strategyCount - stats.disclosedCount;

/* Houses we hold no mark for render as a text lockup in the same tile, never
   as a gap. Currently zero — every one of the seventeen has a mark — so the
   sentence about them is conditional rather than a claim that we hold no
   mark for none of them. Derived, not asserted, so it recovers on its own
   the day a house arrives without one. */
const marklessHouses = amcs.filter((a) => a.logo === null).length;

export default function AmcIndexPage() {
  return (
    <>
      <PageHeader
        eyebrow="Asset managers"
        /* Hand-split so the break is ours. Must track stats.amcCount (17)
           and stats.strategyCount (30) — the layout wants words here, so
           these are the two literals on the page. Everything else derives. */
        lines={["Seventeen houses.", "Thirty schemes."]}
        standfirst="Every asset manager that has filed a Specialised Investment Fund, and the SIF sub-brand it files under. AMFI's feed gives us each scheme's name, code and NAV; the disclosures behind them come from the houses themselves, and we publish only the ones we hold. We are a distributor, not an agent of these houses."
        meta={[
          <Fragment key="houses">
            <span className="tabular">{stats.amcCount}</span> houses
          </Fragment>,
          <Fragment key="schemes">
            <span className="tabular">{stats.strategyCount}</span> schemes
          </Fragment>,
          <Fragment key="disclosed">
            <span className="tabular">{stats.disclosedCount}</span> of{" "}
            <span className="tabular">{stats.strategyCount}</span> with
            disclosures
          </Fragment>,
          <Fragment key="updated">
            NAV updated {formatUpdated(navLastUpdated)}
          </Fragment>,
        ]}
      />

      <Section id="houses">
        <Shell>
          <Group className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {houses.map((house) => (
              <GroupItem key={house.amc.id} className="h-full">
                <HouseCard house={house} />
              </GroupItem>
            ))}
          </Group>

          <Rule className="mt-16" />

          {/* Asymmetric on purpose: the gap in the data reads left, the
              provenance of the data reads right. Never 50/50. */}
          <div className="mt-12 grid gap-12 lg:grid-cols-[460px_1fr] lg:gap-16">
            <div>
              <Rise>
                <Eyebrow>What is missing</Eyebrow>
                <h2 className="mt-4 text-[22px] font-medium leading-[30px] text-ink">
                  <span className="tabular">{undisclosedSchemes}</span> of{" "}
                  <span className="tabular">{stats.strategyCount}</span> schemes
                  have no disclosures captured.
                </h2>
                <p className="mt-4 text-[15px] leading-[26px] text-body">
                  Every scheme below has a live NAV. What most of them do not
                  have is a minimum, an expense ratio, an exit load or a risk
                  band — those live in each house&apos;s scheme information
                  document, not in AMFI&apos;s feed. We mark the gap rather than
                  filling it. Houses are ordered by the size of theirs.
                </p>
              </Rise>

              <Rise delay={0.1}>
                <ul className="mt-8 border-t border-hairline">
                  {undisclosedHouses.map((house) => (
                    <li
                      key={house.amc.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hairline py-3"
                    >
                      <span className="text-[15px] leading-[22px] text-ink">
                        <Link
                          href={`/amc/${house.amc.id}`}
                          className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                        >
                          {house.amc.sifName}
                        </Link>
                        <span className="text-muted"> · {house.amc.name}</span>
                      </span>

                      <span className="text-[13px] leading-[20px] text-muted">
                        <span className="tabular">{house.disclosed}</span> of{" "}
                        <span className="tabular">{house.total}</span> captured
                      </span>
                    </li>
                  ))}
                </ul>
              </Rise>
            </div>

            <Rise delay={0.16} className="lg:pt-1">
              <dl className="border-t border-hairline">
                <SourceRow label="NAV source">
                  NAV data fetched from AMFI. Updated daily. All{" "}
                  <span className="tabular">{stats.liveNavCount}</span> schemes
                  carry a NAV in the file dated{" "}
                  {formatUpdated(navLastUpdated)}. We hold every NAV AMFI has
                  published for each scheme, so a dated series backs each
                  figure — none of it modelled or interpolated.
                </SourceRow>
                <SourceRow label="Our relationship">
                  SIF Insight is a distributor of Mutual Funds and SIFs. We
                  cover these asset managers; we do not represent them, and
                  nothing here implies their endorsement.
                </SourceRow>
                <SourceRow label="Marks">
                  Where we hold a house&apos;s mark it is shown for
                  identification only, in that house&apos;s own colours. Trade
                  marks remain the property of their owners.
                  {marklessHouses > 0 ? (
                    <>
                      {" "}
                      We hold no mark for{" "}
                      <span className="tabular">{marklessHouses}</span> of the{" "}
                      <span className="tabular">{stats.amcCount}</span> houses —
                      those tiles are set as type instead of borrowing someone
                      else&apos;s.
                    </>
                  ) : null}
                </SourceRow>
              </dl>
            </Rise>
          </div>
        </Shell>
      </Section>

      <ConsultCta
        eyebrow={null}
        lines={["Comparing houses", "before you commit?"]}
        body="Tell us your goals and risk comfort. We will walk you through the schemes each house runs, and the disclosures we hold behind every one of them."
      />
    </>
  );
}

/* ============================================================
   House card
   ============================================================ */

function HouseCard({ house }: { house: House }) {
  const { amc, total, equity, hybrid, live, disclosed } = house;

  const split: string[] = [];
  if (equity > 0) split.push(`${equity} equity`);
  if (hybrid > 0) split.push(`${hybrid} hybrid`);

  return (
    <TiltCard className="h-full">
      <Link
        href={`/amc/${amc.id}`}
        className="group flex h-full min-h-[400px] flex-col justify-between p-7"
      >
        <div>
          <AmcMark amc={amc} size="lg" hover />

          <h2 className="mt-7 text-[22px] font-medium leading-[30px] text-ink">
            {amc.sifName}
          </h2>
          <p className="mt-1 text-[13px] leading-[20px] text-muted">
            {amc.name}
          </p>
          <p className="mt-4 text-[15px] leading-[26px] text-body">
            {amc.description}
          </p>

          {/* A house we hold nothing beyond the feed for says so at the top of
              the card, not only in the ledger below. */}
          {disclosed === 0 ? (
            <span className="mt-5 inline-flex items-center rounded-full border border-hairline px-3 py-1 text-[13px] leading-[20px] text-muted">
              Disclosures not captured
            </span>
          ) : null}
        </div>

        <div>
          <dl className="mt-8 border-t border-hairline">
            <CardRow label="Schemes">
              <Odometer value={total} className="text-[15px] text-ink" />
              {split.length > 0 ? (
                <span className="ml-2 text-[13px] text-muted">
                  {split.join(" · ")}
                </span>
              ) : null}
            </CardRow>

            <CardRow label="NAV on file">
              <span
                className={cn(
                  "tabular text-[15px]",
                  live === total ? "text-ink" : "text-muted",
                )}
              >
                {live} of {total}
              </span>
            </CardRow>

            <CardRow label="Disclosures">
              <span
                className={cn(
                  "tabular text-[15px]",
                  disclosed === total ? "text-ink" : "text-muted",
                )}
              >
                {disclosed} of {total}
              </span>
            </CardRow>
          </dl>

          <span className="mt-7 inline-flex items-center gap-2 text-[13px] leading-[20px] text-accent">
            View schemes
            {/* Hover moves on X. Reveals move on Y. Never mixed. */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
            >
              <path
                d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}

/* One tile geometry, two fills — so the grid stays even across all 17 houses. */
function CardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right leading-[20px]">{children}</dd>
    </div>
  );
}

function SourceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-hairline py-4">
      <dt className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="mt-2 max-w-[62ch] text-[15px] leading-[26px] text-body">
        {children}
      </dd>
    </div>
  );
}
