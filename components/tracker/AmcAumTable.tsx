"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AmcMark } from "@/components/AmcMark";
import { ActionButton } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { formatCr } from "@/lib/format";

import { markAmc, type MarkAmc } from "./model";

export type AmcAumRow = {
  amc: MarkAmc;
  /** Null when no month-end AUM is on file for any of the house's SIFs. */
  cr: number | null;
  /** Pre-formatted month, set only when it differs from the industry month. */
  otherMonth: string | null;
  /** SIFs whose AUM the total counts, of `schemes`. */
  counted: number;
  schemes: number;
};

/** The PRD's "Top 7–8 AMCs initially". */
const INITIAL = 8;

/**
 * Top asset managers by SIF AUM (PRD p.27): the first eight, then the rest
 * on request. Rows arrive ordered from the server — largest captured AUM
 * first, houses with none on file last — so this island only toggles.
 *
 * A house whose total counts only some of its SIFs says so on the row:
 * a partial sum is not the house's AUM, and ranking it silently as if it
 * were would overstate the order.
 */
export function AmcAumTable({ rows }: { rows: AmcAumRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const visible = expanded ? rows : rows.slice(0, INITIAL);

  return (
    <div>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Top asset managers by SIF AUM</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="py-3 pr-4 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
              AMC
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
              Total SIF AUM
            </th>
            <th scope="col" className="py-3 pl-4 text-right text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
              <span aria-hidden="true">SIFs</span>
              <span className="sr-only">Number of SIFs</span>
            </th>
          </tr>
        </thead>
        <tbody id={bodyId}>
          {visible.map((r) => (
            <tr key={r.amc.id} className="border-b border-hairline">
              <th scope="row" className="py-3 pr-4 text-left align-middle font-normal">
                <Link
                  href={`/amc/${r.amc.id}`}
                  className="group inline-flex min-w-0 items-center gap-3 text-[15px] leading-[22px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                >
                  <AmcMark amc={markAmc(r.amc)} size="sm" className="hidden sm:inline-flex" />
                  <span className="min-w-0">
                    <span className="block underline decoration-hairline underline-offset-4">{r.amc.sifName}</span>
                    <span className="block text-[13px] leading-[20px] text-muted">{r.amc.name}</span>
                  </span>
                </Link>
              </th>
              <td className="px-4 py-3 text-right align-middle">
                {r.cr !== null ? (
                  <>
                    <span className="tabular block text-[15px] leading-[22px] text-ink">{formatCr(r.cr)}</span>
                    {r.counted < r.schemes || r.otherMonth ? (
                      <span className="block text-[13px] leading-[20px] text-muted">
                        {r.counted < r.schemes ? (
                          <>
                            <span className="tabular">{r.counted}</span> of{" "}
                            <span className="tabular">{r.schemes}</span> SIFs
                          </>
                        ) : null}
                        {r.counted < r.schemes && r.otherMonth ? " · " : null}
                        {r.otherMonth}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <NotCaptured />
                )}
              </td>
              <td className="tabular py-3 pl-4 text-right align-middle text-[15px] leading-[22px] text-ink">
                {r.schemes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length > INITIAL ? (
        <ActionButton
          variant="ghost"
          className="mt-5"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          {expanded ? `Show top ${INITIAL}` : `Show all ${rows.length} asset managers`}
        </ActionButton>
      ) : null}
    </div>
  );
}
