import { cn } from "@/lib/cn";

/**
 * What a missing value says, in the site's three honest words.
 *
 * A blank cell reads as "nothing to disclose"; a zero reads as "unchanged";
 * a dash reads as whatever the reader guesses. Each of those is a claim, and
 * each is different from the truth, which is one of exactly three things:
 *
 *   insufficient-history — the scheme is too young for the period asked
 *                           (a 1Y return on a fund with 8 months of NAVs)
 *   not-captured         — the value exists somewhere; we do not hold it
 *   not-applicable       — the field does not apply (an exit load on a
 *                           scheme that charges none)
 *
 * `withheld` is the data layer's fourth reason — performance deliberately
 * not shown for a scheme younger than the compliance minimum age. To the
 * reader that is still "not enough history", so it shares that wording;
 * `detail` can say why.
 *
 * The union mirrors `Absent` in the data layer's types, written out here so
 * this file has no dependency on them; they are structurally the same type.
 *
 * No hooks and no directive: renders on the server or inside an island.
 */

export type AbsentReason =
  | "insufficient-history"
  | "not-captured"
  | "not-applicable"
  | "withheld";

export const ABSENT_TEXT: Record<AbsentReason, string> = {
  "insufficient-history": "N/A — Insufficient history",
  "not-captured": "Not captured",
  "not-applicable": "Not applicable",
  withheld: "N/A — Insufficient history",
};

export function NotCaptured({
  reason = "not-captured",
  short = false,
  detail,
  className,
}: {
  reason?: AbsentReason;
  /** Narrow cells (the heatmap): prints "N/A" and keeps the rest for
      assistive tech and the tooltip. Only the history reasons shorten —
      "Not captured" and "Not applicable" have no abbreviation a reader
      would decode correctly, so they always print in full. */
  short?: boolean;
  /** Why, in a sentence — e.g. "History starts 3 Mar 2026". Tooltip only. */
  detail?: string;
  className?: string;
}) {
  const text = ABSENT_TEXT[reason];
  const shortens =
    short && (reason === "insufficient-history" || reason === "withheld");
  const title = detail ? `${text}. ${detail}` : shortens ? text : undefined;

  return (
    <span className={cn("text-[13px] text-muted", className)} title={title}>
      {shortens ? (
        <>
          N/A<span className="sr-only"> — Insufficient history</span>
        </>
      ) : (
        text
      )}
    </span>
  );
}
