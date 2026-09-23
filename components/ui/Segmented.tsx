"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A single-choice chip row — period switches (1M · 3M · 6M), category
 * tabs, "show all / differences only".
 *
 * NATIVE RADIOS, visually hidden, inside the chips. That is the whole
 * accessibility story and it is deliberately not hand-rolled: a
 * `role="radiogroup"` of buttons needs roving tabindex, arrow-key
 * handling and aria-checked bookkeeping to reach parity with what
 * `<input type="radio">` does for free — one Tab stop for the group,
 * arrows move the choice, the fieldset's legend names it. The chip is the
 * <label>, so the whole pill is the hit target.
 *
 * The focus ring is drawn on the chip via `has-[:focus-visible]`, since
 * the input it belongs to is invisible.
 *
 * Controlled only. The parent owns the value; this renders it.
 */

type SegmentedOption<T extends string> = {
  id: T;
  label: ReactNode;
  /** Printed beside the label, tabular. */
  count?: number;
  /** An option with nothing behind it — a period with no data, a category
      with no schemes. Shown, so the reader sees it exists, but inert. */
  disabled?: boolean;
};

const CHIP =
  "relative inline-flex cursor-pointer select-none items-center gap-2 rounded-full px-4 py-2 text-[13px] leading-[20px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  name,
  legendHidden = true,
  className,
}: {
  /** Names the group for assistive tech (the fieldset's <legend>). */
  legend: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Radio group name. Generated when omitted; pass one if a form reads it. */
  name?: string;
  /** Show the legend as a visible eyebrow instead of screen-reader only. */
  legendHidden?: boolean;
  className?: string;
}) {
  const generated = useId();
  const group = name ?? generated;

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend
        className={
          legendHidden
            ? "sr-only"
            : "mb-3 text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted"
        }
      >
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option.id === value;
          return (
            <label
              key={option.id}
              className={cn(
                CHIP,
                option.disabled
                  ? "cursor-not-allowed border border-hairline text-pending"
                  : checked
                    ? "glass glass-active text-ink"
                    : "glass glass-ghost text-body hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={group}
                value={option.id}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              <span>{option.label}</span>
              {option.count !== undefined ? (
                /* accent-dim on the selected tint, as the tracker's filter
                   pills do: muted grey loses contrast against the aqua lens. */
                <span
                  className={cn(
                    "tabular text-[12px]",
                    checked ? "text-accent-dim" : "text-muted",
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
