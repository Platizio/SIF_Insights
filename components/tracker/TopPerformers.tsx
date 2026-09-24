"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Delta, RiskBand } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { formatDays, formatExpense, formatInr, formatNav } from "@/lib/format";

import { CategoryFilter } from "./CategoryFilter";
import {
  PERIOD_LABEL,
  applyFilter,
  historyPhrase,
  periodHasData,
  rankByPeriod,
  returnHeading,
  selectionNoun,
  sifHref,
  type CategoryChoice,
  type StrategyChoice,
  type StrategyDef,
  type TrackerPeriod,
  type TrackerRow,
} from "./model";

/* ============================================================
   2 · Top Performing SIFs (PRD p.24–25)

   The five highest returns for one period among the selected SIFs
   that HAVE that period — never "best", never a recommendation. A SIF
   too young for the period is counted and said so, not ranked last.
   Benchmark returns are not in the data yet, so that column says
   "Not captured" on every row rather than being dropped: the PRD
   asks for it, and the gap is information.

   Every ranked row also carries the four fields each fund row on the
   site does (spec §0.6) — risk band, expense, exit load and minimum —
   after the PRD's own columns, so a return is never read without them.

   The server renders the default state (All · 1 Month) through this
   island's own SSR; the first client render is the same pure
   derivation over the same props.
   ============================================================ */

/** 1M first and default; 1W is offered, but set apart as the short-term read. */
const MAIN_PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "SI"] as const satisfies readonly TrackerPeriod[];

function periodChip(p: TrackerPeriod): ReactNode {
  if (p === "SI") return PERIOD_LABEL.SI.long;
  return (
    <>
      <span aria-hidden="true">{PERIOD_LABEL[p].short}</span>
      <span className="sr-only">{PERIOD_LABEL[p].long}</span>
    </>
  );
}

export function TopPerformers({
  rows,
  strategies,
  asOfLabel,
}: {
  rows: TrackerRow[];
  strategies: StrategyDef[];
  asOfLabel: string;
}) {
  const [category, setCategory] = useState<CategoryChoice>("all");
  const [strategy, setStrategy] = useState<StrategyChoice>("all");
  const [period, setPeriod] = useState<TrackerPeriod>("1M");
  const periodGroup = useId();

  const selected = applyFilter(rows, category, strategy);
  const { ranked, eligible, lacking } = rankByPeriod(selected, period);
  const noun = selectionNoun(category, strategy, strategies);
  const periodName = PERIOD_LABEL[period].long;

  const periodOption = (p: TrackerPeriod) => ({
    id: p,
    label: periodChip(p),
    disabled: !periodHasData(rows, p),
  });

  return (
    <div>
      <div className="grid gap-8 border-y border-hairline py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
        <CategoryFilter
          rows={rows}
          strategies={strategies}
          category={category}
          strategy={strategy}
          onChange={(c, s) => {
            setCategory(c);
            setStrategy(s);
          }}
        />

        {/* One radio group (shared `name`) in two fieldsets: the investment
            periods, then 1 Week set apart and set smaller — offered for
            recent movement, not given the same weight (PRD p.24). */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-5 lg:justify-end">
          <Segmented
            legend="Time period"
            legendHidden={false}
            name={periodGroup}
            options={MAIN_PERIODS.map(periodOption)}
            value={period}
            onChange={setPeriod}
          />
          <Segmented
            legend="Recent move"
            legendHidden={false}
            name={periodGroup}
            options={[periodOption("1W")]}
            value={period}
            onChange={setPeriod}
            className="[&_label]:px-3 [&_label]:py-1.5 [&_label]:text-[12px]"
          />
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-[20px] text-muted" aria-live="polite">
        {eligible > 0 ? (
          <>
            Top <span className="tabular">{ranked.length}</span> of{" "}
            <span className="tabular">{eligible}</span> {noun} ranked by {periodName.toLowerCase()}{" "}
            return.
          </>
        ) : null}
        {lacking > 0 ? (
          <>
            {eligible > 0 ? " " : null}
            <span className="tabular">{lacking}</span> of{" "}
            <span className="tabular">{selected.length}</span> {noun} lack {historyPhrase(period)} and
            are not ranked.
          </>
        ) : null}
      </p>

      {ranked.length === 0 ? (
        <p className="mt-6 border-y border-hairline py-8 text-[15px] leading-[26px] text-body">
          {selected.length === 0
            ? `No ${noun} are on file.`
            : `No ${noun.replace(/s$/, "")} has ${historyPhrase(period)} yet, so none can be ranked for this period.`}
        </p>
      ) : (
        <div className="mt-6 border border-hairline bg-surface">
          {/* md+: a real table. Scrolls inside itself, never the page. */}
          <div
            role="region"
            aria-label={`Top ${noun} by ${periodName.toLowerCase()} return`}
            tabIndex={0}
            className="relative hidden overflow-x-auto md:block"
          >
            <table className="w-full min-w-[1280px] border-collapse text-left">
              <caption className="sr-only">
                Top {ranked.length} {noun} by {periodName.toLowerCase()} return, NAV data as of {asOfLabel}
              </caption>
              <thead>
                <tr>
                  <Th className="w-[72px] pl-6">Rank</Th>
                  <Th>SIF Name</Th>
                  <Th>AMC</Th>
                  <Th>Strategy</Th>
                  <Th align="right">{returnHeading(period)}</Th>
                  <Th align="right">Benchmark Return</Th>
                  <Th align="right">Latest NAV</Th>
                  <Th>Risk band</Th>
                  <Th align="right">Total TER</Th>
                  <Th>Exit load</Th>
                  <Th align="right" className="pr-6">
                    Min. investment
                  </Th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ row, pct }, i) => (
                  <tr
                    key={row.id}
                    className="border-t border-hairline transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2"
                  >
                    <td className="tabular py-4 pl-6 pr-4 align-top text-[15px] leading-[22px] text-muted">
                      {i + 1}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <SifLink row={row} />
                    </td>
                    <td className="px-4 py-4 align-top text-[13px] leading-[22px] text-body">{row.brand}</td>
                    <td className="px-4 py-4 align-top text-[13px] leading-[22px] text-body">
                      {row.strategyLabel}
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <Delta pct={pct} className="text-[15px] leading-[22px]" />
                    </td>
                    <td className="px-4 py-4 text-right align-top leading-[22px]">
                      <BenchmarkReturn benchmark={row.benchmark} />
                    </td>
                    <td className="tabular px-4 py-4 text-right align-top text-[15px] leading-[22px] text-ink">
                      <Nav value={row.nav} />
                    </td>
                    <td className="px-4 py-4 align-top leading-[22px]">
                      <RiskBand band={row.riskBand} />
                    </td>
                    <td className="px-4 py-4 text-right align-top text-[13px] leading-[22px] text-ink">
                      <Expense row={row} />
                    </td>
                    <td className="px-4 py-4 align-top text-[13px] leading-[22px] text-body">
                      <ExitLoad row={row} />
                    </td>
                    <td className="py-4 pl-4 pr-6 text-right align-top text-[13px] leading-[22px] text-ink">
                      <MinInvestment value={row.minInvestment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: the same five, stacked. */}
          <ol className="md:hidden" aria-label={`Top ${noun} by ${periodName.toLowerCase()} return`}>
            {ranked.map(({ row, pct }, i) => (
              <li key={row.id} className="border-b border-hairline px-5 py-5 last:border-b-0">
                <div className="flex gap-4">
                  <span className="tabular w-5 shrink-0 text-[15px] leading-[22px] text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <SifLink row={row} />
                    <p className="mt-1 text-[13px] leading-[20px] text-muted">
                      {row.brand} · {row.strategyLabel}
                    </p>
                    <dl className="mt-4 grid grid-cols-3 gap-3">
                      <MobileFact label={`${PERIOD_LABEL[period].short} Return`}>
                        <Delta pct={pct} className="text-[15px]" />
                      </MobileFact>
                      <MobileFact label="Benchmark">
                        <BenchmarkReturn benchmark={row.benchmark} />
                      </MobileFact>
                      <MobileFact label="Latest NAV">
                        <span className="tabular text-[13px] text-ink">
                          <Nav value={row.nav} />
                        </span>
                      </MobileFact>
                    </dl>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <MobileFact label="Risk band">
                        <RiskBand band={row.riskBand} />
                      </MobileFact>
                      <MobileFact label="Total TER">
                        <span className="text-[13px] text-ink">
                          <Expense row={row} />
                        </span>
                      </MobileFact>
                      <MobileFact label="Exit load">
                        <span className="text-[13px] text-body">
                          <ExitLoad row={row} />
                        </span>
                      </MobileFact>
                      <MobileFact label="Min. investment">
                        <span className="text-[13px] text-ink">
                          <MinInvestment value={row.minInvestment} />
                        </span>
                      </MobileFact>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 max-w-[80ch] space-y-2 text-[13px] leading-[20px] text-muted">
        <p>
          Top Performing refers only to historical performance for the selected period. It is not an
          investment recommendation or an indication of future returns.
        </p>
        <p>{PAST_PERFORMANCE_NOTE}</p>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SifLink({ row }: { row: TrackerRow }) {
  return (
    <Link
      href={sifHref(row.id)}
      className="text-[15px] leading-[22px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
    >
      {row.shortName}
    </Link>
  );
}

function BenchmarkReturn({ benchmark }: { benchmark: string | null }) {
  return (
    <NotCaptured
      detail={benchmark ? `Benchmark: ${benchmark}. Benchmark returns are not yet captured.` : undefined}
    />
  );
}

/** A scheme's own latest NAV. Printed per row, never compared across rows. */
function Nav({ value }: { value: number }) {
  return Number.isFinite(value) ? <>{formatNav(value)}</> : <NotCaptured />;
}

/** The charged total TER; the document's cap, said to be one, only when no charged figure is held. */
function Expense({ row }: { row: TrackerRow }) {
  if ("v" in row.ter) return <span className="tabular">{row.ter.v.toFixed(2)}%</span>;
  if ("v" in row.terMax) return <span className="tabular">{formatExpense(row.terMax.v, true)} cap</span>;
  return <NotCaptured reason={row.ter.absent} />;
}

/** The exit load in short — the scheme page carries the document's own sentence. */
function ExitLoad({ row }: { row: TrackerRow }) {
  const el = row.exitLoad;
  if (el.applicable === null) return <NotCaptured />;
  if (el.applicable === false) return <>No exit load</>;
  const parts = [
    el.pct !== null ? `${el.tiered ? "Up to " : ""}${el.pct.toFixed(2)}%` : null,
    el.periodDays !== null ? `within ${formatDays(el.periodDays)}` : null,
  ].filter(Boolean);
  return (
    <span className="tabular" title={el.text ?? undefined}>
      {parts.length ? parts.join(" ") : "Applies"}
    </span>
  );
}

function MinInvestment({ value }: { value: number | null }) {
  return value === null ? <NotCaptured /> : <span className="tabular">{formatInr(value)}</span>;
}

function MobileFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] uppercase leading-[14px] tracking-[0.06em] text-muted">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
