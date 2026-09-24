import type { ReactNode } from "react";
import { RowGroup, RowItem } from "@/components/motion/Reveal";
import { Delta } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { cn } from "@/lib/cn";
import type { Absent, SifRow } from "@/lib/data/types";
import {
  absentLabel,
  formatCr,
  formatDays,
  formatInr,
  formatNav,
  formatPct,
  formatUpdated,
} from "@/lib/format";
import { fieldLabel, getField, type Field, type NumberField } from "@/lib/screener/fields";
import { SeriesSwatch } from "./series";

/* ============================================================
   The comparison table — one parameter per row, one SIF per column.

   Every section of /compare renders through this, so the rules live
   in one place:

   · SIF columns are equal width (table-fixed; the label column alone
     is sized). On a phone the table scrolls sideways INSIDE its frame
     and the parameter labels stay pinned, so a reader never loses
     which row they are on.
   · "Show differences only" is CSS, not state: a row whose formatted
     values are identical across every selected SIF — and a row with
     nothing captured for any of them — carries a class that hides it
     while the nearest `group/diff` scope says data-diff="on"
     (DiffScope). With JavaScript off the scope never says so, and
     every row shows.
   · A row with nothing captured for ANY selected SIF, for one shared
     reason, says so once across the row instead of repeating the same
     phrase in every cell.
   · The per-row marker ("Highest return among selected") is a factual
     observation over the selected set — never "best", never a verdict.

   No hooks and no directive: the server sections render it, and so
   does the one client section (the benchmark period switch).
   ============================================================ */

export type CompareColumn = { code: string; name: string };

/** One SIF's value for one parameter. `key` is what "Show differences only" compares. */
export type CellSpec =
  | { key: string; node: ReactNode; sub?: ReactNode; num?: number }
  | { key: null; absent: Absent; detail?: string };

export type CompareRow = {
  id: string;
  label: ReactNode;
  /** Muted line under the label — a basis, a unit, a source. */
  hint?: ReactNode;
  cells: CellSpec[];
  /** Per-cell factual marker, aligned with `cells`. */
  notes?: (string | null)[];
};

/* ---------- judging a row ---------- */

export function rowIsSame(cells: readonly CellSpec[]): boolean {
  if (cells.every((c) => c.key === null)) return true;
  return cells.every((c) => c.key === cells[0].key);
}

/** The one reason every cell is missing for, when they all are and agree. */
function sharedAbsence(cells: readonly CellSpec[]): Absent | null {
  if (cells.length === 0 || cells.some((c) => c.key !== null)) return null;
  const labels = cells.map((c) => (c.key === null ? absentLabel(c.absent) : ""));
  const first = cells[0];
  return first.key === null && labels.every((l) => l === labels[0]) ? first.absent : null;
}

/* ---------- building cells from the registry ---------- */

export function absentCell(reason: Absent, detail?: string): CellSpec {
  return { key: null, absent: reason, detail };
}

export function textCell(text: string | null | undefined, reason: Absent = "not-captured"): CellSpec {
  const t = text?.trim();
  return t ? { key: t, node: t } : absentCell(reason);
}

export function numberText(f: NumberField, v: number): string {
  switch (f.unit) {
    case "pct":
      return f.signed ? formatPct(v) : `${v.toFixed(2)}%`;
    case "cr":
      return formatCr(v);
    case "inr":
      return formatInr(v);
    case "nav":
      return formatNav(v);
    case "days":
      return formatDays(v);
    case "ratio":
      return v.toFixed(2);
  }
}

/** Why a history-bound value is missing, in a sentence — the tooltip. */
function historyDetail(r: SifRow): string | undefined {
  return r.inception ? `History starts ${formatUpdated(r.inception.date)}` : undefined;
}

/** A registry field's value for one row, formatted the one way every section shows it. */
export function fieldCell(f: Field, r: SifRow, rows: readonly SifRow[]): CellSpec {
  const missing = (): CellSpec => {
    const reason = f.absent?.(r) ?? "not-captured";
    return absentCell(
      reason,
      reason === "insufficient-history" || reason === "withheld" ? historyDetail(r) : undefined,
    );
  };

  switch (f.kind) {
    case "number": {
      const v = f.get(r);
      if (v === null || !Number.isFinite(v)) return missing();
      const text = numberText(f, v);
      const node =
        f.unit === "pct" && f.signed ? (
          <Delta pct={v} className="text-[15px]" />
        ) : (
          <span className="tabular">{text}</span>
        );
      return { key: text, node, num: v };
    }
    case "date": {
      const v = f.get(r);
      if (!v) return missing();
      const text = formatUpdated(v);
      return { key: text, node: <span className="tabular">{text}</span> };
    }
    case "flag": {
      const v = f.get(r);
      if (v === null) return missing();
      return textCell(f.labels[v ? 0 : 1]);
    }
    default: {
      const v = f.get(r);
      if (v === null || (Array.isArray(v) && v.length === 0)) return missing();
      const options = f.options([...rows]);
      const ids = Array.isArray(v) ? v : [v];
      const text = ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(", ");
      return textCell(text);
    }
  }
}

/**
 * "Highest … among selected" on the cells holding the extreme, compared at
 * display precision. Nothing when fewer than two SIFs hold the value, or
 * when they all hold the same one — a marker on every cell says nothing.
 */
export function noteCells(
  cells: readonly CellSpec[],
  dir: "highest" | "lowest",
  text: string,
  measure: (n: number) => number = (n) => n,
): (string | null)[] | undefined {
  const nums = cells.map((c) =>
    c.key !== null && c.num !== undefined && Number.isFinite(c.num)
      ? Number(measure(c.num).toFixed(2))
      : null,
  );
  const present = nums.filter((n): n is number => n !== null);
  if (present.length < 2) return undefined;
  const target = dir === "highest" ? Math.max(...present) : Math.min(...present);
  if (present.every((n) => n === target)) return undefined;
  return nums.map((n) => (n === target ? text : null));
}

const NOTE_NOUN: Record<string, string> = { vol: "volatility", aum: "AUM", ter: "TER" };

/** The registry's `compare.note`, as the factual phrase the cell prints. */
export function noteText(f: Field): string | null {
  const dir = f.compare?.note;
  if (!dir) return null;
  const noun = f.group === "performance" ? "return" : (NOTE_NOUN[f.id] ?? f.label.toLowerCase());
  return `${dir === "highest" ? "Highest" : "Lowest"} ${noun} among selected`;
}

/**
 * A row read straight off the metric registry: label, formatting,
 * absence and marker all come from the field definition. `cell` overrides
 * the formatting where a section needs the document's own words.
 */
export function registryRow(
  id: string,
  rows: readonly SifRow[],
  o: {
    label?: ReactNode;
    hint?: ReactNode;
    cell?: (f: Field, r: SifRow) => CellSpec;
  } = {},
): CompareRow {
  const f = getField(id);
  if (!f) {
    return { id, label: o.label ?? id, cells: rows.map(() => absentCell("not-captured")) };
  }
  const cells = rows.map((r) => (o.cell ? o.cell(f, r) : fieldCell(f, r, rows)));
  const text = noteText(f);
  const dir = f.compare?.note;
  return {
    id,
    label: o.label ?? fieldLabel(f, rows),
    hint: o.hint,
    cells,
    notes: text && dir ? noteCells(cells, dir, text) : undefined,
  };
}

/* ---------- rendering ---------- */

/* Literal classes per SIF count — Tailwind scans source text. Each SIF
   column keeps ≥ ~190px, so a 390px phone scrolls sideways inside the
   frame rather than crushing a value into one word per line. */
const MIN_W = {
  1: "min-w-[340px]",
  2: "min-w-[520px]",
  3: "min-w-[720px]",
  4: "min-w-[920px]",
} as const;

const CELL = "border-t border-hairline px-4 py-4 align-top";
const LABEL_CELL =
  "sticky left-0 z-[1] border-r border-hairline bg-surface px-4 text-left align-top";

function CellView({ cell, note }: { cell: CellSpec; note: string | null | undefined }) {
  if (cell.key === null) return <NotCaptured reason={cell.absent} detail={cell.detail} />;
  return (
    <>
      <div className="text-[15px] leading-[24px] text-ink">{cell.node}</div>
      {cell.sub ? (
        <div className="mt-0.5 text-[13px] leading-[20px] text-muted">{cell.sub}</div>
      ) : null}
      {note ? (
        <span className="mt-2 inline-flex rounded-full border border-hairline px-2.5 py-0.5 text-[12px] leading-[16px] text-body">
          {note}
        </span>
      ) : null}
    </>
  );
}

export function CompareTable({
  caption,
  columns,
  rows,
  className,
}: {
  /** Names the table and its scroll region for assistive tech. */
  caption: string;
  columns: readonly CompareColumn[];
  rows: readonly CompareRow[];
  className?: string;
}) {
  const judged = rows.map((row) => ({
    row,
    same: rowIsSame(row.cells),
    shared: sharedAbsence(row.cells),
  }));
  const allSame = judged.every((j) => j.same);
  const n = Math.max(1, Math.min(4, columns.length)) as keyof typeof MIN_W;

  return (
    <div className={className}>
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className={cn(
          "overflow-x-auto border border-hairline bg-surface",
          allSame && "group-data-[diff=on]/diff:hidden",
        )}
      >
        <table className={cn("w-full table-fixed border-separate border-spacing-0", MIN_W[n])}>
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            <col className="w-[132px] sm:w-[200px] lg:w-[240px]" />
            {columns.map((c) => (
              <col key={c.code} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={cn(LABEL_CELL, "py-3")}>
                <span className="sr-only">Parameter</span>
              </th>
              {columns.map((c, i) => (
                <th key={c.code} scope="col" className="px-4 py-3 text-left align-bottom">
                  <span className="flex items-center gap-2">
                    <SeriesSwatch index={i} />
                    <span className="line-clamp-2 text-[13px] font-medium leading-[20px] text-ink">
                      {c.name}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <RowGroup>
            {judged.map(({ row, same, shared }, i) => (
              <RowItem
                key={row.id}
                index={i}
                className={cn(same && "group-data-[diff=on]/diff:hidden")}
              >
                <th
                  scope="row"
                  className={cn(
                    LABEL_CELL,
                    "border-t py-4 text-[13px] font-normal leading-[20px] text-body",
                  )}
                >
                  {row.label}
                  {row.hint ? <span className="mt-1 block text-muted">{row.hint}</span> : null}
                </th>
                {shared ? (
                  <td colSpan={columns.length} className={CELL}>
                    {/* Pinned beside the labels, so a phone that has scrolled the
                        SIF columns sideways still reads the whole sentence. */}
                    <p className="sticky left-[148px] max-w-[188px] text-[13px] leading-[20px] text-muted sm:left-[216px] sm:max-w-[420px] lg:left-[256px]">
                      <NotCaptured reason={shared} /> — for every selected SIF
                    </p>
                  </td>
                ) : (
                  row.cells.map((cell, j) => (
                    <td key={columns[j]?.code ?? j} className={CELL}>
                      <CellView cell={cell} note={row.notes?.[j]} />
                    </td>
                  ))
                )}
              </RowItem>
            ))}
          </RowGroup>
        </table>
      </div>

      {allSame ? (
        <p className="hidden border border-hairline bg-surface px-6 py-5 text-[15px] leading-[26px] text-body group-data-[diff=on]/diff:block">
          Every parameter here is the same for the selected SIFs.
        </p>
      ) : null}
    </div>
  );
}
