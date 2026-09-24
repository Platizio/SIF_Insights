"use client";

import Link from "next/link";
import type { Amc, SifRow } from "@/lib/data/types";
import { AmcMark } from "@/components/AmcMark";
import { cn } from "@/lib/cn";
import { fieldLabel, isSortable, type Field, type ScreenState } from "@/lib/screener/fields";
import { CategoryChip, MiniRow, SelectBox, TEXT_BUTTON } from "./bits";
import type { Commit } from "./controls";
import { FieldValue } from "./FieldValue";
import { effectiveSort, headerSort, sortLabels } from "./model";

/* ============================================================
   Results — a real table from md up, cards below it.

   Both render the SAME filtered, sorted array, and both are in the
   server HTML (the default, unfiltered screen), so the page is a
   complete table with JavaScript off. Rows are plain <tr>/<li>: no
   reveal wrappers, because a row that re-mounts after every filter
   change must never pass through opacity 0.

   The first column — select + name — is sticky inside the table's own
   horizontal scroll, so a reader twelve columns across still knows
   which fund a figure belongs to. Selection tints the row, sticky cell
   included (the tint is opaque, so nothing shows through).
   ============================================================ */

type Props = {
  rows: SifRow[];
  /** Every row, for header labels that must hold across the table. */
  universe: SifRow[];
  columns: Field[];
  state: ScreenState;
  commit: Commit;
  picked: string[];
  onPick: (code: string) => void;
  amcs: Record<string, Amc>;
  onClear: () => void;
  hiddenTotal: number;
};

const sifHref = (r: SifRow) => `/sif/${r.id}`;

export function ResultsTable({ rows, universe, columns, state, commit, picked, onPick, onClear, hiddenTotal }: Props) {
  const [primary, secondary] = effectiveSort(state.sort);

  return (
    <div
      role="region"
      aria-label="Screener results"
      tabIndex={0}
      className="relative hidden overflow-x-auto border border-hairline bg-surface outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:block"
    >
      <table className="w-full min-w-max border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          SIFs matching the screen, one per row. Select up to four to compare.
        </caption>
        <thead>
          <tr>
            {columns.map((f, i) => {
              const sortable = isSortable(f);
              const key = [primary, secondary].find((k) => k?.id === f.id);
              const rank = key ? (key === primary ? 1 : 2) : 0;
              const dir = key?.dir ?? null;
              const right = f.column?.align === "right";
              const label = fieldLabel(f, universe);
              return (
                <th
                  key={f.id}
                  scope="col"
                  aria-sort={rank === 1 ? (dir === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined}
                  className={cn(
                    "border-b border-hairline px-4 py-3 align-bottom text-[12px] font-normal uppercase leading-[16px] tracking-[0.06em] text-muted",
                    right ? "text-right" : "text-left",
                    i === 0 && "sticky left-0 z-[2] border-r bg-surface pl-5",
                    i === columns.length - 1 && "pr-5",
                  )}
                >
                  {i === 0 ? <span className="sr-only">Select, </span> : null}
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => commit((s) => ({ ...s, sort: headerSort(s.sort, f) }))}
                      title={dir ? sortLabels(f)[dir] : `Sort by ${label}`}
                      className={cn(
                        "group inline-flex items-center gap-1.5 uppercase tracking-[0.06em] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink",
                        i === 0 && "pl-8",
                        right && "flex-row-reverse",
                        rank > 0 && "text-ink",
                      )}
                    >
                      <span className="max-w-[16ch] text-balance">{label}</span>
                      <SortGlyph dir={dir} />
                      {rank === 2 ? (
                        <span className="tabular text-[10px] text-muted">
                          2<span className="sr-only"> (second sort, {dir === "asc" ? "ascending" : "descending"})</span>
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span className={cn("inline-block max-w-[16ch] text-balance", i === 0 && "pl-8")}>
                      {label}
                      {f.id === "nav" ? <span className="sr-only"> (not sortable across face values)</span> : null}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                <Empty onClear={onClear} hiddenTotal={hiddenTotal} />
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const on = picked.includes(r.code);
              return (
                <tr key={r.code} className="group">
                  {columns.map((f, i) => {
                    const right = f.column?.align === "right";
                    const tint = on ? "bg-accent-wash" : "bg-surface group-hover:bg-surface-2";
                    if (i === 0) {
                      return (
                        <th
                          key={f.id}
                          scope="row"
                          className={cn(
                            "sticky left-0 z-[1] border-r border-b border-hairline py-3.5 pl-5 pr-4 text-left align-top font-normal transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                            tint,
                          )}
                        >
                          <span className="flex items-start gap-4">
                            <span className="pt-[3px]">
                              <SelectBox
                                id={`sel-d-${r.code}`}
                                label={`Select ${r.shortName} to compare`}
                                checked={on}
                                onToggle={() => onPick(r.code)}
                              />
                            </span>
                            <span className="min-w-0">
                              <Link
                                href={sifHref(r)}
                                className="block max-w-[34ch] text-[14px] font-medium leading-[20px] text-ink underline decoration-transparent underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
                              >
                                {r.shortName}
                              </Link>
                              <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
                                {r.brand} · <span className="tabular">{r.code}</span>
                              </span>
                            </span>
                          </span>
                        </th>
                      );
                    }
                    return (
                      <td
                        key={f.id}
                        className={cn(
                          "border-b border-hairline px-4 py-3.5 align-top transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                          tint,
                          right ? "whitespace-nowrap text-right" : "text-left",
                          !right && "min-w-[120px] max-w-[240px]",
                          i === columns.length - 1 && "pr-5",
                        )}
                      >
                        <FieldValue field={f} row={r} compact={right} />
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortGlyph({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg
      width="8"
      height="10"
      viewBox="0 0 8 10"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", dir ? "text-ink" : "text-hairline group-hover:text-muted")}
    >
      <path d="M4 1 1 4h6L4 1Z" fill="currentColor" opacity={dir === "desc" ? 0.25 : 1} />
      <path d="M4 9 1 6h6L4 9Z" fill="currentColor" opacity={dir === "asc" ? 0.25 : 1} />
    </svg>
  );
}

function Empty({ onClear, hiddenTotal }: { onClear: () => void; hiddenTotal: number }) {
  return (
    <div className="max-w-[60ch]">
      <p className="text-[14px] leading-[22px] text-ink">No SIF matches all of these criteria.</p>
      <p className="mt-1 text-[13px] leading-[20px] text-muted">
        {hiddenTotal > 0
          ? "Some SIFs were set aside only because a value is missing — use “Show them” above, or remove a filter to widen the screen."
          : "Remove a filter to widen the screen."}
      </p>
      <button type="button" onClick={onClear} className={cn(TEXT_BUTTON, "mt-3 -ml-3")}>
        Clear all filters
      </button>
    </div>
  );
}

/** Below md: one card per SIF, carrying the chosen columns as label/value lines. */
export function ResultCards({ rows, universe, columns, picked, onPick, amcs, onClear, hiddenTotal }: Props) {
  /* Name, AMC, category, strategy and risk are the card's own header. */
  const HEADER = new Set(["name", "amc", "cat", "str", "risk"]);
  const lines = columns.filter((f) => !HEADER.has(f.id));
  const showRisk = columns.some((f) => f.id === "risk");

  return (
    <ul aria-label="Screener results" className="border border-hairline bg-surface md:hidden">
      {rows.length === 0 ? (
        <li className="px-5 py-10">
          <Empty onClear={onClear} hiddenTotal={hiddenTotal} />
        </li>
      ) : (
        rows.map((r) => {
          const on = picked.includes(r.code);
          return (
            <li key={r.code} className={cn("border-b border-hairline px-5 py-5 last:border-b-0", on && "bg-accent-wash")}>
              <div className="flex items-start gap-4">
                <span className="pt-1">
                  <SelectBox
                    id={`sel-m-${r.code}`}
                    label={`Select ${r.shortName} to compare`}
                    checked={on}
                    onToggle={() => onPick(r.code)}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <AmcMark amc={amcs[r.amcId]} />
                    <div className="min-w-0">
                      <Link
                        href={sifHref(r)}
                        className="block text-[14px] font-medium leading-[20px] text-ink underline decoration-transparent underline-offset-4 hover:decoration-current"
                      >
                        {r.shortName}
                      </Link>
                      <p className="mt-0.5 text-[12px] leading-[16px] text-muted">
                        {r.amcName} · {r.strategyLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <CategoryChip category={r.category} />
                    {showRisk ? (
                      <FieldValue field={columns.find((f) => f.id === "risk") as Field} row={r} />
                    ) : null}
                  </div>
                  {lines.length ? (
                    <dl className="mt-4 border-t border-hairline">
                      {lines.map((f) => (
                        <MiniRow key={f.id} label={fieldLabel(f, universe)}>
                          <FieldValue field={f} row={r} />
                        </MiniRow>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })
      )}
    </ul>
  );
}
