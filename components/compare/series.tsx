import { cn } from "@/lib/cn";

/* ============================================================
   The four compare series — one per selected slot, in slot order.

   Colour is never the only carrier: each series also has its own
   dash pattern (solid · dashed · dotted · dash-dot), and every chart
   line is labelled directly at its end. The same swatch heads the
   SIF's column in every table, so "the dashed ink line" and "the
   second column" are visibly the same scheme all the way down.

   Literal class strings — Tailwind scans source text.
   No hooks and no directive: server and client both render it.
   ============================================================ */

export const SERIES = [
  { stroke: "stroke-series-1", text: "text-series-1", bg: "bg-series-1", dash: undefined, width: 2, tone: "accent" },
  { stroke: "stroke-series-2", text: "text-series-2", bg: "bg-series-2", dash: "7 4", width: 1.75, tone: "ink" },
  { stroke: "stroke-series-3", text: "text-series-3", bg: "bg-series-3", dash: "0.5 4.5", width: 2.5, tone: "series-3" },
  { stroke: "stroke-series-4", text: "text-series-4", bg: "bg-series-4", dash: "10 3.5 2 3.5", width: 1.75, tone: "series-4" },
] as const;

export type SeriesIndex = 0 | 1 | 2 | 3;

export function seriesOf(index: number) {
  return SERIES[Math.max(0, Math.min(3, index)) as SeriesIndex];
}

/** A short sample of the series' line: colour AND dash, as the chart draws it. */
export function SeriesSwatch({ index, className }: { index: number; className?: string }) {
  const s = seriesOf(index);
  return (
    <svg
      width="22"
      height="8"
      viewBox="0 0 22 8"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <line
        x1="1.5"
        y1="4"
        x2="20.5"
        y2="4"
        fill="none"
        className={s.stroke}
        strokeWidth={s.width}
        strokeDasharray={s.dash}
        strokeLinecap="round"
      />
    </svg>
  );
}
