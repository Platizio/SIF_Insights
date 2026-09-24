"use client";

import type { ReactNode } from "react";
import type { Category } from "@/lib/data/types";
import { cn } from "@/lib/cn";

/* Small shared pieces, adapted from app/sif-tracker/TrackerTable.tsx
   (which is retired in W3) so the Screener does not depend on it. */

export const PILL_BASE =
  "rounded-full px-4 py-2 text-[13px] leading-[20px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]";

export const PILL_IDLE = "glass glass-ghost text-body hover:text-ink";
export const PILL_ON = "glass glass-active text-ink";
export const PILL_OFF = "cursor-not-allowed border border-hairline text-pending";

export const TEXT_BUTTON =
  "rounded-full px-3 py-1.5 text-[13px] leading-[20px] text-muted underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current";

/** Form controls are the one place a 4px radius is allowed. */
export const INPUT =
  "h-10 w-full min-w-0 rounded-[4px] border border-hairline bg-surface px-3 text-[14px] leading-[20px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-muted hover:border-body focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-pending";

export const CHECKBOX =
  "h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-hairline accent-accent disabled:cursor-not-allowed";

export function SelectBox({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <input id={id} type="checkbox" checked={checked} onChange={onToggle} className={CHECKBOX} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
    </>
  );
}

export function MiniRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-5 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] leading-[20px] text-body">{children}</dd>
    </div>
  );
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-2.5 py-0.5 text-[12px] capitalize leading-[18px] text-body">
      {category}
    </span>
  );
}

export function Chevron({ open, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      className={cn(
        "shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        open && "rotate-180",
        className,
      )}
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Available for 11 of 33 SIFs" — only when something is missing. */
export function CoverageNote({
  have,
  total,
  className,
}: {
  have: number;
  total: number;
  className?: string;
}) {
  if (have >= total) return null;
  return (
    <p className={cn("text-[12px] leading-[16px] text-muted", className)}>
      {have === 0 ? (
        <>Not captured for any SIF yet</>
      ) : (
        <>
          Available for <span className="tabular">{have}</span> of{" "}
          <span className="tabular">{total}</span> SIFs
        </>
      )}
    </p>
  );
}
