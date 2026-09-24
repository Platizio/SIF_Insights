"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { SifRow } from "@/lib/data/types";
import { fieldLabel, getField } from "@/lib/screener/fields";
import { CompareTable, registryRow, type CompareColumn } from "./table";

/* ============================================================
   Benchmark — each SIF's return beside its stated benchmark's, for
   one period at a time.

   Benchmark index returns are not held yet (the registry marks
   `bmr` and `xr` as planned), so those two rows say "Not captured"
   honestly rather than borrowing an index series we have not
   sourced. The SIF's own return is the registry's, so it matches the
   Performance table figure for figure.
   ============================================================ */

const PERIODS = ["1M", "3M", "6M", "1Y", "SI"] as const;
type BenchPeriod = (typeof PERIODS)[number];

const RETURN_FIELD: Record<BenchPeriod, string> = {
  "1M": "r1m",
  "3M": "r3m",
  "6M": "r6m",
  "1Y": "r1y",
  SI: "rsi",
};

export function BenchmarkCompare({
  rows,
  columns,
}: {
  rows: SifRow[];
  columns: CompareColumn[];
}) {
  const [period, setPeriod] = useState<BenchPeriod>("1M");
  const si = getField("rsi");
  const siLabel = si ? fieldLabel(si, rows) : "Since inception";

  const sifReturn = registryRow(RETURN_FIELD[period], rows, { label: "SIF return" });

  return (
    <div>
      <Segmented<BenchPeriod>
        legend="Benchmark period"
        value={period}
        onChange={setPeriod}
        options={PERIODS.map((p) => ({ id: p, label: p === "SI" ? siLabel : p }))}
      />
      <CompareTable
        className="mt-6"
        caption={`Benchmark comparison, ${period === "SI" ? siLabel.toLowerCase() : period}`}
        columns={columns}
        rows={[
          registryRow("bm", rows, { label: "Benchmark name" }),
          /* The Performance table already marks the highest return; repeating
             it here would turn a reference row into a second league table. */
          { ...sifReturn, notes: undefined },
          registryRow("bmr", rows, { label: "Benchmark return" }),
          registryRow("xr", rows, { label: "Difference (excess return)" }),
        ]}
      />
    </div>
  );
}
