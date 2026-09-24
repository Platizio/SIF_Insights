"use client";

import Link from "next/link";
import { useId, type RefObject } from "react";
import type { SifRow } from "@/lib/data/types";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { FIELDS, fieldLabel, isLive, type Field, type ScreenState } from "@/lib/screener/fields";
import { CHECKBOX, PILL_BASE, PILL_OFF, TEXT_BUTTON } from "./bits";
import type { Commit } from "./controls";
import { COLUMN_GROUPS, coverage, toggleColumn, visibleColumns } from "./model";

/**
 * Customise Columns (PRD p.43–44): every live field, grouped, as a checkbox.
 * The SIF name is the row's identity and link, so it cannot be removed.
 * Each field shows how many SIFs hold it — a column of "Not captured" is a
 * legitimate thing to ask for, but it should not be a surprise.
 *
 * Writes straight to the URL (`cols=`); the default set collapses back to no
 * parameter at all, so "Reset to default" is also a shorter link.
 */
export function CustomiseColumns({
  open,
  onClose,
  rows,
  fields,
  state,
  commit,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  rows: SifRow[];
  fields: Field[];
  state: ScreenState;
  commit: Commit;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const uid = useId();
  const shown = new Set(visibleColumns(state.cols).map((f) => f.id));
  const isDefault = state.cols === null;
  const monthFields = fields.filter((f) => /^m\d/.test(f.id));
  const groups = [
    ...COLUMN_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      fields: fields.filter((f) => g.groups.includes(f.group) && !monthFields.includes(f)),
    })),
    { id: "months", label: "Monthly returns", fields: [...monthFields].reverse() },
  ].filter((g) => g.fields.length > 0);
  const plannedPortfolio = FIELDS.some((f) => f.group === "portfolio" && !isLive(f));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Customise columns"
      description={
        <>
          Choose the metrics shown in the results. <span className="tabular text-ink">{shown.size}</span> of{" "}
          <span className="tabular">{fields.length}</span> selected.
        </>
      }
      size="lg"
      returnFocusRef={returnFocusRef}
    >
      <div className="grid gap-x-10 gap-y-8 px-6 py-7 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {groups.map((g) => (
          <fieldset key={g.id} className="min-w-0">
            <legend className="mb-3 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
              {g.label}
            </legend>
            <ul className="border-t border-hairline">
              {g.fields.map((f) => {
                const id = `${uid}-${f.id}`;
                const locked = f.id === "name";
                const have = coverage(f, rows);
                return (
                  <li key={f.id} className="border-b border-hairline">
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex items-center gap-3 py-2 text-[14px] leading-[20px]",
                        locked ? "cursor-not-allowed text-body" : "cursor-pointer text-body hover:text-ink",
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={shown.has(f.id)}
                        disabled={locked}
                        onChange={() => commit((s) => ({ ...s, cols: toggleColumn(s.cols, f.id) }))}
                        className={CHECKBOX}
                      />
                      <span className="min-w-0 flex-1">
                        {fieldLabel(f, rows)}
                        {locked ? <span className="text-muted"> · always shown</span> : null}
                      </span>
                      <span
                        className={cn("tabular shrink-0 text-[12px]", have === 0 ? "text-pending" : "text-muted")}
                        title={`Held for ${have} of ${rows.length} SIFs`}
                      >
                        {have}/{rows.length}
                        <span className="sr-only"> SIFs hold this value</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}

        {plannedPortfolio ? (
          <div className="min-w-0">
            <p className="mb-3 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
              Portfolio
            </p>
            <p className="border-t border-hairline pt-3 text-[13px] leading-[20px] text-muted">
              Exposure and concentration columns arrive when comparable disclosures exist.{" "}
              <Link
                href="/methodology"
                className="text-body underline decoration-hairline underline-offset-4 hover:text-ink"
              >
                Methodology
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface px-6 py-4 sm:px-8">
        <button
          type="button"
          disabled={isDefault}
          onClick={() => commit((s) => ({ ...s, cols: null }))}
          className={isDefault ? cn(PILL_BASE, PILL_OFF) : TEXT_BUTTON}
        >
          Reset to default
        </button>
        <button
          type="button"
          onClick={onClose}
          className={cn(PILL_BASE, "glass glass-primary px-5 text-accent-dim")}
        >
          Done
        </button>
      </div>
    </Dialog>
  );
}
