import { cn } from "@/lib/cn";
import { formatExpense, formatUpdated } from "@/lib/format";

/**
 * A fund card's expense figure, stated for what it is.
 *
 * The scheme document's figure is a CAP on the base expense ratio only;
 * brokerage, transaction costs and statutory levies are charged on top, so
 * the total TER an investor pays is routinely about double it. Printed alone
 * as "Up to 2.10%" under "Expense", the cap reads as the most anyone pays.
 *
 * So the charged total TER leads whenever it is held, dated, with the cap as
 * a qualifier; a cap with no charged figure beside it says what it caps.
 * Renders nothing when neither is held — the caller owns its "Not captured".
 *
 * No hooks and no directive: renders on the server or inside an island.
 */
export function ExpenseValue({
  ter,
  ratio,
  isCap,
  className,
  noteClassName = "mt-1 block text-[12px] leading-[18px] text-muted",
}: {
  /** The charged total TER (Regular plan) and its date, or null. */
  ter: { pct: number; asOf: string } | null;
  /** The scheme document's expense figure, and whether it is the cap. */
  ratio: number | null;
  isCap: boolean | null;
  className?: string;
  noteClassName?: string;
}) {
  if (ter) {
    return (
      <>
        <span className={cn("tabular", className)}>{ter.pct.toFixed(2)}%</span>
        <span className={noteClassName}>
          Total TER, Regular plan, {formatUpdated(ter.asOf)}
          {ratio !== null && isCap ? (
            <>
              {" "}· base expense cap{" "}
              <span className="tabular">{ratio.toFixed(2)}%</span>
            </>
          ) : null}
        </span>
      </>
    );
  }
  if (ratio === null) return null;
  return (
    <>
      <span className={cn("tabular", className)}>{formatExpense(ratio, isCap)}</span>
      {isCap ? (
        <span className={noteClassName}>Cap on the base expense ratio, before levies</span>
      ) : null}
    </>
  );
}
