"use client";

import Link from "next/link";
import { useId, useState, type ReactNode, type RefObject } from "react";
import type { SifRow } from "@/lib/data/types";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { fieldLabel, filterKind, isLive, FIELDS, type Field, type ScreenState } from "@/lib/screener/fields";
import { PILL_BASE, PILL_IDLE, PILL_OFF, TEXT_BUTTON } from "./bits";
import { FieldFilter, type Commit } from "./controls";
import { PANEL_GROUPS, clearScreen } from "./model";

/* ============================================================
   More Filters — every live field that can filter, grouped as the
   PRD lays out the advanced panel (p.46).

   Generated from the registry: a field appears here because it is
   live and `filterKind` says it filters, never because this file
   names it. Planned fields (Sharpe, alpha, exposures…) never render —
   an empty filter would imply data we do not hold — so the Portfolio
   group is a single line saying when it arrives.

   Two exclusions, both stated in docs/amendments/screener.md: the
   SIF-name set (the search box is the name filter) and the month
   returns, which sit behind one disclosure inside Performance rather
   than as eleven always-open rows.

   A side sheet from sm up, full screen below it: ui/Dialog restyled
   through its className, so the focus trap, Escape, scroll lock and
   return focus are the shared implementation.
   ============================================================ */

const SHEET =
  "h-[100dvh] max-h-[100dvh] max-w-none border-0 sm:-my-6 sm:-mr-6 sm:ml-auto sm:h-[100dvh] sm:max-h-[100dvh] sm:max-w-[560px] sm:border-l sm:border-hairline";

export function MoreFilters({
  open,
  onClose,
  rows,
  fields,
  state,
  commit,
  matchCount,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  rows: SifRow[];
  fields: Field[];
  state: ScreenState;
  commit: Commit;
  matchCount: number;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const uid = useId();
  const [months, setMonths] = useState(false);
  const active = Object.keys(state.filters).length;

  const filterable = fields.filter((f) => filterKind(f) !== null && f.id !== "name");
  const monthFields = filterable.filter((f) => /^m\d{4}-\d{2}$/.test(f.id));
  const staticFields = filterable.filter((f) => !monthFields.includes(f));
  const plannedPortfolio = FIELDS.some((f) => f.group === "portfolio" && !isLive(f));

  const sections = PANEL_GROUPS.map((g) => ({
    ...g,
    fields: staticFields.filter((f) => g.groups.includes(f.group)),
  })).filter((g) => g.fields.length > 0 || (g.id === "portfolio" && plannedPortfolio));

  const ctx = { rows, state, commit };
  const monthsActive = monthFields.filter((f) => state.filters[f.id]).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="More filters"
      description={
        <>
          Every filter here works together with the search and the quick filters.{" "}
          <span className="tabular text-ink">{matchCount}</span> {matchCount === 1 ? "SIF matches" : "SIFs match"}.
        </>
      }
      returnFocusRef={returnFocusRef}
      className={SHEET}
      closeLabel="Close filters"
    >
      <nav aria-label="Filter groups" className="border-b border-hairline px-6 py-4 sm:px-8">
        <ul className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              {/* Buttons, not #anchors: smooth scroll owns hash links on the
                  page, and the page is locked while the sheet is open. */}
              <button
                type="button"
                onClick={() => {
                  const heading = document.getElementById(`${uid}-${s.id}-h`);
                  heading?.scrollIntoView({ block: "start" });
                  heading?.focus({ preventScroll: true });
                }}
                className={cn(PILL_BASE, PILL_IDLE, "px-3 py-1.5")}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-6 pb-8 sm:px-8">
        {sections.map((s) => (
          <section
            key={s.id}
            id={`${uid}-${s.id}`}
            aria-labelledby={`${uid}-${s.id}-h`}
            className="scroll-mt-4 border-b border-hairline py-7 last:border-b-0"
          >
            <h3
              id={`${uid}-${s.id}-h`}
              tabIndex={-1}
              className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent focus:outline-none"
            >
              {s.label}
            </h3>

            {s.id === "portfolio" ? (
              <p className="mt-4 max-w-[52ch] text-[14px] leading-[22px] text-body">
                Portfolio &amp; exposure filters arrive when comparable disclosures exist.{" "}
                <Link
                  href="/methodology"
                  className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-current"
                >
                  See the methodology
                </Link>
              </p>
            ) : (
              <div className="mt-5 space-y-6">
                {s.fields.map((f) => (
                  <FilterBlock key={f.id} field={f} rows={rows}>
                    <FieldFilter field={f} {...ctx} />
                  </FilterBlock>
                ))}

                {s.id === "performance" && monthFields.length ? (
                  <div>
                    <button
                      type="button"
                      aria-expanded={months}
                      aria-controls={months ? `${uid}-months` : undefined}
                      onClick={() => setMonths((v) => !v)}
                      className={cn(PILL_BASE, PILL_IDLE, "inline-flex items-center gap-2 px-3 py-1.5")}
                    >
                      {months ? "Hide" : "Show"} monthly returns
                      <span className="tabular text-[12px] text-muted">
                        {monthsActive > 0 ? `${monthsActive} active · ` : ""}
                        {monthFields.length} months
                      </span>
                    </button>
                    {months ? (
                      <div id={`${uid}-months`} className="mt-5 space-y-6">
                        {[...monthFields].reverse().map((f) => (
                          <FilterBlock key={f.id} field={f} rows={rows}>
                            <FieldFilter field={f} {...ctx} />
                          </FilterBlock>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Sticky inside the dialog's scroll area, so the count and the way
          out stay in reach at the bottom of a long panel. */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface px-6 py-4 sm:px-8">
        <p aria-live="polite" aria-atomic="true" className="text-[13px] leading-[20px] text-muted">
          <span className="tabular text-ink">{matchCount}</span> {matchCount === 1 ? "SIF matches" : "SIFs match"}
          {active > 0 ? (
            <>
              {" "}
              · <span className="tabular">{active}</span> {active === 1 ? "filter" : "filters"}
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={active === 0}
            onClick={() => commit((s) => ({ ...clearScreen(s), q: s.q }))}
            className={active === 0 ? cn(PILL_BASE, PILL_OFF) : TEXT_BUTTON}
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(PILL_BASE, "glass glass-primary px-5 text-accent-dim")}
          >
            Show {matchCount} {matchCount === 1 ? "SIF" : "SIFs"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function FilterBlock({
  field,
  rows,
  children,
}: {
  field: Field;
  rows: SifRow[];
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="mb-2 text-[14px] font-medium leading-[20px] text-ink">
        {fieldLabel(field, rows)}
      </p>
      {children}
    </div>
  );
}
