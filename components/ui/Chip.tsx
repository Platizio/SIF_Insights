"use client";

import type { ReactNode } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * A filter echo: "Strategy · Equity Long-Short ×".
 *
 * Active filters are echoed as chips because a filter you have forgotten
 * about reads as missing data — the one impression the screener must never
 * give. The chip is the answer to "why does the table show four rows".
 *
 * The chip itself is static text; only the × is a control, and it carries
 * the full name ("Remove filter Strategy: Equity Long-Short"), because a
 * bare "×" or "Remove" announced in a row of eight chips tells a screen
 * reader user nothing about which one they are on. The × is a 24px target,
 * stated in px so the fluid root cannot shrink it under WCAG 2.5.8 on a
 * phone. Omit `onRemove` for a chip that only labels.
 */
export function Chip({
  children,
  group,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode;
  /** Muted prefix naming the facet, e.g. "Strategy". */
  group?: string;
  onRemove?: () => void;
  /** Accessible name of the × — required in practice whenever `onRemove`
      is set; defaults to "Remove filter {group}: {children}" only when
      the children are plain text. */
  removeLabel?: string;
  className?: string;
}) {
  const fallbackLabel =
    typeof children === "string"
      ? `Remove filter ${group ? `${group}: ` : ""}${children}`
      : "Remove filter";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-hairline bg-accent-wash py-1 text-[13px] leading-[20px] text-ink",
        onRemove ? "pl-3 pr-1" : "px-3",
        className,
      )}
    >
      {group ? <span className="text-muted">{group}</span> : null}
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? fallbackLabel}
          className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-full text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface hover:text-ink"
        >
          <CloseIcon size={10} />
        </button>
      ) : null}
    </span>
  );
}
