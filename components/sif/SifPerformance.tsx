import { Rise } from "@/components/motion/Reveal";
import { Delta } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { SourceNote } from "@/components/ui/SourceNote";
import { PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { navSourceUrl } from "@/lib/data";
import type { Period, ReturnResult } from "@/lib/data/types";
import { PERIODS } from "@/lib/data/types";
import { formatInr, formatMonth, formatPct, formatUpdated, heatGrade } from "@/lib/format";
import type { SifDetail } from "./detail";
import { NavHistory } from "./NavHistory";
import { MethodologyLink, SectionHead, SifSection } from "./parts";

/* ============================================================
   Performance: trailing returns for every period, the NAV line,
   and the completed calendar months. Every figure is computed from
   AMFI's published NAVs; nothing is modelled.
   ============================================================ */

const PERIOD_LABEL: Record<Period, string> = {
  "1D": "1 day",
  "1W": "1 week",
  "1M": "1 month",
  "3M": "3 months",
  "6M": "6 months",
  "1Y": "1 year",
  "2Y": "2 years",
  SI: "Since inception",
};

/* Literal class strings — Tailwind reads source text, so a grade can never be
   assembled into a class name. Dark text on the pale grades, white on the
   strong ones, each pairing measured for 4.5:1 (spec §9). */
const HEAT_CELL: Record<number, string> = {
  [-4]: "bg-heat-neg-4 text-surface",
  [-3]: "bg-heat-neg-3 text-surface",
  [-2]: "bg-heat-neg-2 text-ink",
  [-1]: "bg-heat-neg-1 text-ink",
  0: "bg-heat-na text-ink",
  1: "bg-heat-pos-1 text-ink",
  2: "bg-heat-pos-2 text-ink",
  3: "bg-heat-pos-3 text-surface",
  4: "bg-heat-pos-4 text-surface",
};

export function SifPerformance({ detail }: { detail: SifDetail }) {
  const { row, returns, points } = detail;
  const inceptionLabel =
    row.inception?.basis === "allotment" ? "Since inception" : "Since first NAV";

  return (
    <SifSection
      id="performance"
      wide
      head={
        <SectionHead
          eyebrow="Performance"
          lines={["How the NAV has moved."]}
          methodology="#returns"
        >
          Trailing returns are measured from the last NAV published on or before
          each period&apos;s start. Periods of a year or more are annualised
          (CAGR); shorter periods are absolute.
        </SectionHead>
      }
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* ---- Trailing returns ---- */}
        <Rise>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Trailing returns for {row.shortName}, all periods
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="py-2.5 pr-4 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                  Period
                </th>
                <th scope="col" className="py-2.5 pr-4 text-right text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                  Return
                </th>
                <th scope="col" className="py-2.5 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                  Basis
                </th>
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <ReturnRow
                  key={p}
                  label={p === "SI" ? inceptionLabel : PERIOD_LABEL[p]}
                  result={returns[p]}
                  faceValue={row.faceValue}
                />
              ))}
            </tbody>
          </table>
        </Rise>

        {/* ---- NAV history ---- */}
        <Rise delay={0.08} className="min-w-0">
          <h3 className="text-[15px] font-medium leading-[24px] text-ink">NAV history</h3>
          <p className="mt-1 mb-5 text-[13px] leading-[20px] text-muted">
            This scheme only, on its own axis. Every point is a NAV AMFI
            published on that date.
          </p>
          <NavHistory points={points} label={row.shortName} />
        </Rise>
      </div>

      {/* ---- Monthly returns ---- */}
      <Rise className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className="text-[15px] font-medium leading-[24px] text-ink">
            Monthly returns
          </h3>
          <MethodologyLink anchor="#monthly-returns">How months are measured</MethodologyLink>
        </div>
        <p className="mt-1 text-[13px] leading-[20px] text-muted">
          Completed calendar months only, month-end NAV to month-end NAV.
        </p>
        {row.monthly.length === 0 ? (
          <p className="mt-5 border-t border-hairline pt-4">
            <NotCaptured
              reason="insufficient-history"
              detail="No calendar month has completed since this scheme's first published NAV."
            />
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-3 gap-px border border-hairline bg-hairline sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12">
            {row.monthly.map((m) => {
              const grade = heatGrade(m.pct, "1M");
              return (
                <li key={m.month} className={`px-3 py-3 ${HEAT_CELL[grade]}`}>
                  <span className="block text-[12px] leading-[16px]">
                    {formatMonth(m.month)}
                  </span>
                  <span className="tabular mt-1 block text-[15px] font-medium leading-[22px]">
                    {formatPct(m.pct)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Rise>

      <Rise className="mt-10 border-t border-hairline pt-5">
        <p className="max-w-[86ch] text-[13px] leading-[20px] text-body">
          {PAST_PERFORMANCE_NOTE}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <SourceNote sources={[{ label: "AMFI", href: navSourceUrl }]} />
          {row.navAsOf ? (
            <AsOf as="span" iso={row.navAsOf} format={formatUpdated} />
          ) : null}
        </div>
      </Rise>
    </SifSection>
  );
}

function ReturnRow({
  label,
  result,
  faceValue,
}: {
  label: string;
  result: ReturnResult;
  faceValue: number;
}) {
  return (
    <tr className="border-b border-hairline align-top">
      <th scope="row" className="py-3 pr-4 text-[15px] font-normal leading-[24px] text-ink">
        {label}
      </th>
      <td className="py-3 pr-4 text-right leading-[24px]">
        {result.status === "ok" ? (
          <Delta pct={result.pct} className="text-[15px]" />
        ) : (
          <NotCaptured
            reason={result.status}
            detail={
              result.needsFrom
                ? `Needs a published NAV on or near ${formatUpdated(result.needsFrom)}.`
                : undefined
            }
          />
        )}
      </td>
      <td className="py-3 text-[13px] leading-[20px] text-muted">
        {result.status === "ok" ? (
          <>
            {result.annualised ? "Annualised (CAGR)" : "Absolute"}
            <span className="tabular block">
              {result.basis === "face-value"
                ? `From ${formatInr(faceValue)} face value, ${formatUpdated(result.from.date)}`
                : `From ${formatUpdated(result.from.date)}`}{" "}
              to {formatUpdated(result.to.date)}
            </span>
          </>
        ) : result.needsFrom ? (
          <span className="tabular">History from {formatUpdated(result.needsFrom)} needed</span>
        ) : null}
      </td>
    </tr>
  );
}
