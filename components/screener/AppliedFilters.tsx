"use client";

import type { SifRow } from "@/lib/data/types";
import { Chip } from "@/components/ui/Chip";
import type { ScreenState } from "@/lib/screener/fields";
import { TEXT_BUTTON } from "./bits";
import type { Commit } from "./controls";
import { chipsFor, clearScreen } from "./model";

export type HiddenNote = { id: string; label: string; reason: string };

/**
 * The applied screen, echoed (PRD p.41): a removable chip per condition, the
 * match count, Clear all — and, because most of this universe is young, the
 * rows an active filter set aside for lacking the value at all. Those are not
 * "below 5%"; we do not know, so they are hidden AND counted, with one click
 * to bring them back (`nulls=1`).
 *
 * The count is a polite, atomic live region: it is assembled from several
 * spans React swaps individually, and without aria-atomic a changed count can
 * be read out as a bare number with no sentence around it.
 */
export function AppliedFilters({
  rows,
  state,
  commit,
  matchCount,
  total,
  hiddenTotal,
  hidden,
}: {
  rows: SifRow[];
  state: ScreenState;
  commit: Commit;
  matchCount: number;
  total: number;
  /** Rows set aside only for missing values (with nulls off), or brought back (on). */
  hiddenTotal: number;
  hidden: HiddenNote[];
}) {
  const chips = chipsFor(state, rows);
  const screening = chips.length > 0;

  return (
    <div className="space-y-4">
      {screening ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
            Applied
          </span>
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              group={chip.group}
              onRemove={() => commit(chip.remove)}
              removeLabel={`Remove filter ${chip.group ? `${chip.group}: ` : ""}${chip.text}`}
            >
              {chip.text}
            </Chip>
          ))}
          <button type="button" onClick={() => commit(clearScreen)} className={TEXT_BUTTON}>
            Clear all
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p aria-live="polite" aria-atomic="true" className="text-[15px] leading-[24px] text-body">
          {screening ? (
            <>
              <span className="tabular font-medium text-ink">{matchCount}</span>{" "}
              {matchCount === 1 ? "SIF matches" : "SIFs match"} your selected criteria
              <span className="text-muted">
                {" "}
                · of <span className="tabular">{total}</span>
              </span>
            </>
          ) : (
            <>
              Showing all <span className="tabular font-medium text-ink">{total}</span> SIFs
            </>
          )}
        </p>

        {hiddenTotal > 0 ? (
          <p className="text-[13px] leading-[20px] text-muted">
            {state.includeMissing ? (
              <>
                Including <span className="tabular text-ink">{hiddenTotal}</span>{" "}
                {hiddenTotal === 1 ? "SIF" : "SIFs"} without a value for{" "}
                {hidden.map((h) => h.label).join(", ")}
              </>
            ) : (
              <>
                <span className="tabular text-ink">{hiddenTotal}</span> {hiddenTotal === 1 ? "SIF" : "SIFs"} hidden —{" "}
                {hidden.map((h, i) => (
                  <span key={h.id}>
                    {i > 0 ? "; " : null}
                    {h.label}: {h.reason}
                  </span>
                ))}
              </>
            )}
            <span aria-hidden="true"> · </span>
            <button
              type="button"
              onClick={() => commit((s) => ({ ...s, includeMissing: !s.includeMissing }))}
              className="text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
            >
              {state.includeMissing ? "Hide them" : "Show them"}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
