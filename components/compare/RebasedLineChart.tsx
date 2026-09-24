"use client";

import { motion } from "motion/react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useRevealed } from "@/components/motion/Reveal";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { formatMonth, formatPct, formatUpdated } from "@/lib/format";
import { DUR, EASE, ENTER } from "@/lib/motion";
import {
  CHART_PERIODS,
  chartWindow,
  defaultPeriod,
  epochDay,
  isoOfDay,
  percentTicks,
  sampleDates,
  valueOn,
  type ChartPeriod,
  type ChartWindow,
  type Rebased,
} from "./rebase";
import { SeriesSwatch, seriesOf } from "./series";

/* ============================================================
   Growth of the selected SIFs over one common window, rebased to
   100 at its start. Never absolute NAV (see ./rebase.ts).

   · Colour + dash pattern + a direct label at each line's end, so
     no series depends on hue alone.
   · The reading line follows the pointer, and the arrow keys when
     the plot has focus; the readout above the plot is the tooltip,
     so nothing floats over the lines.
   · A visually hidden table carries the same figures for screen
     readers.

   REVEAL. The lines are unveiled by a left-to-right clip — the
   plotting gesture — rather than by <DrawnPath>, because DrawnPath
   draws with stroke-dasharray, which would erase the dash patterns
   that distinguish the series. The clip is a hand-rolled reveal with
   `data-reveal` + useRevealed, so both safety nets (noscript and
   html.reveals-forced, which reset clip-path) open it; the dashed
   paths themselves carry no data-reveal, so the nets' dasharray reset
   never touches their patterns.
   ============================================================ */

export type ChartSeries = { code: string; name: string; points: [string, number][] };

const HOLD = "inset(0 100% 0 0)";
const OPEN = "inset(0 0% 0 0)";

function Unveil({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref, ENTER.chart);
  return (
    <motion.div
      ref={ref}
      data-reveal=""
      aria-hidden="true"
      className="absolute inset-0"
      initial={{ clipPath: HOLD }}
      animate={{ clipPath: revealed ? OPEN : HOLD }}
      transition={{ duration: DUR.wipe, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

function tickText(t: number): string {
  if (t === 0) return "0%";
  return `${t > 0 ? "+" : "−"}${Number(Math.abs(t).toFixed(2))}%`;
}

function dayMonth(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Index of the observation day nearest `day`. `days` ascending. */
function nearest(days: readonly number[], day: number): number {
  let lo = 0;
  let hi = days.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (days[mid] <= day) lo = mid;
    else hi = mid;
  }
  return Math.abs(days[hi] - day) < Math.abs(days[lo] - day) ? hi : lo;
}

/** End labels pushed apart so none overlaps, then kept inside the plot. */
function spread(ys: { code: string; y: number }[], gap: number): Map<string, number> {
  const sorted = [...ys].sort((a, b) => a.y - b.y).map((l) => ({ ...l }));
  for (let i = 1; i < sorted.length; i += 1) {
    sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + gap);
  }
  const overflow = (sorted.at(-1)?.y ?? 0) - 100;
  if (overflow > 0) for (const l of sorted) l.y -= overflow;
  return new Map(sorted.map((l) => [l.code, l.y]));
}

export function RebasedLineChart({
  series,
  siLabel,
}: {
  /** Slot order — index i draws in series colour i. */
  series: ChartSeries[];
  /** The since-first-NAV chip's label, resolved on the server from the registry. */
  siLabel: string;
}) {
  const windows = useMemo(
    () =>
      Object.fromEntries(CHART_PERIODS.map((p) => [p, chartWindow(series, p)])) as Record<
        ChartPeriod,
        ChartWindow
      >,
    [series],
  );
  const [chosen, setChosen] = useState<ChartPeriod | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  /* A chosen period that the current selection cannot draw (the reader
     swapped a SIF) falls back to the default rather than going blank. */
  const period = chosen && windows[chosen].enabled ? chosen : defaultPeriod(windows);
  const w = period ? windows[period] : null;

  const slot = useMemo(() => new Map(series.map((s, i) => [s.code, i])), [series]);
  const nameOf = (code: string) => series[slot.get(code) ?? 0]?.name ?? code;

  const geometry = useMemo(() => {
    if (!w || !w.enabled || !w.start || !w.end) return null;
    const s0 = epochDay(w.start);
    const e0 = epochDay(w.end);
    const span = Math.max(1, e0 - s0);
    const values = w.included.flatMap((r) => r.points.map((p) => p.value - 100));
    const axis = percentTicks(Math.min(...values), Math.max(...values));
    const range = axis.max - axis.min || 1;
    const x = (day: number) => ((day - s0) / span) * 100;
    const y = (pct: number) => (1 - (pct - axis.min) / range) * 100;
    const paths = w.included.map((r) => ({
      r,
      d: r.points
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(3)} ${y(p.value - 100).toFixed(3)}`)
        .join(" "),
    }));
    const days = [...new Set(w.included.flatMap((r) => r.points.map((p) => p.day)))].sort(
      (a, b) => a - b,
    );
    /* Four ticks, or fewer when the window is only days long — never the
       same date printed twice. */
    const xTicks = [...new Set([0, 1, 2, 3].map((i) => Math.round(s0 + (i * span) / 3)))];
    return { s0, e0, span, axis, x, y, paths, days, xTicks };
  }, [w]);

  const choose = (p: ChartPeriod) => {
    setChosen(p);
    setHover(null);
  };

  const options = CHART_PERIODS.map((p) => ({
    id: p,
    label: p === "SI" ? siLabel : p,
    disabled: !windows[p].enabled,
  }));

  if (!w || !geometry) {
    return (
      <p className="max-w-[68ch] border border-hairline bg-surface px-6 py-5 text-[15px] leading-[26px] text-body">
        A growth chart needs at least two of the selected SIFs with published NAVs over a common
        period, and the selection does not have one yet. The returns table above shows what each
        SIF holds.
      </p>
    );
  }

  const { s0, span, axis, x, y, paths, days, xTicks } = geometry;
  /* An index from a previous selection may not exist in this one. */
  const at = hover !== null && hover < days.length ? hover : null;
  const readDay = at !== null ? days[at] : days[days.length - 1];
  const reading = w.included.map((r) => ({ r, p: valueOn(r, readDay) }));
  const labelY = spread(
    w.included.map((r) => ({ code: r.code, y: y(r.changePct) })),
    9,
  );
  const long = span > 100;

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const frac = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(nearest(days, s0 + frac * span));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const from = at ?? last;
    const next =
      e.key === "ArrowLeft"
        ? Math.max(0, from - 1)
        : e.key === "ArrowRight"
          ? Math.min(last, from + 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : e.key === "Escape"
                ? null
                : undefined;
    if (next === undefined) return;
    e.preventDefault();
    setHover(next);
  };

  const sampled = sampleDates(
    days.map((d) => isoOfDay(d)),
    12,
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Segmented<ChartPeriod>
          legend="Chart period"
          options={options}
          value={w.period}
          onChange={choose}
        />
        <p className="asof sm:text-right">
          Rebased to 100 on <time dateTime={w.start ?? undefined}>{formatUpdated(w.start!)}</time>
        </p>
      </div>

      <figure className="m-0 mt-6 border border-hairline bg-surface p-4 sm:p-6">
        {/* The readout: the tooltip, in the flow rather than over the lines. */}
        <div aria-live="polite" className="min-h-[44px]">
          <p className="text-[13px] leading-[20px] text-muted">
            {at === null ? "Latest" : "On"}{" "}
            <time dateTime={isoOfDay(readDay)}>{formatUpdated(isoOfDay(readDay))}</time>
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {reading.map(({ r, p }) => (
              <li key={r.code} className="flex items-center gap-2 text-[13px] leading-[20px]">
                <SeriesSwatch index={slot.get(r.code) ?? 0} />
                <span className="max-w-[220px] truncate text-body">{nameOf(r.code)}</span>
                <span className="tabular text-ink">{p ? formatPct(p.value - 100) : "—"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-5 h-[260px] sm:h-[320px]">
          {/* y axis: % change from the window start; 0% is the rebased 100. */}
          <div aria-hidden="true" className="absolute inset-y-3 left-0 w-12">
            {axis.ticks.map((t) => (
              <span
                key={t}
                className="tabular absolute right-2 -translate-y-1/2 text-[12px] leading-[14px] text-muted"
                style={{ top: `${y(t)}%` }}
              >
                {tickText(t)}
              </span>
            ))}
          </div>

          <div
            role="group"
            tabIndex={0}
            aria-label="Growth chart. Use the left and right arrow keys to read each date's values."
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
            className="absolute inset-y-3 left-12 right-[72px] touch-pan-y sm:right-[96px]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {axis.ticks.map((t) => (
                <line
                  key={t}
                  x1="0"
                  x2="100"
                  y1={y(t)}
                  y2={y(t)}
                  className={t === 0 ? "stroke-muted" : "stroke-hairline"}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <Unveil key={w.period}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
              >
                {paths.map(({ r, d }) => {
                  const s = seriesOf(slot.get(r.code) ?? 0);
                  return (
                    <path
                      key={r.code}
                      d={d}
                      fill="none"
                      className={s.stroke}
                      strokeWidth={s.width}
                      strokeDasharray={s.dash}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            </Unveil>

            {at !== null ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0" style={{ left: `${x(readDay)}%` }}>
                <span className="absolute inset-y-0 w-px -translate-x-1/2 bg-muted" />
                {reading.map(({ r, p }) =>
                  p ? (
                    <span
                      key={r.code}
                      className={cn(
                        "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface",
                        seriesOf(slot.get(r.code) ?? 0).bg,
                      )}
                      style={{ top: `${y(p.value - 100)}%` }}
                    />
                  ) : null,
                )}
              </div>
            ) : null}
          </div>

          {/* Direct end labels — the growth over the window, beside each line. */}
          <div aria-hidden="true" className="absolute inset-y-3 right-0 w-[64px] sm:w-[88px]">
            {w.included.map((r) => (
              <span
                key={r.code}
                className="absolute left-0 flex max-w-full -translate-y-1/2 items-center gap-1.5 text-[12px] leading-[14px]"
                style={{ top: `${labelY.get(r.code) ?? y(r.changePct)}%` }}
              >
                <SeriesSwatch index={slot.get(r.code) ?? 0} className="hidden w-[14px] sm:block" />
                <span className="tabular text-ink">{formatPct(r.changePct)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* x axis: time, not observation count. */}
        <div aria-hidden="true" className="relative ml-12 mr-[72px] h-6 sm:mr-[96px]">
          {xTicks.map((d, i) => (
            <span
              key={d}
              className={cn(
                "tabular absolute top-2 whitespace-nowrap text-[12px] leading-[14px] text-muted",
                i === 0
                  ? "translate-x-0"
                  : i === xTicks.length - 1
                    ? "-translate-x-full"
                    : /* Four dates do not fit a phone's plot; the ends do. */
                      "hidden -translate-x-1/2 sm:block",
              )}
              style={{ left: `${x(d)}%` }}
            >
              {long ? formatMonth(isoOfDay(d).slice(0, 7)) : dayMonth(isoOfDay(d))}
            </span>
          ))}
        </div>

        <figcaption className="mt-5 max-w-[72ch] text-[13px] leading-[20px] text-muted">
          {w.period === "SI" && w.limitedBy ? (
            <>
              Common period from {formatUpdated(w.start!)}, the first published NAV of{" "}
              {nameOf(w.limitedBy)} — the youngest of the selected SIFs.{" "}
            </>
          ) : (
            <>
              {formatUpdated(w.start!)} to {formatUpdated(w.end!)}.{" "}
            </>
          )}
          Each line is rebased to 100 at the start and shows the % change since, measured on
          published NAVs only; the line joins them and does not assert a value on the days between.
          Absolute NAVs are not compared — face values differ across SIFs.
        </figcaption>

        {w.excluded.length > 0 ? (
          <ul className="mt-3 text-[13px] leading-[20px] text-muted">
            {w.excluded.map((e) => (
              <li key={e.code} className="flex items-start gap-2">
                <SeriesSwatch index={slot.get(e.code) ?? 0} className="mt-1.5" />
                <span>
                  {nameOf(e.code)}: N/A — Insufficient history for this window.{" "}
                  {e.firstDate
                    ? `Its published NAV history starts ${formatUpdated(e.firstDate)}, after the window opens, so it is left out rather than extended.`
                    : "No published NAV is held for it."}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <DataTable
          included={w.included}
          sampled={sampled}
          nameOf={nameOf}
          start={w.start!}
        />
      </figure>
    </div>
  );
}

function DataTable({
  included,
  sampled,
  nameOf,
  start,
}: {
  included: Rebased[];
  sampled: string[];
  nameOf: (code: string) => string;
  start: string;
}) {
  /* The WRAPPER is visually hidden, not the table: a table ignores the 1px
     width `sr-only` gives it and still widens the page on a phone. */
  return (
    <div className="sr-only">
      <table>
        <caption>
          Growth of the selected SIFs, rebased to 100 on {formatUpdated(start)}: % change on sampled
          dates.
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {included.map((r) => (
              <th key={r.code} scope="col">
                {nameOf(r.code)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampled.map((date) => {
            const day = epochDay(date);
            return (
              <tr key={date}>
                <th scope="row">{formatUpdated(date)}</th>
                {included.map((r) => {
                  const p = valueOn(r, day);
                  return <td key={r.code}>{p ? formatPct(p.value - 100) : "N/A — Insufficient history"}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
