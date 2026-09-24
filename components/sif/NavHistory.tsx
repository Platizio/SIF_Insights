"use client";

import { useMemo, useState } from "react";
import { NavSeriesChart } from "@/components/NavSeriesChart";
import { Segmented } from "@/components/ui/Segmented";
import type { NavPoint } from "@/lib/data/types";

/* ============================================================
   The NAV history chart with its period switch — the ONE client
   island on /sif/[id].

   It receives this scheme's own published NAVs and nothing else, so
   no other scheme's history reaches the browser. The window is
   counted back from the scheme's LATEST published NAV, not from the
   reader's clock: the page is built statically and the series ends
   where AMFI's file ends.

   A window the series does not reach back to is shown but inert —
   drawing a "1Y" chart over four months of history would label a
   shorter line as a year.
   ============================================================ */

const WINDOWS = [
  { id: "1M", months: 1 },
  { id: "3M", months: 3 },
  { id: "6M", months: 6 },
  { id: "1Y", months: 12 },
  { id: "SI", months: null },
] as const;

type WindowId = (typeof WINDOWS)[number]["id"];

/** ISO date `months` calendar months before `iso`, clamped to month end. */
function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function NavHistory({ points, label }: { points: NavPoint[]; label: string }) {
  const first = points[0]?.date ?? null;
  const last = points[points.length - 1]?.date ?? null;

  const options = useMemo(
    () =>
      WINDOWS.map((w) => ({
        id: w.id as WindowId,
        label: w.id === "SI" ? "Since first NAV" : w.id,
        disabled:
          w.months === null || !first || !last
            ? false
            : monthsBefore(last, w.months) < first,
      })),
    [first, last],
  );

  const [value, setValue] = useState<WindowId>("SI");

  const shown = useMemo(() => {
    const w = WINDOWS.find((x) => x.id === value);
    if (!w || w.months === null || !last) return points;
    const from = monthsBefore(last, w.months);
    /* Start at the last published NAV on or before the window's start, so
       the line spans the whole window rather than the first point after it. */
    let start = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].date <= from) start = i;
      else break;
    }
    return points.slice(start);
  }, [points, value, last]);

  return (
    <div>
      <Segmented
        legend="NAV history period"
        options={options}
        value={value}
        onChange={setValue}
      />
      <div className="mt-6">
        <NavSeriesChart points={shown} label={`${label}, NAV history`} />
      </div>
    </div>
  );
}
