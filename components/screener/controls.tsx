"use client";

import { useId } from "react";
import type { SifRow } from "@/lib/data/types";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import {
  dayIso,
  fieldLabel,
  filterKind,
  isoDay,
  type Field,
  type FilterValue,
  type ScreenState,
} from "@/lib/screener/fields";
import { CHECKBOX, CoverageNote, INPUT, PILL_BASE, PILL_IDLE, PILL_ON, PILL_OFF } from "./bits";
import {
  coverage,
  matchingPreset,
  optionsFor,
  parseNumber,
  presetsOf,
  toggleOption,
  unitAffix,
  withBound,
  withFilter,
} from "./model";
import { useDraft } from "./use-draft";

/** Every write goes through this: a function of the CURRENT screen, read fresh. */
export type Commit = (update: (s: ScreenState) => ScreenState) => void;

type Ctx = { rows: SifRow[]; state: ScreenState; commit: Commit };

/* ============================================================
   Set — checkboxes with counts
   ============================================================ */

/**
 * A multi-select. Every option is listed with its count; an empty one is
 * shown but inert, because a zero is a fact about the market (no debt SIF
 * has launched). An inert option that is somehow CHOSEN (a stale link)
 * stays enabled, so it can still be unticked.
 */
export function OptionList({
  field,
  rows,
  state,
  commit,
  columns = 1,
  scroll = false,
}: Ctx & { field: Field; columns?: 1 | 2; scroll?: boolean }) {
  const uid = useId();
  const options = optionsFor(field, rows, state);
  const value = state.filters[field.id];
  const chosen = value?.t === "set" ? value.ids : [];

  if (options.length === 0) {
    return <p className="px-1 py-2 text-[13px] leading-[20px] text-muted">Not captured for any SIF yet.</p>;
  }

  return (
    <div
      className={cn(scroll && "max-h-[300px] overflow-y-auto overscroll-contain")}
      data-lenis-prevent={scroll ? "" : undefined}
    >
      <ul className={cn("grid", columns === 2 && "sm:grid-cols-2 sm:gap-x-4")}>
        {options.map((option) => {
          const on = chosen.includes(option.id);
          const inert = Boolean(option.inert) && !on;
          const id = `${uid}-${option.id}`;
          return (
            <li key={option.id}>
              <label
                htmlFor={id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-[14px] leading-[20px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  inert ? "cursor-not-allowed text-pending" : "cursor-pointer text-body hover:bg-accent-wash",
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  disabled={inert}
                  onChange={() => commit((s) => toggleOption(s, field.id, option.id))}
                  className={CHECKBOX}
                />
                <span className={cn("min-w-0 flex-1", on && "text-ink")}>{option.label}</span>
                <span className="tabular shrink-0 text-[13px] text-muted">
                  {option.count}
                  <span className="sr-only"> {option.count === 1 ? "SIF" : "SIFs"}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================
   Range — min / max, plus the registry's presets
   ============================================================ */

const sameNumber = (draft: string, committed: string) => {
  const a = parseNumber(draft);
  const b = parseNumber(committed);
  return a === b || (a === undefined && b === null);
};

function Bound({
  field,
  side,
  value,
  commit,
  disabled,
  label,
}: {
  field: Field;
  side: "min" | "max";
  value: number | null;
  commit: Commit;
  disabled: boolean;
  label: string;
}) {
  const id = useId();
  const committed = value === null ? "" : String(value);
  const { draft, change, flush } = useDraft(
    committed,
    (text) => {
      const n = parseNumber(text);
      if (n === undefined) return; // not a number yet — keep the draft, change nothing
      commit((s) => withBound(s, field.id, side, n));
    },
    { same: sameNumber },
  );
  const invalid = parseNumber(draft) === undefined;
  const { prefix, suffix } = unitAffix(field);

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-[12px] leading-[16px] text-muted">
        {side === "min" ? "Minimum" : "Maximum"}
      </label>
      <div className="relative flex items-center">
        {prefix ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 text-[14px] text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`${label}, ${side === "min" ? "minimum" : "maximum"}${suffix ? ` (${suffix})` : ""}`}
          placeholder={side === "min" ? "No min" : "No max"}
          onChange={(e) => change(e.target.value)}
          onBlur={flush}
          onKeyDown={(e) => {
            if (e.key === "Enter") flush();
          }}
          className={cn(
            INPUT,
            "tabular",
            prefix && "pl-7",
            suffix && (suffix.length > 1 ? "pr-12" : "pr-7"),
            invalid && "border-loss",
          )}
        />
        {suffix ? (
          <span aria-hidden="true" className="pointer-events-none absolute right-3 text-[13px] text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DateBound({
  field,
  side,
  value,
  commit,
  disabled,
  label,
}: {
  field: Field;
  side: "min" | "max";
  value: number | null;
  commit: Commit;
  disabled: boolean;
  label: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-[12px] leading-[16px] text-muted">
        {side === "min" ? "From" : "To"}
      </label>
      <input
        id={id}
        type="date"
        value={value === null ? "" : dayIso(value)}
        disabled={disabled}
        aria-label={`${label}, ${side === "min" ? "from" : "to"}`}
        onChange={(e) => {
          const day = e.target.value ? isoDay(e.target.value) : null;
          commit((s) => withBound(s, field.id, side, day));
        }}
        className={cn(INPUT, "tabular")}
      />
    </div>
  );
}

export function RangeFilter({
  field,
  rows,
  state,
  commit,
  presetsOnly = false,
}: Ctx & { field: Field; presetsOnly?: boolean }) {
  const value = state.filters[field.id];
  const range = value?.t === "range" ? value : null;
  const have = coverage(field, rows);
  const disabled = have === 0 && !range;
  const presets = presetsOf(field);
  const active = matchingPreset(field, value);
  const label = fieldLabel(field, rows);
  const Input = field.kind === "date" ? DateBound : Bound;

  return (
    <div className="space-y-3">
      {presets.length ? (
        <div role="group" aria-label={`${label} presets`} className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const on = active?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() =>
                  commit((s) =>
                    withFilter(
                      s,
                      field.id,
                      on ? null : { t: "range", min: p.min ?? null, max: p.max ?? null },
                    ),
                  )
                }
                className={cn(PILL_BASE, "px-3 py-1.5", disabled ? PILL_OFF : on ? PILL_ON : PILL_IDLE)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {presetsOnly ? null : (
        <div className="flex items-end gap-3">
          <Input field={field} side="min" value={range?.min ?? null} commit={commit} disabled={disabled} label={label} />
          <span aria-hidden="true" className="pb-2.5 text-[13px] text-muted">
            to
          </span>
          <Input field={field} side="max" value={range?.max ?? null} commit={commit} disabled={disabled} label={label} />
        </div>
      )}

      <CoverageNote have={have} total={rows.length} />
    </div>
  );
}

/* ============================================================
   Flag — any / yes / no
   ============================================================ */

export function FlagFilter({ field, rows, state, commit }: Ctx & { field: Field }) {
  if (field.kind !== "flag") return null;
  const value = state.filters[field.id];
  const current = value?.t === "flag" ? (value.v ? "yes" : "no") : "any";
  const yes = rows.filter((r) => field.get(r) === true).length;
  const no = rows.filter((r) => field.get(r) === false).length;

  return (
    <div className="space-y-2">
      <Segmented
        legend={fieldLabel(field, rows)}
        value={current}
        onChange={(id) =>
          commit((s) => withFilter(s, field.id, id === "any" ? null : ({ t: "flag", v: id === "yes" } as FilterValue)))
        }
        options={[
          { id: "any", label: "Any" },
          { id: "yes", label: field.labels[0], count: yes, disabled: yes === 0 && current !== "yes" },
          { id: "no", label: field.labels[1], count: no, disabled: no === 0 && current !== "no" },
        ]}
      />
      <CoverageNote have={yes + no} total={rows.length} />
    </div>
  );
}

/* ============================================================
   Any field — dispatched on what the registry says it filters as
   ============================================================ */

export function FieldFilter({ field, ...ctx }: Ctx & { field: Field }) {
  const kind = filterKind(field);
  if (kind === "set") {
    const long = field.kind !== "flag" && ["amc", "brand", "bm", "mgr"].includes(field.id);
    return (
      <>
        <OptionList field={field} {...ctx} columns={long ? 2 : 1} />
        {field.id === "str" && ctx.state.filters.cat?.t === "set" ? (
          <p className="mt-2 px-3 text-[12px] leading-[16px] text-muted">
            Showing strategies in the selected {ctx.state.filters.cat.ids.length === 1 ? "category" : "categories"}.
          </p>
        ) : null}
      </>
    );
  }
  if (kind === "range") {
    /* Track record is asked as bands (PRD p.33); an exact date is the
       inception filter beside it. */
    return <RangeFilter field={field} {...ctx} presetsOnly={field.id === "age"} />;
  }
  if (kind === "flag") return <FlagFilter field={field} {...ctx} />;
  return null;
}
