"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import { AmcMark } from "@/components/AmcMark";
import { SeriesSwatch } from "@/components/compare/series";
import { CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import type { Category, StrategySlug } from "@/lib/data/types";
import { STRATEGIES } from "@/lib/screener/fields";
import { normaliseSearch } from "@/lib/screener/filter";
import { MAX_PICK, compareHref } from "@/lib/screener/url";

/* ============================================================
   Select SIFs — four slots and the picker behind them.

   The URL is the state: `/compare?ids=SIF-3,SIF-93`. Adding,
   replacing or removing a SIF writes a new `ids` with
   router.replace, and the server renders the comparison for it — so
   every comparison is a link someone can share, and the page reads
   the same with JavaScript off. `replace`, not `push`: trying four
   candidates should not turn Back into an undo log.

   The picker searches the lightweight list the server hands over
   (names, houses, strategies — no NAV history), by SIF name or AMC,
   and narrows by category and strategy.
   ============================================================ */

export type PickerOption = {
  code: string;
  name: string;
  shortName: string;
  amcId: string;
  amcName: string;
  brand: string;
  logo: string | null;
  category: Category;
  strategy: StrategySlug | null;
  strategyLabel: string;
};

type Mode = { kind: "add" } | { kind: "replace"; index: number };
type CategoryFilter = "all" | Category;

const CATEGORY_LABEL: Record<Category, string> = { equity: "Equity", hybrid: "Hybrid", debt: "Debt" };

const PILL =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium leading-[20px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]";

const CONTROL =
  "w-full rounded-[4px] border border-hairline bg-surface px-4 py-3 text-[16px] leading-[24px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2";

function haystack(o: PickerOption): string {
  return normaliseSearch([o.name, o.shortName, o.amcName, o.brand, o.strategyLabel].join(" "));
}

function matches(o: PickerOption, q: string): boolean {
  const query = normaliseSearch(q);
  if (!query) return true;
  const hay = haystack(o);
  return (
    query.split(" ").every((w) => hay.includes(w)) ||
    hay.replace(/ /g, "").includes(query.replace(/ /g, ""))
  );
}

export function CompareClient({
  options,
  selected,
}: {
  options: PickerOption[];
  /** AMFI codes, in slot order, already validated by the server. */
  selected: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const byCode = useMemo(() => new Map(options.map((o) => [o.code, o])), [options]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "add" });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [strategy, setStrategy] = useState<StrategySlug | "all">("all");
  const openerRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const strategyId = useId();

  const go = (codes: string[]) => {
    startTransition(() => {
      router.replace(compareHref(codes), { scroll: false });
    });
  };

  const openPicker = (next: Mode, event: MouseEvent<HTMLElement>) => {
    openerRef.current = event.currentTarget;
    setMode(next);
    setQuery("");
    setOpen(true);
  };

  const pick = (code: string) => {
    const next =
      mode.kind === "replace"
        ? selected.map((c, i) => (i === mode.index ? code : c))
        : [...selected, code];
    setOpen(false);
    go(next);
  };

  const remove = (index: number) => go(selected.filter((_, i) => i !== index));

  /* ---------- the picker's lists ---------- */

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = { equity: 0, hybrid: 0, debt: 0 };
    for (const o of options) counts[o.category] += 1;
    return counts;
  }, [options]);

  const strategyChoices = useMemo(() => {
    const seen = new Map<StrategySlug, number>();
    for (const o of options) {
      if (!o.strategy || (category !== "all" && o.category !== category)) continue;
      seen.set(o.strategy, (seen.get(o.strategy) ?? 0) + 1);
    }
    return (Object.keys(STRATEGIES) as StrategySlug[])
      .filter((s) => seen.has(s))
      .map((s) => ({ id: s, label: STRATEGIES[s].label, count: seen.get(s) ?? 0 }));
  }, [options, category]);

  const results = options.filter(
    (o) =>
      (category === "all" || o.category === category) &&
      (strategy === "all" || o.strategy === strategy) &&
      matches(o, query),
  );

  const replacing = mode.kind === "replace" ? selected[mode.index] : null;
  const replacingName = replacing ? (byCode.get(replacing)?.shortName ?? replacing) : null;

  return (
    <div>
      <ol
        aria-busy={pending}
        aria-label="Selected SIFs"
        className={cn(
          "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
          pending && "opacity-70 transition-opacity duration-200",
        )}
      >
        {Array.from({ length: MAX_PICK }, (_, i) => {
          const code = selected[i];
          const o = code ? byCode.get(code) : undefined;
          return (
            <li key={code ?? `empty-${i}`} className="min-w-0">
              {o ? (
                <div className="flex h-full flex-col border border-hairline bg-surface p-5 sm:min-h-[168px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                      SIF {i + 1}
                    </span>
                    <SeriesSwatch index={i} />
                  </div>
                  <div className="mt-4 flex min-w-0 items-start gap-3">
                    <AmcMark
                      amc={{ id: o.amcId, name: o.amcName, sifName: o.brand, description: "", logo: o.logo }}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-[22px] text-ink">{o.shortName}</p>
                      <p className="mt-0.5 text-[13px] leading-[20px] text-muted">
                        {o.brand} · {o.strategyLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <button
                      type="button"
                      onClick={(e) => openPicker({ kind: "replace", index: i }, e)}
                      disabled={pending}
                      className={cn(PILL, "glass glass-ghost text-ink")}
                    >
                      Replace
                      <span className="sr-only"> {o.shortName}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={pending}
                      aria-label={`Remove ${o.shortName} from the comparison`}
                      className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full border border-hairline text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:bg-accent-wash hover:text-ink"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-start justify-between gap-4 border border-hairline bg-surface-2 p-5 sm:min-h-[168px]">
                  <span className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                    SIF {i + 1}
                  </span>
                  {/* Only the next free slot is live: SIFs fill left to right, so a
                      second "+ Add SIF" would do exactly what the first one does. */}
                  {i === selected.length ? (
                    <button
                      type="button"
                      onClick={(e) => openPicker({ kind: "add" }, e)}
                      disabled={pending}
                      className={cn(PILL, "glass glass-primary text-accent-dim")}
                    >
                      <PlusIcon size={12} />
                      {i < 2 ? `Select SIF ${i + 1}` : "Add SIF"}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] leading-[20px] text-muted">
                      <PlusIcon size={12} />
                      {i < 2 ? `Select SIF ${i + 1}` : "Add SIF"}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex min-h-[20px] flex-wrap items-center gap-x-5 gap-y-2 text-[13px] leading-[20px] text-muted">
        {selected.length > 0 && !pending ? (
          <button
            type="button"
            onClick={() => go([])}
            className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current"
          >
            Clear selection
          </button>
        ) : null}
        <p aria-live="polite">{pending ? "Updating the comparison…" : null}</p>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={replacingName ? `Replace ${replacingName}` : "Add a SIF to compare"}
        description="Search by SIF name or AMC, or narrow the list by category and strategy."
        initialFocusRef={searchRef}
        returnFocusRef={openerRef}
      >
        <div className="grid gap-5 border-b border-hairline px-6 py-5 sm:px-8">
          <label className="relative block">
            <span className="sr-only">Search by SIF name or AMC</span>
            <SearchIcon size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by SIF name or AMC"
              autoComplete="off"
              className={cn(CONTROL, "pl-11")}
            />
          </label>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <Segmented<CategoryFilter>
              legend="Category"
              legendHidden={false}
              value={category}
              onChange={(c) => {
                setCategory(c);
                /* A strategy belongs to one category; keep it only if it still fits. */
                if (c !== "all" && strategy !== "all" && STRATEGIES[strategy].category !== c) {
                  setStrategy("all");
                }
              }}
              options={[
                { id: "all", label: "All", count: options.length },
                ...(["equity", "hybrid", "debt"] as const).map((c) => ({
                  id: c,
                  label: CATEGORY_LABEL[c],
                  count: categoryCounts[c],
                  disabled: categoryCounts[c] === 0,
                })),
              ]}
            />
            <div className="min-w-0 lg:w-[320px]">
              <label
                htmlFor={strategyId}
                className="mb-3 block text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted"
              >
                Strategy
              </label>
              <select
                id={strategyId}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategySlug | "all")}
                className={CONTROL}
              >
                <option value="all">All strategies</option>
                {strategyChoices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p aria-live="polite" className="px-6 pt-4 text-[13px] leading-[20px] text-muted sm:px-8">
          <span className="tabular">{results.length}</span>{" "}
          {results.length === 1 ? "SIF matches" : "SIFs match"}
        </p>

        {results.length === 0 ? (
          <p className="px-6 pb-8 pt-3 text-[15px] leading-[26px] text-body sm:px-8">
            No SIF matches that search. Try an AMC name, a brand such as &ldquo;qsif&rdquo;, or clear
            the category and strategy.
          </p>
        ) : (
          <ul className="px-6 pb-6 pt-2 sm:px-8">
            {results.map((o) => {
              const inSet = selected.includes(o.code);
              const current = o.code === replacing;
              return (
                <li
                  key={o.code}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-hairline py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <AmcMark
                      amc={{ id: o.amcId, name: o.amcName, sifName: o.brand, description: "", logo: o.logo }}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium leading-[22px] text-ink">{o.shortName}</p>
                      <p className="text-[13px] leading-[20px] text-muted">
                        {o.amcName} · {CATEGORY_LABEL[o.category]} · {o.strategyLabel}
                      </p>
                    </div>
                  </div>
                  {inSet ? (
                    <span className="text-[13px] leading-[20px] text-muted">
                      {current ? "Current choice" : "In the comparison"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pick(o.code)}
                      className={cn(PILL, "glass glass-ghost text-ink")}
                    >
                      {mode.kind === "replace" ? "Choose" : "Add"}
                      <span className="sr-only"> {o.shortName}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
