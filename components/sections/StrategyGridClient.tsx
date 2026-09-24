"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { GlassField } from "@/components/motion/GlassField";
import { TiltCard } from "@/components/motion/TiltCard";
import {
  Eyebrow,
  PendingBadge,
  RiskBand,
  Section,
  Shell,
  Stagger,
  StaggerItem,
} from "@/components/primitives";
import { cn } from "@/lib/cn";
import type { Category, Strategy } from "@/lib/data/types";
import {
  formatExpense,
  formatInr,
  formatNav,
  formatUpdated,
  riskBandNumber,
} from "@/lib/format";
import { DUR, EASE } from "@/lib/motion";

/* ============================================================
   The client half of <StrategyGrid>. Everything it shows arrives as
   PROPS from the server wrapper in StrategyGrid.tsx; importing
   `strategies` and `getNav` from `@/lib/data` here put the whole NAV
   history into the client bundle of every page with the grid.
   ============================================================ */

/** One card's worth of data — only the fields the card prints. */
export type GridCard = {
  strategy: Pick<
    Strategy,
    | "id"
    | "name"
    | "category"
    | "type"
    | "minInvestment"
    | "expenseRatio"
    | "expenseRatioIsCap"
    | "exitLoad"
    | "riskBand"
    | "disclosuresCaptured"
  >;
  sifName: string | null;
  /** Null when the scheme has no live quote. */
  nav: { today: number; asOf: string } | null;
};

/** Every count the section prints, derived on the server from `stats`. */
export type GridCounts = {
  all: number;
  equity: number;
  hybrid: number;
  debt: number;
  disclosed: number;
  /** Asset managers with at least one scheme — the "houses" in the headline. */
  amc: number;
};

type Filter = Category | "all";

function tabsFor(counts: GridCounts): {
  id: Filter;
  label: string;
  count: number;
  live: boolean;
}[] {
  return [
    { id: "all", label: "All", count: counts.all, live: true },
    { id: "equity", label: "Equity", count: counts.equity, live: true },
    { id: "hybrid", label: "Hybrid", count: counts.hybrid, live: true },
    // Genuinely empty. Rendered inert rather than hidden — the absence is information.
    { id: "debt", label: "Debt", count: counts.debt, live: counts.debt > 0 },
  ];
}

/**
 * Filter reflow is a micro-interaction, not a reveal. Exits are faster than entrances.
 *
 * The target key MUST be `show`. Variant labels are resolved by plain key
 * lookup with no fallback, so a container animating to `show` silently does
 * nothing to a child that only defines `visible`. This variant was the last
 * `visible` in the codebase and the reason the mismatch stayed hidden: the
 * container used to say `visible`, so these cards worked while every plain
 * <StaggerItem> was pinned invisible. Renaming it here is what makes the
 * container fix safe rather than merely moving the breakage.
 */
const cardMotion: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.ui, ease: EASE.out, inherit: true },
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE.out } },
};

/**
 * `embedded` suppresses this section's own eyebrow, heading and trailing
 * risk footnote. On the homepage the section has to introduce itself; on
 * /strategies the PageHeader already carries the same headline and the page
 * has its own risk-disclosure block, so without this the H1 and an H2 render
 * byte-identical and the footnote appears twice.
 */
export function StrategyGridClient({
  embedded = false,
  cards,
  counts,
}: {
  embedded?: boolean;
  cards: GridCard[];
  counts: GridCounts;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible: GridCard[] =
    filter === "all" ? cards : cards.filter((c) => c.strategy.category === filter);

  // No section-wide background here: the only glass in this section is the
  // filter pills, and the <GlassField> below gives them their backdrop
  // locally rather than texturing ~3400px of section behind them.
  return (
    /* overflow-x-clip because the pill row spans the full Shell, so the
       GlassField's -inset-x bleed would otherwise push past the viewport and
       give the whole page a horizontal scrollbar. `clip` rather than `hidden`:
       it does not create a scroll container, so it cannot break sticky. */
    <Section id="strategies" className="relative isolate overflow-x-clip">
      <Shell>
        {embedded ? null : (
          <div className="max-w-[720px]">
            <Stagger>
              <StaggerItem>
                <Eyebrow>The funds</Eyebrow>
              </StaggerItem>
            </Stagger>

            <LineReveal
              as="h2"
              className="mt-4 text-[clamp(32px,4.6vw,48px)] leading-[1.14] tracking-[-0.015em]"
              lines={[
                <span key="s" className="tabular">
                  {counts.all} schemes.
                </span>,
                <span key="h" className="tabular">
                  {counts.amc} houses.
                </span>,
              ]}
            />

            <Stagger>
              <StaggerItem>
                <p className="mt-6 text-[17px] leading-[30px] text-body">
                  Every SIF scheme currently offered in India, priced from AMFI.
                  We hold the full disclosures — risk band, expense, exit load
                  and minimum — for {counts.disclosed} of them.
                </p>
              </StaggerItem>
            </Stagger>
          </div>
        )}

        {/* Filter. The field gives the pills their own backdrop so they frost
            even where the substrate is faint. */}
        <div className="relative isolate mt-12 flex flex-wrap items-center gap-2">
          <GlassField />
          {tabsFor(counts).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={!tab.live}
                aria-pressed={tab.live ? active : undefined}
                onClick={() => tab.live && setFilter(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] leading-[20px]",
                  "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  !tab.live
                    ? "cursor-not-allowed border border-hairline text-pending"
                    : active
                      ? "glass glass-active text-ink"
                      : "glass glass-ghost text-body",
                )}
              >
                {tab.label} <span className="tabular">({tab.count})</span>
                {!tab.live && <span className="ml-2">· Launching soon</span>}
              </button>
            );
          })}
        </div>

        {/* Debt is empty today. Say so, don't hide it — and stop saying it
            the day a debt scheme is filed. */}
        {counts.debt === 0 ? (
          <p className="mt-4 text-[13px] leading-[20px] text-muted">
            No debt SIFs have launched yet.
          </p>
        ) : null}

        <Stagger className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {visible.map((card) => (
              <motion.div
                key={card.strategy.id}
                layout
                /* Inherits hidden/show from the <Stagger> above, so it needs
                   data-reveal for the safety nets to reach it — otherwise a
                   dead observer leaves the card grid at opacity 0. */
                data-reveal=""
                variants={cardMotion}
                exit="exit"
                className="h-full"
              >
                <StrategyCard card={card} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Stagger>

        {/* When embedded, the host page carries its own risk-disclosure block
            ending in this exact sentence — repeating it 1,200px later reads as
            a copy-paste artefact rather than as emphasis. */}
        {embedded ? null : (
          <p className="mt-8 max-w-[720px] text-[13px] leading-[20px] text-muted">
            Risk bands are indicative and may vary with market conditions and
            portfolio composition. Consult your financial adviser before
            investing.
          </p>
        )}
      </Shell>
    </Section>
  );
}

/* ============================================================
   Card — the four disclosures at the bottom are material, not
   decoration. Every card carries all four, always.
   ============================================================ */

function StrategyCard({ card }: { card: GridCard }) {
  const { strategy, sifName, nav } = card;

  return (
    /* The whole card is the link to the scheme page. Its accessible name is
       the card's text, which leads with the house and the scheme name. */
    <Link
      href={`/sif/${strategy.id}`}
      className="group block h-full focus-visible:outline-offset-4"
    >
    <TiltCard className="flex h-full min-h-[420px] flex-col justify-between p-8">
      <div>
        <div className="flex items-start justify-between gap-4">
          {/* Eyebrow styling but WITHOUT `uppercase`: these are brand names,
              and text-transform renders "iSIF" as "ISIF". Brand casing wins
              over the label treatment. */}
          <span className="text-[12px] font-semibold leading-[14px] tracking-[0.08em] text-accent">
            {sifName ?? "—"}
          </span>
          <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-2.5 py-0.5 text-[12px] capitalize leading-[18px] text-body">
            {strategy.category}
          </span>
        </div>

        <h3 className="mt-9 text-[22px] font-medium leading-[30px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
          {strategy.name}
        </h3>
        <p className="mt-2 text-[13px] leading-[20px] text-muted">
          {strategy.type}
        </p>

        {/* NAV only. A series does exist per scheme now, but a sparkline on a
            card this size would be decoration at the expense of legibility —
            the plotted line belongs on the NAV tracker, at a size where its
            axis and dates can be read. */}
        <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {nav ? (
            <>
              <span className="tabular text-[17px] leading-[24px] text-ink">
                {formatNav(nav.today)}
              </span>
              <span className="tabular text-[12px] leading-[16px] text-muted">
                as at {formatUpdated(nav.asOf)}
              </span>
            </>
          ) : (
            <PendingBadge />
          )}
        </div>
      </div>

      <dl className="mt-10 border-t border-hairline">
        {/* Full grouping — ₹10,00,000 — not the compact "₹10 L" this card used
            to print. It is the same figure /amc/[id], /sif-tracker,
            /nav-tracker and /strategies/[category] all render in full, and
            /strategies embeds THIS GRID directly beneath its own prose saying
            "₹10,00,000 floor for every SIF" (app/strategies/page.tsx) — so the
            shorthand put one number on one page in two shapes. A minimum is
            also a threshold the investor has to clear to the rupee, which is
            not a figure to round on their behalf. `formatInr` still offers
            `compact`; its docstring says where that belongs. */}
        <DisclosureRow label="Minimum">
          <DisclosureValue
            value={
              strategy.minInvestment === null
                ? null
                : formatInr(strategy.minInvestment)
            }
          />
        </DisclosureRow>
        <DisclosureRow label="Expense">
          <DisclosureValue
            value={
              formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)
            }
          />
        </DisclosureRow>
        <DisclosureRow label="Exit load">
          <DisclosureValue value={strategy.exitLoad} />
        </DisclosureRow>
        <DisclosureRow label="Risk">
          <RiskBand band={riskBandNumber(strategy.riskBand)} />
        </DisclosureRow>
      </dl>

      {/* Said once at card level rather than four times in the rows above. */}
      {strategy.disclosuresCaptured ? null : (
        <p className="mt-4 text-[12px] leading-[18px] text-muted">
          Disclosures for this scheme are not yet captured — see the scheme
          information document.
        </p>
      )}
    </TiltCard>
    </Link>
  );
}

/**
 * A field we hold no value for renders as an explicit "Not captured", never as
 * a blank cell and never as a default — a blank reads as an oversight, and a
 * default would be an invention.
 *
 * Every scheme in the feed currently has a disclosures entry carrying all four
 * of these fields, so nothing reaches the null branch today. It is written as a
 * condition rather than removed because that state is normal and recurring, not
 * an anomaly: a scheme is undisclosed from the day AMFI lists it until someone
 * reads its information document, so the next filing lands here. Deleting the
 * branch would swap "Not captured" for an empty row on the day it matters.
 */
function DisclosureValue({ value }: { value: string | null }) {
  if (value === null) {
    return <span className="text-[13px] text-muted">Not captured</span>;
  }
  return <span className="tabular text-[13px] text-ink">{value}</span>;
}

function DisclosureRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right leading-[20px]">{children}</dd>
    </div>
  );
}
