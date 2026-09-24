"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { RiskBand } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { cn } from "@/lib/cn";
import { formatPct } from "@/lib/format";

import { CategoryFilter } from "./CategoryFilter";
import {
  HEAT_EDGES,
  HEAT_LEGEND,
  HEAT_NA_CLASS,
  PERIOD_LABEL,
  TRACKER_PERIODS,
  applyFilter,
  heatClass,
  returnHeading,
  selectionNoun,
  sifHref,
  sortHeatRows,
  type CategoryChoice,
  type HeatSortKey,
  type SortDir,
  type StrategyChoice,
  type StrategyDef,
  type TrackerRow,
} from "./model";

/* ============================================================
   3 · SIF Performance Heatmap (PRD p.25–26) — the tracker's core.

   A real table: one row per SIF, the scheme's context (AMC,
   strategy, risk band) beside seven period columns. Every cell PRINTS
   its signed return; the fill grades it (heatGrade, spec §9) and is
   never the only signal. A period a scheme is too young for is a
   neutral "N/A", never a zero and never a guess.

   Sortable by any column (aria-sort on the active header). A row
   missing the sorted value sorts last in both directions. On phones
   the name column sticks and the table scrolls inside its own frame,
   never the page.
   ============================================================ */

const TEXT_COLUMNS: { key: Exclude<HeatSortKey, (typeof TRACKER_PERIODS)[number]>; label: string }[] = [
  { key: "amc", label: "AMC" },
  { key: "strategy", label: "Strategy" },
  { key: "risk", label: "Risk Band" },
];

const KEY_NAME: Record<HeatSortKey, string> = {
  name: "SIF name",
  amc: "AMC",
  strategy: "strategy",
  risk: "risk band",
  "1W": returnHeading("1W"),
  "1M": returnHeading("1M"),
  "3M": returnHeading("3M"),
  "6M": returnHeading("6M"),
  "1Y": returnHeading("1Y"),
  "2Y": returnHeading("2Y"),
  SI: returnHeading("SI"),
};

/** Returns open highest-first; names and bands open A→Z / low→high. */
const FIRST_DIR = (key: HeatSortKey): SortDir =>
  key === "name" || key === "amc" || key === "strategy" || key === "risk" ? "asc" : "desc";

export function Heatmap({
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
  const [sort, setSort] = useState<{ key: HeatSortKey; dir: SortDir }>({ key: "name", dir: "asc" });

  const shown = sortHeatRows(applyFilter(rows, category, strategy), sort.key, sort.dir);
  const noun = selectionNoun(category, strategy, strategies);

  const toggle = (key: HeatSortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DIR(key) },
    );

  const sortText = `${KEY_NAME[sort.key]}, ${
    sort.key === "name" || sort.key === "amc" || sort.key === "strategy"
      ? sort.dir === "asc"
        ? "A to Z"
        : "Z to A"
      : sort.dir === "asc"
        ? "lowest first"
        : "highest first"
  }`;

  return (
    <div>
      <div className="grid gap-8 border-y border-hairline py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
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
        <Legend />
      </div>

      <p className="mt-6 text-[13px] leading-[20px] text-muted" aria-live="polite">
        <span className="tabular">{shown.length}</span> {noun}, sorted by {sortText}. Select a column
        heading to sort.
      </p>

      <div className="mt-4 border border-hairline bg-surface">
        <div
          role="region"
          aria-label="SIF performance heatmap"
          tabIndex={0}
          className="relative overflow-x-auto overscroll-x-contain"
        >
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <caption className="sr-only">
              Returns by period for {shown.length} {noun}, NAV data as of {asOfLabel}. Sorted by {sortText}.
            </caption>
            <thead>
              <tr>
                <SortTh
                  sortKey="name"
                  sort={sort}
                  onSort={toggle}
                  sticky
                  className="min-w-[176px] pl-5 sm:min-w-[240px] sm:pl-6"
                >
                  SIF Name
                </SortTh>
                {TEXT_COLUMNS.map((c) => (
                  <SortTh key={c.key} sortKey={c.key} sort={sort} onSort={toggle}>
                    {c.label}
                  </SortTh>
                ))}
                {TRACKER_PERIODS.map((p) => (
                  <SortTh
                    key={p}
                    sortKey={p}
                    sort={sort}
                    onSort={toggle}
                    align="right"
                    className={cn("w-[92px]", p === "SI" && "pr-5 sm:pr-6")}
                    srLabel={returnHeading(p)}
                  >
                    {p === "SI" ? "Since Inception" : PERIOD_LABEL[p].short}
                  </SortTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="border-t border-hairline">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface py-3 pl-5 pr-4 text-left align-middle font-normal after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-hairline sm:pl-6"
                  >
                    <Link
                      href={sifHref(row.id)}
                      className="text-[15px] leading-[22px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                    >
                      {row.shortName}
                    </Link>
                  </th>
                  <td className="px-4 py-3 align-middle text-[13px] leading-[20px] text-body">{row.brand}</td>
                  <td className="min-w-[168px] px-4 py-3 align-middle text-[13px] leading-[20px] text-body">
                    {row.strategyLabel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-middle">
                    <RiskBand band={row.riskBand} />
                  </td>
                  {TRACKER_PERIODS.map((p) => {
                    const cell = row.returns[p];
                    return "v" in cell && Number.isFinite(cell.v) ? (
                      <td
                        key={p}
                        className={cn(
                          "tabular border-2 border-surface px-3 py-3 text-right align-middle text-[13px] leading-[20px]",
                          heatClass(cell.v, p),
                        )}
                      >
                        {formatPct(cell.v)}
                      </td>
                    ) : (
                      <td
                        key={p}
                        className={cn(
                          "border-2 border-surface px-3 py-3 text-right align-middle text-[13px] leading-[20px]",
                          HEAT_NA_CLASS,
                        )}
                      >
                        {"absent" in cell && cell.absent === "not-captured" ? (
                          <NotCaptured />
                        ) : (
                          <span title="Insufficient history">
                            N/A<span className="sr-only"> — Insufficient history</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortTh({
  sortKey,
  sort,
  onSort,
  children,
  align = "left",
  sticky = false,
  srLabel,
  className,
}: {
  sortKey: HeatSortKey;
  sort: { key: HeatSortKey; dir: SortDir };
  onSort: (key: HeatSortKey) => void;
  children: ReactNode;
  align?: "left" | "right";
  sticky?: boolean;
  /** The full column name, where the visible heading is abbreviated. */
  srLabel?: string;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "px-4 py-3 align-bottom font-normal",
        align === "right" ? "text-right" : "text-left",
        sticky &&
          "sticky left-0 z-20 bg-surface after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-hairline",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[4px] text-[12px] uppercase leading-[14px] tracking-[0.06em] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink",
          align === "right" && "flex-row-reverse",
          active ? "text-ink" : "text-muted",
        )}
      >
        {srLabel ? (
          <>
            <span aria-hidden="true">{children}</span>
            <span className="sr-only">{srLabel}</span>
          </>
        ) : (
          children
        )}
        <SortGlyph dir={active ? sort.dir : null} />
      </button>
    </th>
  );
}

/** ▲ ascending, ▼ descending, a faint pair when the column is not the sort. */
function SortGlyph({ dir }: { dir: SortDir | null }) {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden="true" className="shrink-0">
      <path d="M4 0 8 4H0z" className={dir === "asc" ? "fill-current" : "fill-hairline"} />
      <path d="M4 10 0 6h8z" className={dir === "desc" ? "fill-current" : "fill-hairline"} />
    </svg>
  );
}

/** The grade bands, as a scale: loss on the left, gain on the right, edges ticked between. */
function Legend() {
  const [a, b, c] = HEAT_EDGES.long;
  const [sa, sb, sc] = HEAT_EDGES.short;
  const ticks = [`−${c}`, `−${b}`, `−${a}`, "0", `+${a}`, `+${b}`, `+${c}`];

  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
        Return scale, %
      </figcaption>
      <div className="flex items-start gap-5">
        <div className="w-[256px] max-w-full">
          <div className="flex" aria-hidden="true">
            {HEAT_LEGEND.map((g) => (
              <span key={g.grade} className={cn("h-3 flex-1 border-r-2 border-ground last:border-r-0", g.className)} />
            ))}
          </div>
          <div className="relative mt-1.5 h-[14px]" aria-hidden="true">
            {ticks.map((t, i) => (
              <span
                key={t}
                className="tabular absolute top-0 -translate-x-1/2 text-[12px] leading-[14px] text-muted"
                style={{ left: `${((i + 1) / 8) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className={cn("h-3 w-6", HEAT_NA_CLASS)} />
          <span className="text-[12px] leading-[14px] text-muted">N/A</span>
        </div>
      </div>
      <p className="mt-3 max-w-[44ch] text-[12px] leading-[18px] text-muted">
        Darker green, larger gain; darker red, larger loss. Bands at {a}%, {b}% and {c}% for 1M and
        longer; {sa}%, {sb}% and {sc}% for 1W. N/A: insufficient history.
      </p>
    </figure>
  );
}
