"use client";

import { useId } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Commit } from "./controls";
import { useDraft } from "./use-draft";

/** Whitespace-insensitive, as the URL codec normalises the query. */
const sameQuery = (draft: string, committed: string) => draft.replace(/\s+/g, " ").trim() === committed;

/**
 * The universal search (PRD p.32). It narrows the SAME screen the filters do
 * — AND, not instead — and matches name, AMC, brand, strategy and managers,
 * accent- and hyphen-insensitive (lib/screener/filter.ts). Debounced so a
 * word is not re-filtered and re-announced letter by letter.
 */
export function SearchBox({ q, commit }: { q: string; commit: Commit }) {
  const id = useId();
  const { draft, change, flush } = useDraft(q, (value) => commit((s) => ({ ...s, q: value })), {
    delay: 250,
    same: sameQuery,
  });

  return (
    <div role="search" className="relative">
      <label htmlFor={id} className="sr-only">
        Search by SIF name, AMC, strategy or fund manager
      </label>
      <SearchIcon
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        type="search"
        value={draft}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search by SIF Name, AMC, Strategy or Fund Manager"
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => {
          if (e.key === "Enter") flush();
        }}
        className={cn(
          "h-14 w-full text-ellipsis rounded-[4px] border border-hairline bg-surface pl-12 pr-14 text-[16px] leading-[24px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-muted hover:border-body focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            change("");
            flush();
          }}
          className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon size={12} />
        </button>
      ) : null}
    </div>
  );
}
