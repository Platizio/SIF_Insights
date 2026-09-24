"use client";

import { useId } from "react";
import type { SifRow } from "@/lib/data/types";
import { cn } from "@/lib/cn";
import { fieldLabel, getField, type Field, type ScreenState } from "@/lib/screener/fields";
import { Chevron } from "./bits";
import type { Commit } from "./controls";
import { COLUMN_GROUPS, sortLabels, sortableFields } from "./model";

/* ============================================================
   Sort by any available metric (PRD p.41–43), with an optional
   second key (p.43 "Advanced Multi-Sort": 6M return high→low, then
   volatility low→high).

   Native <select>s: one Tab stop each, arrow keys, type-ahead and the
   platform picker on a phone, for free. Options are every sortable
   live field, grouped as the column picker groups them, each in both
   directions under the registry's own words ("Highest first",
   "Newest first"…). NAV is absent by construction — the registry
   marks it unsortable, because ordering by NAV ranks a face value.

   A missing value sorts last in either direction; ties fall back to
   the name. Both are the engine's (lib/screener/sort.ts), and the
   footnote under the table says so.
   ============================================================ */

const SELECT =
  "h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[4px] border border-hairline bg-surface pl-3 pr-9 text-[16px] leading-[20px] sm:text-[13px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-body focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Options({ fields, rows, exclude }: { fields: Field[]; rows: SifRow[]; exclude?: string }) {
  const groups = [
    ...COLUMN_GROUPS.map((g) => ({
      label: g.label,
      fields: fields.filter((f) => g.groups.includes(f.group) && !/^m\d/.test(f.id)),
    })),
    { label: "Monthly returns", fields: fields.filter((f) => /^m\d/.test(f.id)).reverse() },
  ].filter((g) => g.fields.length > 0);

  return (
    <>
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.fields
            .filter((f) => f.id !== exclude)
            .flatMap((f) => {
              const labels = sortLabels(f);
              const name = fieldLabel(f, rows);
              return (["desc", "asc"] as const).map((dir) => (
                <option key={`${f.id}.${dir}`} value={`${f.id}.${dir}`}>
                  {name} — {labels[dir]}
                </option>
              ));
            })}
        </optgroup>
      ))}
    </>
  );
}

function parse(value: string): { id: string; dir: "asc" | "desc" } | null {
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const dir = value.slice(dot + 1);
  return dir === "asc" || dir === "desc" ? { id: value.slice(0, dot), dir } : null;
}

export function SortControl({
  rows,
  fields,
  state,
  commit,
  className,
}: {
  rows: SifRow[];
  fields: Field[];
  state: ScreenState;
  commit: Commit;
  className?: string;
}) {
  const uid = useId();
  const sortable = sortableFields(fields);
  const [primary, secondary] = state.sort;
  const value = (k?: { id: string; dir: string }) => (k && getField(k.id) ? `${k.id}.${k.dir}` : "");

  const setPrimary = (v: string) =>
    commit((s) => {
      const key = parse(v);
      if (!key) return { ...s, sort: [] };
      const second = s.sort[1] && s.sort[1].id !== key.id ? [s.sort[1]] : [];
      return { ...s, sort: [key, ...second] };
    });

  const setSecondary = (v: string) =>
    commit((s) => {
      const first = s.sort[0];
      if (!first) return s;
      const key = parse(v);
      return { ...s, sort: key && key.id !== first.id ? [first, key] : [first] };
    });

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <div className="min-w-[220px] flex-1 sm:flex-none">
        <label htmlFor={`${uid}-1`} className="mb-1 block text-[12px] leading-[16px] text-muted">
          Sort by
        </label>
        <div className="relative">
          <select id={`${uid}-1`} value={value(primary)} onChange={(e) => setPrimary(e.target.value)} className={SELECT}>
            <option value="">SIF name — A–Z (default)</option>
            <Options fields={sortable} rows={rows} />
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="min-w-[220px] flex-1 sm:flex-none">
        <label htmlFor={`${uid}-2`} className="mb-1 block text-[12px] leading-[16px] text-muted">
          Then by
        </label>
        <div className="relative">
          <select
            id={`${uid}-2`}
            value={value(secondary)}
            disabled={!primary}
            onChange={(e) => setSecondary(e.target.value)}
            className={cn(SELECT, "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-pending")}
          >
            <option value="">{primary ? "No second sort" : "Choose a first sort"}</option>
            <Options fields={sortable} rows={rows} exclude={primary?.id} />
          </select>
          <Chevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>
    </div>
  );
}
