"use client";

import { useMemo } from "react";
import { DrawnDot, DrawnPath } from "@/components/motion/DrawnPath";
import { cn } from "@/lib/cn";
import { formatNav, formatUpdated, type NavPoint } from "@/lib/data";

/* ============================================================
   One scheme's published NAVs, plotted against its own axis.

   ONE scheme per chart, always. Two of the thirty are priced off a
   different face value (₹943 and ₹1,022 against ~₹10), so a shared
   axis or any side-by-side scale would rank them top and imply a
   performance they have not demonstrated. Each chart therefore
   carries its own min/max and states them.

   The x-axis is real time, not observation count: a scheme that
   published nothing for four days shows a longer flat run rather
   than hiding the gap. Only published NAVs are plotted — the line
   between two points is a join, not an estimate, and the caption
   says so.
   ============================================================ */

const VB = { w: 720, h: 200, padX: 8, padY: 16 } as const;

export type NavSeriesChartProps = {
  points: NavPoint[];
  /** Names the chart for assistive tech, e.g. the scheme name. */
  label: string;
  className?: string;
};

type Plotted = {
  d: string;
  last: { x: number; y: number };
  min: NavPoint;
  max: NavPoint;
  first: NavPoint;
  latest: NavPoint;
};

function plot(points: NavPoint[]): Plotted | null {
  if (points.length < 2) return null;

  const times = points.map((p) => new Date(`${p.date}T00:00:00Z`).getTime());
  const navs = points.map((p) => p.nav);

  const t0 = times[0];
  const tSpan = times[times.length - 1] - t0 || 1;
  const lo = Math.min(...navs);
  const hi = Math.max(...navs);
  /* A perfectly flat series has no range to divide by; centring it keeps the
     line on the baseline instead of producing NaN coordinates. */
  const vSpan = hi - lo || 1;

  const innerW = VB.w - VB.padX * 2;
  const innerH = VB.h - VB.padY * 2;
  const x = (t: number) => VB.padX + ((t - t0) / tSpan) * innerW;
  const y = (v: number) => VB.padY + (1 - (v - lo) / vSpan) * innerH;

  const coords = points.map((p, i) => ({ x: x(times[i]), y: y(p.nav) }));
  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");

  return {
    d,
    last: coords[coords.length - 1],
    min: points[navs.indexOf(lo)],
    max: points[navs.indexOf(hi)],
    first: points[0],
    latest: points[points.length - 1],
  };
}

export function NavSeriesChart({ points, label, className }: NavSeriesChartProps) {
  const shape = useMemo(() => plot(points), [points]);

  /* One point is not a line. Drawing a flat rule between a value and itself
     would assert stability across a period we hold no observations for. */
  if (!shape) {
    return (
      <p className={cn("text-[13px] leading-[20px] text-muted", className)}>
        {points.length === 1
          ? "One published NAV is held for this scheme — a series needs two. A line will appear once AMFI publishes the next."
          : "No published NAVs are held for this scheme yet."}
      </p>
    );
  }

  const { d, last, min, max, first, latest } = shape;

  return (
    <figure className={cn("m-0", className)}>
      <div className="border border-hairline bg-surface-2">
        <svg
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${label}: ${points.length} published net asset values from ${formatUpdated(first.date)} to ${formatUpdated(latest.date)}. Low ${formatNav(min.nav)}, high ${formatNav(max.nav)}, latest ${formatNav(latest.nav)}.`}
          className="block h-[200px] w-full text-accent sm:h-[240px]"
        >
          {/* Hairline bounds. On warm paper the rules are the design — they
              also carry the axis, which is why the values sit beside them. */}
          <line
            x1="0" y1={VB.padY} x2={VB.w} y2={VB.padY}
            className="stroke-hairline" strokeWidth="1"
            vectorEffect="non-scaling-stroke" aria-hidden="true"
          />
          <line
            x1="0" y1={VB.h - VB.padY} x2={VB.w} y2={VB.h - VB.padY}
            className="stroke-hairline" strokeWidth="1"
            vectorEffect="non-scaling-stroke" aria-hidden="true"
          />

          <DrawnPath d={d} strokeWidth={1.5} />
          <DrawnDot cx={last.x} cy={last.y} r={3} delay={1.15} />
        </svg>
      </div>

      {/* The axis, stated rather than drawn small: the extremes with the dates
          they occurred, so the chart is readable without hovering anything. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <Bound label="High" value={formatNav(max.nav)} when={max.date} />
        <Bound label="Low" value={formatNav(min.nav)} when={min.date} />
        <Bound label="First held" value={formatNav(first.nav)} when={first.date} />
        <Bound label="Latest" value={formatNav(latest.nav)} when={latest.date} />
      </dl>

      <figcaption className="mt-4 max-w-[68ch] text-[13px] leading-[20px] text-muted">
        {points.length} published net asset values, plotted on a time axis
        between {formatUpdated(first.date)} and {formatUpdated(latest.date)}.
        Each point is a NAV as filed with AMFI; the line joins them and does not
        assert a value on the days between. Past values are not a guide to
        future value.
      </figcaption>
    </figure>
  );
}

function Bound({
  label,
  value,
  when,
}: {
  label: string;
  value: string;
  when: string;
}) {
  return (
    <div>
      <dt className="text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd className="tabular text-[15px] leading-[22px] text-ink">{value}</dd>
      <dd className="tabular text-[13px] leading-[18px] text-muted">
        {formatUpdated(when)}
      </dd>
    </div>
  );
}
