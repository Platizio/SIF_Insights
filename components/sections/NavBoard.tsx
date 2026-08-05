import Link from "next/link";
import { Fragment } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import {
  Rise,
  RowGroup,
  RowItem,
  RowListItem,
  Rule,
} from "@/components/motion/Reveal";
import {
  Card,
  Eyebrow,
  PendingBadge,
  RiskBand,
  Section,
  Shell,
} from "@/components/primitives";
import { cn } from "@/lib/cn";
import {
  amcById,
  formatUpdated,
  getNav,

  navLastUpdated,
  riskBandNumber,
  stats,
  strategies,
  type Amc,
  type NavQuote,
  type Strategy,
} from "@/lib/data";

/* ============================================================
   Row model — ONE array feeds both the desktop table and the
   mobile stack, so the two renderings can never disagree.

   Ordered by mandate, then by scheme name. NOT by day move: this is
   a reference board, and ranking it by change would turn a neutral
   index into a league table. Ordering by NAV size would be worse —
   two schemes are priced off a ~₹1,000 face value, not performing a
   hundred times better.
   ============================================================ */

type BoardRow = {
  strategy: Strategy;
  nav: NavQuote;
  amc: Amc | undefined;
};

const rows: BoardRow[] = [...strategies]
  .sort(
    (a, b) =>
      a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
  )
  .map((strategy) => ({
    strategy,
    nav: getNav(strategy.id),
    amc: amcById.get(strategy.amcId),
  }));

/* Counted, never asserted. Gainers/decliners are gone: with no prior
   close there is nothing to count them against. */
const notCaptured = stats.strategyCount - stats.disclosedCount;

/* No "Change" column here by choice. This board is the reference index;
   the change and the series live on the NAV tracker, which the attribution
   line links to. Keeping it out also keeps the board from reading as a
   performance ranking. */
const COLUMNS = ["Fund", "AMC", "Mandate", "NAV", "Risk"] as const;

/**
 * `embedded` suppresses this section's own eyebrow and heading. On the
 * homepage the board must introduce itself; on /nav-tracker the PageHeader
 * already carries the "Live NAV" eyebrow and its own title, so without this
 * the eyebrow renders twice on one page.
 */
export function NavBoard({ embedded = false }: { embedded?: boolean }) {
  return (
    <Section id="nav-board" className={embedded ? "pt-0" : undefined}>
      <Shell>
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {embedded ? (
            <span />
          ) : (
            <div>
              <Rise>
                <Eyebrow>Live NAV</Eyebrow>
              </Rise>
              <LineReveal
                as="h2"
                className="mt-4 text-[clamp(32px,4.6vw,48px)] leading-[1.14] tracking-[-0.015em]"
                lines={["Every SIF,", "priced."]}
              />
            </div>
          )}
          <Rise delay={0.15}>
            <p className="tabular text-[13px] leading-[20px] text-muted md:pb-2 md:text-right">
              Updated {formatUpdated(navLastUpdated)}
              <span aria-hidden="true"> · </span>
              Source: AMFI
            </p>
          </Rise>
        </header>

        <Rise delay={0.1}>
          <Card className="mt-12">
            <SummaryStrip />

            {/* Desktop: a real table. Six columns need the semantics.
                Scrollable + focusable so the md..lg squeeze never crushes it. */}
            <div
              role="region"
              aria-label="NAV board"
              tabIndex={0}
              className="hidden overflow-x-auto md:block"
            >
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr>
                    {COLUMNS.map((label, i) => (
                      <th
                        key={label}
                        scope="col"
                        className={cn(
                          "px-4 py-3 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted",
                          i === 0 && "pl-6",
                          i === COLUMNS.length - 1 && "pr-6",
                          label === "NAV" && "text-right",
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <RowGroup>
                  {rows.map(({ strategy, nav, amc }, i) => {
                    const pending = nav.status === "pending";
                    return (
                      <RowItem
                        key={strategy.id}
                        index={i}
                        className="border-t border-hairline transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2"
                      >
                        <td className="px-4 py-4 pl-6 align-top">
                          <span
                            className={cn(
                              "block text-[15px] leading-[22px]",
                              pending ? "text-muted" : "text-ink",
                            )}
                          >
                            {strategy.name}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
                            {strategy.type}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={cn(
                              "block text-[14px] leading-[20px]",
                              pending ? "text-muted" : "text-ink",
                            )}
                          >
                            {amc?.sifName ?? "—"}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
                            {amc?.name ?? ""}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <MandateChip type={strategy.type} />
                        </td>

                        {/* An absolute figure only. Two schemes are priced off a
                            ~₹1,000 face value, so NAVs never share an axis, a bar
                            width or any comparative scale — and with no prior
                            close there is no percentage fallback either. */}
                        <td className="px-4 py-4 text-right align-top">
                          {nav.status === "live" ? (
                            <Odometer
                              value={nav.today}
                              decimals={4}
                              prefix="₹"
                              className="text-[15px] leading-[22px] text-ink"
                            />
                          ) : (
                            <PendingBadge />
                          )}
                        </td>

                        <td className="px-4 py-4 pr-6 align-top">
                          <RiskBand band={riskBandNumber(strategy.riskBand)} />
                        </td>
                      </RowItem>
                    );
                  })}
                </RowGroup>
              </table>
            </div>

            {/* Mobile: same rows, stacked. Six columns will not fit. */}
            <ul className="md:hidden">
              {rows.map(({ strategy, nav, amc }, i) => {
                const pending = nav.status === "pending";
                return (
                  <RowListItem
                    key={strategy.id}
                    index={i}
                    className="border-b border-hairline px-6 py-5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={cn(
                            "text-[15px] leading-[22px]",
                            pending ? "text-muted" : "text-ink",
                          )}
                        >
                          {strategy.name}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-[16px] text-muted">
                          {amc?.sifName ?? "—"} · {strategy.type}
                        </p>
                      </div>
                      <MandateChip type={strategy.type} />
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      {nav.status === "live" ? (
                        <Odometer
                          value={nav.today}
                          decimals={4}
                          prefix="₹"
                          className="text-[15px] leading-[22px] text-ink"
                        />
                      ) : (
                        <PendingBadge />
                      )}
                    </div>

                    <div className="mt-4">
                      <RiskBand band={riskBandNumber(strategy.riskBand)} />
                    </div>
                  </RowListItem>
                );
              })}
            </ul>
          </Card>
        </Rise>

        <Rule className="mt-5" />

        {/* Compliance. Not optional. The single-observation caveat is stated
            once here rather than as a "No prior close" cell on all 30 rows. */}
        <Rise>
          <p className="mt-5 max-w-[70ch] text-[13px] leading-[20px] text-muted">
            NAV data fetched from AMFI. Updated daily. Every NAV AMFI has
            published for each scheme is held, so the figures below are the
            latest points of a dated series — see the{" "}
            <Link href="/nav-tracker" className="underline">
              NAV tracker
            </Link>{" "}
            for each scheme’s line and its change. Disclosures are not yet
            captured for {notCaptured} of {stats.strategyCount} schemes.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Summary strip — every figure counted from the rows above.
   Figures roll once and stop; they never idle-tick, because a
   moving number implies live data we are not claiming to have.
   ============================================================ */

function SummaryStrip() {
  /* Still coverage, not a gainers/decliners tally. A move now exists per
     scheme, so such a strip could be computed — but this band sits above a
     reference index, and counting winners there frames the category as a
     scoreboard. Coverage is the honest summary of what this board shows. */
  const items: { value: number; suffix?: string; label: string }[] = [
    { value: stats.strategyCount, label: "schemes priced" },
    { value: stats.amcCount, label: "asset managers" },
    { value: stats.mandateCount, label: "mandates" },
    {
      value: stats.disclosedCount,
      suffix: ` of ${stats.strategyCount}`,
      label: "with captured disclosures",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-y-1 border-b border-hairline px-6 py-3.5 text-[13px] leading-[20px] text-muted">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && (
            <span aria-hidden="true" className="mx-3 text-hairline">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <Odometer
              value={item.value}
              suffix={item.suffix}
              className="text-ink"
            />
            <span>{item.label}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** The mandate, not the coarse category — there are five now, and the
    mandate is what actually distinguishes one scheme from another. */
function MandateChip({ type }: { type: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-2.5 py-0.5 text-[12px] leading-[18px] text-body">
      {type}
    </span>
  );
}
