"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import { Odometer } from "@/components/motion/Odometer";
import { Rule } from "@/components/motion/Reveal";
import { NavSeriesChart } from "@/components/NavSeriesChart";
import { Delta, RiskBand, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import {
  amcById,
  formatExpense,
  formatInr,
  formatNav,
  formatUpdated,
  getNav,
  mandates,
  navHistory,
  navLastUpdated,
  navSource,
  riskBandNumber,
  stats,
  strategies,
  type NavQuote,
  type Strategy,
} from "@/lib/data";

type LiveQuote = Extract<NavQuote, { status: "live" }>;

/* ============================================================
   Order

   Thirty schemes is too many for one undifferentiated column, so
   the selector is grouped by mandate — commonest mandate first,
   alphabetical within each group.

   It is NOT ordered by NAV, and no scheme is filtered out of it.
   Two schemes are priced off a different face value (₹930 and
   ₹1,004 against ~₹10 for the other 28), so any size ordering
   would rank them top and imply a performance they have not
   demonstrated. Mandate is present on all 30, so grouping by it
   hides nothing.
   ============================================================ */

const groups = mandates.map(({ type, count }) => ({
  type,
  count,
  schemes: strategies
    .filter((s) => s.type === type)
    .sort((a, b) => a.name.localeCompare(b.name)),
}));

/** Flattened in render order — keyboard order must match the eye's order. */
const ordered: Strategy[] = groups.flatMap((g) => g.schemes);

export function NavExplorer() {
  const uid = useId();
  const panelId = `${uid}-panel`;
  const listLabelId = `${uid}-list`;
  const tabId = (id: string) => `${uid}-tab-${id}`;

  const [activeId, setActiveId] = useState(() => ordered[0].id);
  const active = ordered.find((s) => s.id === activeId) ?? ordered[0];

  /* Vertical tablist: Up/Down (and Left/Right) move selection, Home/End jump
     to the ends, and focus follows selection — the standard tabs pattern.
     Roving tabindex means exactly one tab is in the tab order at a time, so
     Tab still crosses the whole 30-item list in one press. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = ordered.length - 1;
    const current = ordered.findIndex((s) => s.id === activeId);
    let next: number;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = current >= last ? 0 : current + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = current <= 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = ordered[next];
    setActiveId(target.id);
    const node = document.getElementById(tabId(target.id));
    node?.focus();
    node?.scrollIntoView({ block: "nearest" });
  };

  return (
    <Section id="nav-detail" className="pt-14">
      <Shell>
        <div className="grid gap-10 xl:grid-cols-[368px_1fr] xl:gap-16">
          {/* min-w-0: a grid item defaults to min-width:auto, so without it
              the longest fund name sets the column width and the page grows
              a horizontal scrollbar on phones. */}
          <div className="min-w-0">
            <p
              id={listLabelId}
              className="text-[13px] font-semibold uppercase leading-[20px] tracking-[0.08em] text-muted"
            >
              Choose a scheme
            </p>

            <div
              role="tablist"
              aria-orientation="vertical"
              aria-labelledby={listLabelId}
              onKeyDown={onKeyDown}
              data-lenis-prevent
              className="relative mt-4 max-h-[460px] overflow-y-auto border border-hairline bg-surface"
            >
              {groups.map((group) => (
                <Fragment key={group.type}>
                  {/* aria-hidden, so the tablist's only owned elements stay
                      the tabs themselves. The mandate is instead carried into
                      each tab's accessible name below, which is what a screen
                      reader user actually needs while arrowing through. */}
                  <p
                    aria-hidden="true"
                    className="sticky top-0 z-10 border-b border-hairline bg-surface-2 px-4 py-2 text-[13px] font-semibold uppercase leading-[20px] tracking-[0.08em] text-muted"
                  >
                    {group.type}
                    <span className="tabular ml-2 font-normal">
                      {group.count}
                    </span>
                  </p>

                  {group.schemes.map((strategy) => {
                    const amc = amcById.get(strategy.amcId);
                    const selected = strategy.id === activeId;

                    return (
                      <button
                        key={strategy.id}
                        id={tabId(strategy.id)}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={panelId}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setActiveId(strategy.id)}
                        /* AMFI's official names run long and are truncated to
                           keep the column from setting the page width — the
                           title restores the full string on hover. */
                        title={strategy.name}
                        /* scroll-mt clears the sticky mandate header when
                           keyboard selection scrolls a tab into view. */
                        className={cn(
                          "block w-full scroll-mt-10 border-b border-hairline px-4 py-3 text-left last:border-b-0",
                          "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                          selected ? "bg-accent-wash" : "hover:bg-surface-2",
                        )}
                      >
                        <span
                          className={cn(
                            "block truncate text-[15px] leading-[22px]",
                            selected ? "text-ink" : "text-body",
                          )}
                        >
                          <span className="sr-only">{group.type}: </span>
                          {strategy.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] leading-[18px] text-muted">
                          {amc?.sifName ?? amc?.name ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>

            <p className="mt-4 text-[13px] leading-[20px] text-muted">
              All {stats.strategyCount} schemes are listed, grouped by their{" "}
              {stats.mandateCount} mandates and alphabetical within each — never
              ranked by NAV, which would compare funds priced off different face
              values.{" "}
              {stats.disclosedCount === stats.strategyCount ? (
                <>We hold the full disclosure set for every one of them.</>
              ) : (
                <>
                  We hold the full disclosure set for {stats.disclosedCount} of
                  them; the rest show each field as not captured.
                </>
              )}{" "}
              Source: AMFI, {formatUpdated(navLastUpdated)}.
            </p>
          </div>

          {/* Keyed on the scheme so the odometer rolls once per selection,
              lands on the real value and stops. */}
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId(active.id)}
            tabIndex={0}
            className="min-w-0"
          >
            <FundDetail key={active.id} strategy={active} />
          </div>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Detail
   ============================================================ */

function FundDetail({ strategy }: { strategy: Strategy }) {
  const amc = amcById.get(strategy.amcId);
  const nav = getNav(strategy.id);

  return (
    <div className="border border-hairline bg-surface p-7 sm:p-10">
      {/* Not uppercased: the sub-brands are cased deliberately (iSIF, QSIF,
          WSIF) and `text-transform` would quietly rename them. */}
      <p className="text-[13px] font-semibold leading-[20px] text-accent">
        {amc?.sifName ?? "—"}
      </p>

      <h2 className="mt-2 text-[22px] font-medium leading-[30px] text-ink">
        {strategy.name}
      </h2>

      <p className="mt-1 text-[13px] leading-[20px] text-muted">
        {amc?.name ?? "—"}
        <span aria-hidden="true"> · </span>
        {strategy.type}
      </p>

      <Rule className="mt-7" />

      {nav.status === "live" ? (
        <Observation strategy={strategy} nav={nav} />
      ) : (
        /* Unreachable against the current feed — all 30 schemes carry a NAV.
           Kept only because NavQuote still admits `pending`; the honest render
           of a missing observation is its absence, not a placeholder figure. */
        <p className="mt-8 max-w-[52ch] text-[15px] leading-[26px] text-body">
          No net asset value is held for this scheme. One will appear here once
          it is published in AMFI’s SIF feed.
        </p>
      )}

      <Rule className="mt-10" />

      {/* Said once, at card level, rather than five times down the list. */}
      {!strategy.disclosuresCaptured ? (
        <p className="mt-8 border border-hairline bg-surface-2 px-4 py-3 text-[13px] leading-[20px] text-muted">
          Disclosures for this scheme are not yet captured — see the scheme
          information document. AMFI’s NAV feed carries none of these fields; we
          hold the researched set for {stats.disclosedCount} of{" "}
          {stats.strategyCount} schemes.
        </p>
      ) : null}

      {/* Asymmetric by rule and by need — the left column carries the long
          strings (benchmark, exit load, taxation). */}
      <dl className="mt-2 sm:grid sm:grid-cols-[1.2fr_1fr] sm:gap-x-10">
        <Disclosure label="Benchmark" value={strategy.benchmark} />
        <Disclosure
          label="Risk band"
          value={<RiskBand band={riskBandNumber(strategy.riskBand)} />}
        />
        <Disclosure
          label="Minimum investment"
          tabular
          value={
            strategy.minInvestment === null
              ? null
              : formatInr(strategy.minInvestment)
          }
        />
        <Disclosure
          label="Expense ratio"
          tabular
          value={formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)}
        />
        <Disclosure label="Exit load" tabular value={strategy.exitLoad} />
        <Disclosure label="Redemption" value={strategy.redemptionFrequency} />
        <Disclosure label="Taxation" value={strategy.taxation} />
        <Disclosure label="Dividend" value={strategy.dividend} />
        <Disclosure
          label="Category"
          value={<span className="capitalize">{strategy.category}</span>}
        />
      </dl>

      <p className="mt-8 max-w-[64ch] text-[13px] leading-[20px] text-muted">
        NAV data fetched from AMFI. Updated daily. Last filed{" "}
        {formatUpdated(navLastUpdated)}.
      </p>
    </div>
  );
}

/* ============================================================
   The observation

   There IS a chart here now, and every point in it is a figure
   AMFI published on that date — nothing modelled, nothing
   interpolated. The daily snapshot feed gives the latest value;
   AMFI's historical-NAV export gave every prior published value
   back to each scheme's first.

   So `changePct` is real, but it is the move since the previous
   PUBLISHED close, which is not always yesterday — weekends,
   holidays and non-dealing days are simply absent from the
   series. We state that date rather than calling it a day move.

   The chart plots one scheme against its own axis, never a
   shared one: two of the thirty are priced off a different face
   value, so any comparative scale would rank them top and imply
   a performance they have not demonstrated.
   ============================================================ */

function Observation({
  strategy,
  nav,
}: {
  strategy: Strategy;
  nav: LiveQuote;
}) {
  const points = navHistory(strategy.id);

  return (
    <div className="mt-8">
      <p className="text-[13px] leading-[20px] text-muted">Net asset value</p>

      <Odometer
        value={nav.today}
        decimals={4}
        prefix="₹"
        className="mt-2 text-[clamp(32px,4.2vw,54px)] leading-[1.1] text-ink"
      />

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Delta pct={nav.changePct} />
        <p className="text-[13px] leading-[20px] text-muted">
          as at{" "}
          <span className="tabular text-ink">{formatUpdated(nav.asOf)}</span>
          {nav.previous ? (
            <>
              , against {formatNav(nav.previous.nav)} on{" "}
              <span className="tabular">{formatUpdated(nav.previous.date)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-8">
        <NavSeriesChart points={points} label={strategy.name} />
      </div>

      <dl className="mt-8 max-w-[62ch] border-t border-hairline">
        <Provenance label="Source">{navSource}</Provenance>
        <Provenance label="AMFI scheme code" tabular>
          {strategy.amfiSchemeCode}
        </Provenance>
        <Provenance label="ISIN" tabular>
          {strategy.isin ?? "Not captured"}
        </Provenance>
        <Provenance label="Observations held" tabular>
          {nav.observations}
        </Provenance>
      </dl>
    </div>
  );
}

/**
 * Provenance row. Label left, value left — the source URL is long and a
 * right-aligned column would break it mid-path.
 */
function Provenance({
  label,
  children,
  tabular,
}: {
  label: string;
  children: ReactNode;
  tabular?: boolean;
}) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-4 border-b border-hairline py-2.5 text-[13px] leading-[20px]">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("min-w-0 break-words text-body", tabular && "tabular")}>
        {children}
      </dd>
    </div>
  );
}

/**
 * A disclosure row.
 *
 * A null value is a fact about our record, not a gap to be filled: it renders
 * as "Not captured" rather than as a blank, a dash or an invented default.
 */
function Disclosure({
  label,
  value,
  tabular,
}: {
  label: string;
  value: ReactNode;
  tabular?: boolean;
}) {
  const missing = value === null || value === undefined || value === "";

  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-3">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-right leading-[22px]",
          missing
            ? "text-[13px] text-muted"
            : cn("text-[15px] text-ink", tabular && "tabular"),
        )}
      >
        {missing ? "Not captured" : value}
      </dd>
    </div>
  );
}
