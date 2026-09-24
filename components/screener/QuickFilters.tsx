"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { Period, SifRow } from "@/lib/data/types";
import { Segmented } from "@/components/ui/Segmented";
import { FilterIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { fieldLabel, getField, type Field, type ScreenState } from "@/lib/screener/fields";
import { PILL_BASE, PILL_IDLE, PILL_ON } from "./bits";
import { FieldFilter, OptionList, RangeFilter, type Commit } from "./controls";
import { FilterPopover } from "./FilterPopover";
import { coverage } from "./model";

/* ============================================================
   The quick bar (PRD p.32): Category | Strategy | AMC |
   Performance | Risk | AUM | More Filters.

   Each menu writes the same filters the advanced panel does — they
   are two views of one screen, so a value set here shows there and a
   chip removes it from both.
   ============================================================ */

/** Return periods, in the order the PRD lists them, with their field ids. */
export const RETURN_PERIODS: { period: Period; id: string; label: string }[] = [
  { period: "1D", id: "r1d", label: "1D" },
  { period: "1W", id: "r1w", label: "1W" },
  { period: "1M", id: "r1m", label: "1M" },
  { period: "3M", id: "r3m", label: "3M" },
  { period: "6M", id: "r6m", label: "6M" },
  { period: "1Y", id: "r1y", label: "1Y" },
  { period: "2Y", id: "r2y", label: "2Y" },
  { period: "SI", id: "rsi", label: "SI" },
];

const QUICK_IDS = new Set(["cat", "str", "amc", "risk", "aum", ...RETURN_PERIODS.map((p) => p.id)]);

/** Filters the quick bar cannot show — counted on the More Filters pill. */
export function moreFilterCount(state: ScreenState): number {
  return Object.keys(state.filters).filter((id) => !QUICK_IDS.has(id)).length;
}

function setCount(state: ScreenState, id: string): number {
  const v = state.filters[id];
  return v?.t === "set" ? v.ids.length : v ? 1 : 0;
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-2", className)}>{children}</div>;
}

export function QuickFilters({
  rows,
  state,
  commit,
  onMore,
  moreRef,
}: {
  rows: SifRow[];
  state: ScreenState;
  commit: Commit;
  onMore: () => void;
  moreRef: RefObject<HTMLButtonElement | null>;
}) {
  const ctx = { rows, state, commit };
  const field = (id: string) => getField(id) as Field;

  const perfActive = RETURN_PERIODS.filter((p) => state.filters[p.id]).length;
  const more = moreFilterCount(state);

  return (
    <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-2">
      <FilterPopover label="Category" count={setCount(state, "cat")}>
        <Panel>
          <OptionList field={field("cat")} {...ctx} />
        </Panel>
      </FilterPopover>

      <FilterPopover label="Strategy" count={setCount(state, "str")}>
        <Panel>
          <FieldFilter field={field("str")} {...ctx} />
        </Panel>
      </FilterPopover>

      <FilterPopover label="AMC" count={setCount(state, "amc")}>
        <Panel>
          <OptionList field={field("amc")} {...ctx} scroll />
        </Panel>
      </FilterPopover>

      <FilterPopover label="Performance" count={perfActive} width="md">
        <PerformancePanel rows={rows} state={state} commit={commit} />
      </FilterPopover>

      <FilterPopover label="Risk" count={setCount(state, "risk")}>
        <Panel>
          <OptionList field={field("risk")} {...ctx} />
        </Panel>
      </FilterPopover>

      <FilterPopover label="AUM" count={setCount(state, "aum")} width="md">
        <Panel className="p-4">
          <p className="mb-3 text-[13px] leading-[20px] text-body">SIF AUM, ₹ crore</p>
          <RangeFilter field={field("aum")} {...ctx} />
        </Panel>
      </FilterPopover>

      <button
        ref={moreRef}
        type="button"
        onClick={onMore}
        aria-haspopup="dialog"
        className={cn(PILL_BASE, "inline-flex items-center gap-2", more > 0 ? PILL_ON : PILL_IDLE)}
      >
        <FilterIcon size={14} />
        <span>More filters</span>
        {more > 0 ? (
          <span className="tabular text-[12px] text-ink">
            <span className="sr-only">, </span>
            {more}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

/**
 * Period picker + min/max. Opens on the first period already filtered, else
 * 6M (the registry's quick return). Periods no SIF is old enough for are
 * listed but inert, and the panel says why.
 */
function PerformancePanel({
  rows,
  state,
  commit,
}: {
  rows: SifRow[];
  state: ScreenState;
  commit: Commit;
}) {
  const [period, setPeriod] = useState<Period>(
    () => RETURN_PERIODS.find((p) => state.filters[p.id])?.period ?? "6M",
  );
  const current = RETURN_PERIODS.find((p) => p.period === period) ?? RETURN_PERIODS[4];
  const field = getField(current.id) as Field;
  const empty = RETURN_PERIODS.filter((p) => coverage(getField(p.id) as Field, rows) === 0);

  return (
    <div className="space-y-4 p-4">
      <Segmented
        legend="Return period"
        value={period}
        onChange={setPeriod}
        options={RETURN_PERIODS.map((p) => ({
          id: p.period,
          label: (
            <>
              {p.label}
              {state.filters[p.id] ? <span className="sr-only"> (filtered)</span> : null}
            </>
          ),
          disabled: empty.some((e) => e.id === p.id) && !state.filters[p.id],
        }))}
      />
      <div>
        <p className="mb-3 text-[13px] leading-[20px] text-body">{fieldLabel(field, rows)}, %</p>
        <RangeFilter key={field.id} field={field} rows={rows} state={state} commit={commit} />
      </div>
      {empty.length ? (
        <p className="border-t border-hairline pt-3 text-[12px] leading-[18px] text-muted">
          No SIF has the history for {empty.map((p) => p.label).join(" or ")} returns yet.
        </p>
      ) : null}
    </div>
  );
}
