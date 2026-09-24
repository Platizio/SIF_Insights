import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ============================================================
   One market-number tile: large figure, short label, dated line.

   Shared by the server tiles and the NFO island, so a count that
   re-derives on the client sits on exactly the same grid lines as
   the counts that do not. No hooks, no directive.
   ============================================================ */

export const STAT_FIGURE =
  "tabular block text-[clamp(28px,4.2vw,52px)] font-medium leading-[1.05] tracking-[-0.02em] text-ink";

export function StatBody({
  figure,
  label,
  asOf,
  detail,
  className,
}: {
  figure: ReactNode;
  label: ReactNode;
  asOf: ReactNode;
  /** A qualifier under the label — "across 12 of 33 SIFs". */
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className={STAT_FIGURE}>{figure}</div>
      <p className="mt-4 text-[15px] leading-[22px] text-ink">{label}</p>
      {detail ? <p className="mt-1 text-[15px] leading-[22px] text-body">{detail}</p> : null}
      <div className="mt-auto pt-4">{asOf}</div>
    </div>
  );
}
