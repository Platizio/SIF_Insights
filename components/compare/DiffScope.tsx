"use client";

import { useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/Segmented";

/* ============================================================
   "Show differences only" — the scope the comparison renders in.

   The rows themselves are server-rendered and each already knows
   whether its values are identical across the selected SIFs (see
   CompareTable). This island only flips `data-diff` on the scope;
   CSS hides the identical rows. So the toggle costs no re-render of
   the tables, and with JavaScript off the scope stays "off" and
   every row stays visible — the safe default.
   ============================================================ */

type Mode = "all" | "diff";

export function DiffScope({
  identical,
  total,
  aside,
  children,
}: {
  /** Rows whose values are identical (or all missing) across the selected SIFs. */
  identical: number;
  total: number;
  /** Server-rendered notes beside the toggle — the as-of line, the mixed-strategy note. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("all");

  return (
    <div data-diff={mode === "diff" ? "on" : "off"} className="group/diff">
      <div className="flex flex-col gap-6 border-y border-hairline py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Segmented<Mode>
            legend="Rows to show"
            value={mode}
            onChange={setMode}
            options={[
              { id: "all", label: "Show all" },
              { id: "diff", label: "Show differences only", disabled: identical === 0 },
            ]}
          />
          <p aria-live="polite" className="text-[13px] leading-[20px] text-muted">
            {identical === 0 ? (
              "Every parameter differs across the selected SIFs."
            ) : mode === "diff" ? (
              <>
                Hiding <span className="tabular">{identical}</span> of{" "}
                <span className="tabular">{total}</span> parameters with the same value — or none
                captured — for every selected SIF.
              </>
            ) : (
              <>
                <span className="tabular">{identical}</span> of{" "}
                <span className="tabular">{total}</span> parameters have the same value — or none
                captured — for every selected SIF.
              </>
            )}
          </p>
        </div>
        {aside}
      </div>

      {children}
    </div>
  );
}
