"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import { AmcMark } from "@/components/AmcMark";
import { GlassField } from "@/components/motion/GlassField";
import {
  RowGroup,
  RowItem,
  RowListItem,
  Rule,
} from "@/components/motion/Reveal";
import {
  Delta,
  PendingBadge,
  RiskBand,
  Section,
  Shell,
} from "@/components/primitives";
import { cn } from "@/lib/cn";
import { DUR, EASE, EXIT } from "@/lib/motion";
import {
  amcById,
  amcs,
  formatExpense,
  formatInr,
  formatNav,
  formatUpdated,
  getNav,
  liveQuotes,
  mandates,
  navLastUpdated,
  navSource,
  riskBandNumber,
  stats,
  strategies,
  strategiesByCategory,
  type Category,
  type Strategy,
} from "@/lib/data";

/* ============================================================
   Filter model.

   Every option — including the ones with nothing behind them — is
   DERIVED from `strategies`. Nothing is hardcoded, so when a debt SIF
   or a cheaper share class is filed the pills follow the data instead
   of the data being bent to fit the pills.

   Options that currently match zero schemes render inert rather than
   hidden: the gap is information (there is no debt SIF, and no scheme
   sits in risk band 3 or 4).

   The filters split into two blocks because the data does. AMFI's feed
   covers all 30 schemes; the disclosure fields — risk band, expense,
   exit load, redemption — exist only for the schemes whose information
   documents we have captured. Those four controls therefore range over
   that subset, and the block says so above the pills rather than
   quietly dropping 17 rows when you touch one. The "Disclosures"
   control in the first block makes those 17 directly reachable.
   ============================================================ */

type Option = {
  id: string;
  label: string;
  count: number;
  note?: string;
  match: (s: Strategy) => boolean;
};

type FilterGroup = { key: string; label: string; options: Option[] };

const countWhere = (match: (s: Strategy) => boolean) =>
  strategies.filter(match).length;

const withCount = (o: Omit<Option, "count">): Option => ({
  ...o,
  count: countWhere(o.match),
});

/** "No exit load" is the source's own phrasing — match it, don't restate it. */
const hasNoExitLoad = (s: Strategy) =>
  s.exitLoad !== null && s.exitLoad.trim().toLowerCase() === "no exit load";

const CATEGORIES: Category[] = ["equity", "hybrid", "debt"];

/** Distinct redemption frequencies, verbatim, commonest first. */
const REDEMPTION_VALUES = Array.from(
  new Set(
    strategies
      .map((s) => s.redemptionFrequency)
      .filter((v): v is string => v !== null),
  ),
).sort(
  (a, b) =>
    countWhere((s) => s.redemptionFrequency === b) -
      countWhere((s) => s.redemptionFrequency === a) || a.localeCompare(b),
);

/* Ranges are computed over the schemes that actually disclose the field.
   An empty set is possible in principle — Math.min() of nothing is
   Infinity — so the range is null rather than a nonsense number. */
const DISCLOSED_EXPENSES = strategies
  .map((s) => s.expenseRatio)
  .filter((v): v is number => v !== null);

const EXPENSE_RANGE = DISCLOSED_EXPENSES.length
  ? {
      min: Math.min(...DISCLOSED_EXPENSES),
      max: Math.max(...DISCLOSED_EXPENSES),
    }
  : null;

/* Minimum investment is material disclosure but it is identical across
   every scheme that discloses it, so a column of identical figures would
   be noise. It is stated once beneath the table — and the moment the data
   stops agreeing, this renders the real spread instead. */
const MINIMUMS = Array.from(
  new Set(
    strategies
      .map((s) => s.minInvestment)
      .filter((v): v is number => v !== null),
  ),
).sort((a, b) => a - b);

const MINIMUM_DISCLOSED = countWhere((s) => s.minInvestment !== null);

/* Which risk bands nothing sits in. Derived, not asserted — the sentence
   below the pills changes with the data instead of going stale. */
const EMPTY_RISK_BANDS = [1, 2, 3, 4, 5].filter(
  (band) => countWhere((s) => riskBandNumber(s.riskBand) === band) === 0,
);

const formatList = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;

/* The face-value spread, taken from the feed rather than asserted. Two
   schemes are priced off a different face value, so absolute NAVs are not
   comparable. Percentage change is, which is why the sort offers it and
   never absolute NAV. Nothing on this page ranks or scales by NAV. */
const LIVE_NAVS = liveQuotes().map((q) => q.nav.today);
const NAV_RANGE = LIVE_NAVS.length
  ? { low: Math.min(...LIVE_NAVS), high: Math.max(...LIVE_NAVS) }
  : null;

/** Filters that range over all 30 schemes. */
const UNIVERSAL_GROUPS: FilterGroup[] = [
  {
    key: "amc",
    label: "Asset manager",
    options: amcs
      .map((a) =>
        withCount({
          id: a.id,
          label: a.sifName,
          match: (s) => s.amcId === a.id,
        }),
      )
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  },
  {
    key: "category",
    label: "Category",
    options: CATEGORIES.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      count: strategiesByCategory[c].length,
      note: strategiesByCategory[c].length === 0 ? "Launching soon" : undefined,
      match: (s: Strategy) => s.category === c,
    })),
  },
  {
    /* The mandate is the sharpest axis in the new feed: five distinct
       long-short briefs, where `category` only knows equity from hybrid. */
    key: "mandate",
    label: "Mandate",
    options: mandates.map((m) => ({
      id: m.type,
      label: m.type,
      count: m.count,
      match: (s: Strategy) => s.type === m.type,
    })),
  },
  {
    key: "disclosures",
    label: "Disclosures",
    options: [
      withCount({
        id: "captured",
        label: "Captured",
        match: (s) => s.disclosuresCaptured,
      }),
      withCount({
        id: "not-captured",
        label: "Not captured",
        match: (s) => !s.disclosuresCaptured,
      }),
    ],
  },
];

/** Filters that can only range over the schemes with captured disclosures. */
const SCOPED_GROUPS: FilterGroup[] = [
  {
    key: "risk",
    label: "Risk band",
    options: [1, 2, 3, 4, 5].map((band) =>
      withCount({
        id: String(band),
        label: `Band ${band}`,
        match: (s) => riskBandNumber(s.riskBand) === band,
      }),
    ),
  },
  {
    key: "expense",
    label: "Expense",
    options: [
      withCount({
        id: "low",
        label: "Low · under 1.5%",
        match: (s) => s.expenseRatio !== null && s.expenseRatio < 1.5,
      }),
      withCount({
        id: "medium",
        label: "Medium · 1.5–2.5%",
        match: (s) =>
          s.expenseRatio !== null &&
          s.expenseRatio >= 1.5 &&
          s.expenseRatio <= 2.5,
      }),
      withCount({
        id: "high",
        label: "High · over 2.5%",
        match: (s) => s.expenseRatio !== null && s.expenseRatio > 2.5,
      }),
    ],
  },
  {
    key: "exitLoad",
    label: "Exit load",
    options: [
      withCount({ id: "none", label: "None", match: hasNoExitLoad }),
      withCount({
        id: "has",
        label: "Has an exit load",
        match: (s) => s.exitLoad !== null && !hasNoExitLoad(s),
      }),
    ],
  },
  {
    key: "redemption",
    label: "Redemption",
    options: REDEMPTION_VALUES.map((value) =>
      withCount({
        id: value,
        label: value,
        match: (s) => s.redemptionFrequency === value,
      }),
    ),
  },
];

const GROUPS: FilterGroup[] = [...UNIVERSAL_GROUPS, ...SCOPED_GROUPS];

/* ============================================================
   Sort model.

   Two of the four keys are nullable, so the comparator pushes null
   LAST in every direction and falls back to scheme name, which is
   unique and always present. The sort is therefore total and stable
   regardless of how much disclosure we hold — and it never touches
   a null, so it cannot throw.

   There is deliberately no sort by absolute NAV. Ranking by it would
   put the two schemes priced off a ₹100/₹1,000 face value at the top
   of a list that reads as a league table. Percentage change IS
   comparable across face values, so "Change" is offered instead —
   and it is nullable, so schemes with a single published NAV sort
   last rather than vanishing.
   ============================================================ */

type SortDef = {
  id: string;
  label: string;
  /** True when some schemes have no value for this key. */
  nullable: boolean;
  value: (s: Strategy) => string | number | null;
};

const SORTS: SortDef[] = [
  { id: "name", label: "Scheme name", nullable: false, value: (s) => s.name },
  {
    id: "amc",
    label: "Asset manager",
    nullable: false,
    value: (s) => amcById.get(s.amcId)?.sifName ?? s.amcId,
  },
  {
    id: "risk",
    label: "Risk band, low first",
    nullable: true,
    value: (s) => riskBandNumber(s.riskBand),
  },
  {
    id: "expense",
    label: "Expense, low first",
    nullable: true,
    value: (s) => s.expenseRatio,
  },
  {
    id: "change",
    label: "Change, largest rise first",
    nullable: true,
    /* The comparator only sorts ascending, so negate to put the largest rise
       first. A scheme with one published NAV has no move and stays null, which
       sorts it last rather than dropping it from the table. */
    value: (s) => {
      const nav = getNav(s.id);
      return nav.status === "live" && nav.changePct !== null
        ? -nav.changePct
        : null;
    },
  },
];

/** Nulls last, always. Never compares against a null. */
function compareValues(
  a: string | number | null,
  b: string | number | null,
): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return Number(a) - Number(b);
}

/* ============================================================
   Columns

   There is no separate Day-change column: the move rides in the NAV
   cell, directly beneath the figure it moved from. A column of its own
   would cost ~140px in a table that already scrolls, and would divorce
   the percentage from the value it belongs to.

   The last six columns are the disclosure block. For the 17 schemes
   with no captured disclosures they collapse into a single spanning
   cell that says so once, rather than repeating "Not captured" six
   times across the row.
   ============================================================ */

type Column = {
  key: string;
  label: string;
  sub?: string;
  align?: "right";
  srOnly?: boolean;
};

const COLUMNS: Column[] = [
  { key: "select", label: "Select for comparison", srOnly: true },
  { key: "amc", label: "AMC" },
  { key: "strategy", label: "Scheme" },
  { key: "category", label: "Category" },
  {
    key: "nav",
    label: "NAV",
    sub: `as at ${formatUpdated(navLastUpdated)}`,
    align: "right",
  },
  { key: "risk", label: "Risk" },
  { key: "benchmark", label: "Benchmark" },
  { key: "exitLoad", label: "Exit load" },
  { key: "expense", label: "Expense", align: "right" },
  { key: "redemption", label: "Redemption" },
  { key: "taxation", label: "Taxation" },
];

/** How many trailing columns depend on captured disclosures. */
const DISCLOSURE_COLUMNS = 6;

const PILL_BASE =
  "rounded-full px-4 py-2 text-[13px] leading-[20px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]";

/* ============================================================
   Section
   ============================================================ */

export function TrackerTable() {
  const uid = useId();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [sortId, setSortId] = useState<string>(SORTS[0].id);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const compareRef = useRef<HTMLButtonElement>(null);

  const visible = useMemo(
    () =>
      strategies.filter((s) =>
        GROUPS.every((group) => {
          const chosen = selections[group.key];
          if (!chosen?.length) return true;
          return group.options.some(
            (o) => chosen.includes(o.id) && o.match(s),
          );
        }),
      ),
    [selections],
  );

  const sort = SORTS.find((s) => s.id === sortId) ?? SORTS[0];

  const sorted = useMemo(
    () =>
      [...visible].sort(
        (a, b) =>
          compareValues(sort.value(a), sort.value(b)) ||
          a.name.localeCompare(b.name),
      ),
    [visible, sort],
  );

  /** How many of the rows on screen have nothing to sort by. */
  const unsortable = sort.nullable
    ? sorted.filter((s) => sort.value(s) === null).length
    : 0;

  /* Selection is scoped to what is on screen — comparing a scheme you have
     just filtered away would be a quiet lie about what you are looking at. */
  const compared = useMemo(
    () => sorted.filter((s) => picked.includes(s.id)),
    [sorted, picked],
  );

  const activeCount = Object.values(selections).reduce(
    (n, list) => n + list.length,
    0,
  );

  const toggleFilter = (groupKey: string, optionId: string) =>
    setSelections((prev) => {
      const chosen = prev[groupKey] ?? [];
      const next = chosen.includes(optionId)
        ? chosen.filter((id) => id !== optionId)
        : [...chosen, optionId];
      return { ...prev, [groupKey]: next };
    });

  const togglePick = (id: string) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const clearAll = () => {
    setSelections({});
    setSortId(SORTS[0].id);
    setPicked([]);
  };

  const closeCompare = () => {
    setOpen(false);
    compareRef.current?.focus();
  };

  return (
    <Section id="tracker" className="relative isolate overflow-x-clip pt-14">
      <Shell>
        {/* One glass field for the whole control block: the pills need
            something behind them to frost against, and nine separate washes
            would read as decoration rather than as one surface. */}
        <div className="relative isolate">
          <GlassField />

          <FilterBlock
            uid={`${uid}-all`}
            title={`Every scheme · ${stats.strategyCount}`}
            groups={UNIVERSAL_GROUPS}
            selections={selections}
            onToggle={toggleFilter}
            note={
              <>
                AMFI&rsquo;s feed carries the house, category and mandate for
                every scheme, so these four controls range over all{" "}
                <span className="tabular">{stats.strategyCount}</span> and
                nothing can drop out of sight here.
                {stats.debtCount === 0 ? (
                  <>
                    {" "}
                    Options showing <span className="tabular">(0)</span> are
                    listed rather than hidden — no debt SIF has launched yet.
                  </>
                ) : null}
              </>
            }
          />

          <FilterBlock
            className="mt-12"
            uid={`${uid}-disclosed`}
            title={`Captured disclosures · ${stats.disclosedCount} of ${stats.strategyCount}`}
            groups={SCOPED_GROUPS}
            selections={selections}
            onToggle={toggleFilter}
            note={
              <>
                Risk band, expense, exit load and redemption come from scheme
                information documents, which we hold for{" "}
                <span className="tabular text-ink">
                  {stats.disclosedCount}
                </span>{" "}
                of the{" "}
                <span className="tabular">{stats.strategyCount}</span> schemes.
                These four controls are therefore scoped to those{" "}
                <span className="tabular">{stats.disclosedCount}</span> and the
                counts on each pill are out of{" "}
                <span className="tabular">{stats.disclosedCount}</span>, not{" "}
                <span className="tabular">{stats.strategyCount}</span>. The
                other{" "}
                <span className="tabular">
                  {stats.strategyCount - stats.disclosedCount}
                </span>{" "}
                are excluded by these filters, not hidden: clear the filter, or
                use{" "}
                <span className="text-ink">Disclosures → Not captured</span>{" "}
                above to list them.
                {EXPENSE_RANGE ? (
                  <>
                    {" "}
                    Every disclosed expense ratio currently sits between{" "}
                    <span className="tabular">
                      {EXPENSE_RANGE.min.toFixed(2)}%
                    </span>{" "}
                    and{" "}
                    <span className="tabular">
                      {EXPENSE_RANGE.max.toFixed(2)}%
                    </span>
                    .
                  </>
                ) : null}
                {EMPTY_RISK_BANDS.length > 0 ? (
                  <>
                    {" "}
                    No scheme discloses risk band{" "}
                    {formatList(EMPTY_RISK_BANDS.map(String))}.
                  </>
                ) : null}
              </>
            }
          />

          <div className="mt-12 grid gap-3 border-t border-hairline pt-5 md:grid-cols-[168px_1fr] md:items-baseline md:gap-6">
            <p
              id={`${uid}-sort`}
              className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted"
            >
              Sort
            </p>
            <div
              role="group"
              aria-labelledby={`${uid}-sort`}
              className="flex flex-wrap gap-2"
            >
              {SORTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === sort.id}
                  onClick={() => setSortId(option.id)}
                  className={cn(
                    PILL_BASE,
                    option.id === sort.id
                      ? "glass glass-active text-ink"
                      : "glass glass-ghost text-body",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 max-w-[80ch] text-[13px] leading-[20px] text-muted">
            Ties break on scheme name, so the order is the same every time.
            {sort.nullable ? (
              <>
                {" "}
                Schemes with no captured{" "}
                {sort.id === "risk" ? "risk band" : "expense ratio"} sort{" "}
                <span className="text-ink">last</span> — currently{" "}
                <span className="tabular text-ink">{unsortable}</span> of the{" "}
                <span className="tabular">{sorted.length}</span> on screen.
                They are never dropped from the list.
              </>
            ) : null}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <p
              aria-live="polite"
              className="text-[13px] leading-[20px] text-muted"
            >
              Showing <span className="tabular text-ink">{sorted.length}</span>{" "}
              of <span className="tabular">{stats.strategyCount}</span> schemes
              {activeCount > 0 ? (
                <>
                  {" "}
                  · <span className="tabular">{activeCount}</span> filter
                  {activeCount === 1 ? "" : "s"} on
                </>
              ) : null}
              {" · sorted by "}
              {sort.label.toLowerCase()}
              {compared.length > 0 ? (
                <>
                  {" "}
                  · <span className="tabular text-ink">{compared.length}</span>{" "}
                  selected
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                disabled={
                  activeCount === 0 &&
                  picked.length === 0 &&
                  sort.id === SORTS[0].id
                }
                className={cn(
                  PILL_BASE,
                  activeCount === 0 &&
                    picked.length === 0 &&
                    sort.id === SORTS[0].id
                    ? "cursor-not-allowed border border-hairline text-pending"
                    : "glass glass-ghost text-body",
                )}
              >
                Clear all
              </button>

              <button
                ref={compareRef}
                type="button"
                onClick={() => setOpen(true)}
                disabled={compared.length < 2}
                className={cn(
                  PILL_BASE,
                  compared.length < 2
                    ? "cursor-not-allowed border border-hairline text-pending"
                    : "glass glass-primary text-accent-dim",
                )}
              >
                Compare selected{" "}
                <span className="tabular">({compared.length})</span>
              </button>
            </div>
          </div>
        </div>

        <Rule className="mt-6" />

        {/* What the move is measured against — stated once here rather than
            repeated beside all thirty figures. */}
        <p className="mt-8 max-w-[86ch] text-[13px] leading-[20px] text-muted">
          <span className="text-ink">Change</span> sits beneath each NAV and is
          the move since that scheme’s <em>previous published</em> NAV, which is
          not always the day before — weekends, holidays and non-dealing days
          are absent from AMFI’s series. It is shown as a percentage, never as a
          rupee gap between schemes: two of the{" "}
          <span className="tabular">{stats.strategyCount}</span> are priced off
          a different face value. A scheme with only one published NAV shows{" "}
          <Delta pct={null} /> rather than a{" "}
          <span className="tabular">0.00%</span> that would claim it was
          unchanged.
        </p>

        {/* Desktop: a real table. Eleven columns of disclosure need the
            semantics — and the scroll container is focusable so a keyboard
            can reach the far columns. */}
        <div
          role="region"
          aria-label="SIF scheme comparison table"
          tabIndex={0}
          className="mt-6 hidden overflow-x-auto border border-hairline bg-surface md:block"
        >
          <table className="w-full min-w-[1420px] border-collapse text-left">
            <thead>
              <tr>
                {COLUMNS.map((column, i) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted",
                      i === 0 && "pl-6",
                      i === COLUMNS.length - 1 && "pr-6",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.srOnly ? (
                      <span className="sr-only">{column.label}</span>
                    ) : (
                      column.label
                    )}
                    {column.sub ? (
                      <span className="mt-1 block text-[12px] normal-case tracking-normal text-muted">
                        {column.sub}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>

            <RowGroup>
              {sorted.length === 0 ? (
                <tr className="border-t border-hairline">
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-10 text-[15px] leading-[24px] text-muted"
                  >
                    No scheme matches these filters. Clear one to widen the
                    field.
                  </td>
                </tr>
              ) : (
                sorted.map((strategy, i) => (
                  <Row
                    key={strategy.id}
                    strategy={strategy}
                    index={i}
                    idPrefix={`${uid}-d`}
                    checked={picked.includes(strategy.id)}
                    onToggle={() => togglePick(strategy.id)}
                  />
                ))
              )}
            </RowGroup>
          </table>
        </div>

        {/* Mobile: the SAME filtered and sorted array, stacked. Eleven
            columns will not fit, but the disclosures still have to. */}
        <ul className="mt-6 border border-hairline bg-surface md:hidden">
          {sorted.length === 0 ? (
            <li className="px-6 py-10 text-[15px] leading-[24px] text-muted">
              No scheme matches these filters. Clear one to widen the field.
            </li>
          ) : (
            sorted.map((strategy, i) => (
              <StackedCard
                key={strategy.id}
                strategy={strategy}
                index={i}
                idPrefix={`${uid}-m`}
                checked={picked.includes(strategy.id)}
                onToggle={() => togglePick(strategy.id)}
              />
            ))
          )}
        </ul>

        <p className="mt-5 max-w-[86ch] text-[13px] leading-[20px] text-muted">
          {MINIMUMS.length === 0 ? (
            <>Minimum investment is not captured for any scheme listed. </>
          ) : MINIMUMS.length === 1 ? (
            <>
              Minimum investment is{" "}
              <span className="tabular">{formatInr(MINIMUMS[0])}</span> for each
              of the{" "}
              <span className="tabular">{MINIMUM_DISCLOSED}</span> schemes that
              disclose it, and not captured for the rest.{" "}
            </>
          ) : (
            <>
              Minimum investment ranges from{" "}
              <span className="tabular">{formatInr(MINIMUMS[0])}</span> to{" "}
              <span className="tabular">
                {formatInr(MINIMUMS[MINIMUMS.length - 1])}
              </span>{" "}
              across the <span className="tabular">{MINIMUM_DISCLOSED}</span>{" "}
              schemes that disclose it; see the comparison for the figure on
              each.{" "}
            </>
          )}
          NAV data fetched from AMFI. Updated daily. NAVs as at{" "}
          {formatUpdated(navLastUpdated)}; source: {navSource}.
          {NAV_RANGE ? (
            <>
              {" "}
              Absolute NAVs are not comparable between schemes — they run from{" "}
              <span className="tabular">{formatNav(NAV_RANGE.low)}</span> to{" "}
              <span className="tabular">{formatNav(NAV_RANGE.high)}</span>{" "}
              because face values differ, not because one has outperformed
              another, so nothing here is ranked or scaled by NAV.
            </>
          ) : null}
        </p>
      </Shell>

      <CompareDialog open={open} strategies={compared} onClose={closeCompare} />
    </Section>
  );
}

/* ============================================================
   Filter block
   ============================================================ */

function FilterBlock({
  uid,
  title,
  note,
  groups,
  selections,
  onToggle,
  className,
}: {
  uid: string;
  title: string;
  /** States the block's scope BEFORE the pills it governs, not after. */
  note: ReactNode;
  groups: FilterGroup[];
  selections: Record<string, string[]>;
  onToggle: (groupKey: string, optionId: string) => void;
  className?: string;
}) {
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;

  return (
    <div
      className={className}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={noteId}
    >
      <p
        id={titleId}
        className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-ink"
      >
        {title}
      </p>

      <p
        id={noteId}
        className="mt-3 max-w-[80ch] text-[13px] leading-[20px] text-muted"
      >
        {note}
      </p>

      <div className="mt-5 border-t border-hairline">
        {groups.map((group) => {
          const labelId = `${uid}-${group.key}`;
          const chosen = selections[group.key] ?? [];
          return (
            <div
              key={group.key}
              className="grid gap-3 border-b border-hairline py-5 md:grid-cols-[168px_1fr] md:items-baseline md:gap-6"
            >
              <p
                id={labelId}
                className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted"
              >
                {group.label}
              </p>

              <div
                role="group"
                aria-labelledby={labelId}
                className="flex flex-wrap gap-2"
              >
                {group.options.map((option) => {
                  const empty = option.count === 0;
                  const on = chosen.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={empty}
                      aria-pressed={empty ? undefined : on}
                      onClick={() => !empty && onToggle(group.key, option.id)}
                      className={cn(
                        PILL_BASE,
                        empty
                          ? "cursor-not-allowed border border-hairline text-pending"
                          : on
                            ? "glass glass-active text-ink"
                            : "glass glass-ghost text-body",
                      )}
                    >
                      {option.label}{" "}
                      <span className="tabular">({option.count})</span>
                      {option.note ? (
                        <span className="ml-2">· {option.note}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Honest nulls

   AMFI's feed carries no disclosure data, so a missing field is a fact
   about what we hold — never a blank, never a dash that could be read
   as "zero", never a default.
   ============================================================ */

function NotCaptured({ className }: { className?: string }) {
  return (
    <span className={cn("text-[13px] leading-[20px] text-muted", className)}>
      Not captured
    </span>
  );
}

function Field({
  value,
  className,
  tabular,
}: {
  value: string | null;
  className?: string;
  tabular?: boolean;
}) {
  if (value === null) return <NotCaptured />;
  return (
    <span
      className={cn(
        "block text-[13px] leading-[20px] text-body",
        tabular && "tabular",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** `cap` true renders the figure as a ceiling — ISIDs quote the maximum
    permissible TER, not the ratio the scheme currently charges. */
function Percent({
  value,
  cap = null,
}: {
  value: number | null;
  cap?: boolean | null;
}) {
  if (value === null) return <NotCaptured />;
  return (
    <span className="tabular text-[13px] leading-[20px] text-ink">
      {formatExpense(value, cap)}
    </span>
  );
}

const NOT_CAPTURED_NOTE =
  "Disclosures for this scheme are not yet captured — see the scheme information document.";

/* ============================================================
   Rows
   ============================================================ */

type RowProps = {
  strategy: Strategy;
  index: number;
  idPrefix: string;
  checked: boolean;
  onToggle: () => void;
};

function SelectBox({
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
      {/* Form controls are the one place a 4–6px radius is allowed. */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer rounded-[4px] border border-hairline accent-accent"
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
    </>
  );
}

function Row({ strategy, index, idPrefix, checked, onToggle }: RowProps) {
  const amc = amcById.get(strategy.amcId);
  const nav = getNav(strategy.id);

  return (
    <RowItem
      index={index}
      className={cn(
        "border-t border-hairline transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        // Selection is a surface tint, never a stripe: no zebra anywhere.
        checked ? "bg-accent-wash" : "hover:bg-surface-2",
      )}
    >
      <td className="px-4 py-4 pl-6 align-top">
        <SelectBox
          id={`${idPrefix}-${strategy.id}`}
          label={`Select ${strategy.name} for comparison`}
          checked={checked}
          onToggle={onToggle}
        />
      </td>

      <td className="px-4 py-4 align-top">
        <span className="flex items-start gap-3">
          <AmcMark amc={amc} />
          <span className="min-w-0">
            <span className="block text-[14px] leading-[20px] text-ink">
              {amc?.sifName ?? "—"}
            </span>
            <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
              {amc?.name ?? ""}
            </span>
          </span>
        </span>
      </td>

      <td className="px-4 py-4 align-top">
        <span className="block max-w-[300px] text-[15px] leading-[22px] text-ink">
          {strategy.name}
        </span>
        <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
          {strategy.type}
        </span>
      </td>

      <td className="px-4 py-4 align-top">
        <CategoryChip category={strategy.category} />
      </td>

      {/* NAV and its move share one cell rather than taking two: the table
          already scrolls, and the move is only meaningful next to the figure
          it moved from. */}
      <td className="px-4 py-4 text-right align-top">
        {nav.status === "live" ? (
          <>
            <span className="tabular block text-[15px] leading-[22px] text-ink">
              {formatNav(nav.today)}
            </span>
            <span className="mt-0.5 block">
              <Delta pct={nav.changePct} />
            </span>
          </>
        ) : (
          <PendingBadge />
        )}
      </td>

      {/* The six disclosure columns collapse to one honest cell rather than
          repeating "Not captured" six times across a row. */}
      {strategy.disclosuresCaptured ? (
        <>
          <td className="px-4 py-4 align-top">
            <RiskBand band={riskBandNumber(strategy.riskBand)} />
          </td>

          <td className="px-4 py-4 align-top">
            <Field value={strategy.benchmark} className="max-w-[200px]" />
          </td>

          <td className="px-4 py-4 align-top">
            <Field
              value={strategy.exitLoad}
              className="max-w-[180px]"
              tabular
            />
          </td>

          <td className="px-4 py-4 text-right align-top">
            <Percent value={strategy.expenseRatio} cap={strategy.expenseRatioIsCap} />
          </td>

          <td className="px-4 py-4 align-top">
            <Field value={strategy.redemptionFrequency} className="max-w-[200px]" />
          </td>

          <td className="px-4 py-4 pr-6 align-top">
            <Field value={strategy.taxation} className="max-w-[280px]" />
          </td>
        </>
      ) : (
        <td
          colSpan={DISCLOSURE_COLUMNS}
          className="px-4 py-4 pr-6 align-top text-[13px] leading-[20px] text-muted"
        >
          {NOT_CAPTURED_NOTE}
        </td>
      )}
    </RowItem>
  );
}

function StackedCard({
  strategy,
  index,
  idPrefix,
  checked,
  onToggle,
}: RowProps) {
  const amc = amcById.get(strategy.amcId);
  const nav = getNav(strategy.id);

  return (
    <RowListItem
      index={index}
      className={cn(
        "border-b border-hairline px-6 py-5 last:border-b-0",
        checked && "bg-accent-wash",
      )}
    >
      <div className="flex items-start gap-4">
        <span className="pt-1">
          <SelectBox
            id={`${idPrefix}-${strategy.id}`}
            label={`Select ${strategy.name} for comparison`}
            checked={checked}
            onToggle={onToggle}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-start gap-3">
                <AmcMark amc={amc} />
                <span className="min-w-0">
                  <span className="block text-[15px] leading-[22px] text-ink">
                    {strategy.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-[16px] text-muted">
                    {amc?.sifName ?? "—"} · {strategy.type}
                  </span>
                </span>
              </p>
            </div>
            <CategoryChip category={strategy.category} />
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {nav.status === "live" ? (
              <>
                <span className="tabular text-[15px] leading-[22px] text-ink">
                  {formatNav(nav.today)}
                </span>
                <Delta pct={nav.changePct} />
                <span className="text-[12px] leading-[16px] text-muted">
                  as at {formatUpdated(nav.asOf)}
                </span>
              </>
            ) : (
              <PendingBadge />
            )}
          </div>

          {/* Said once at card level, as the flag exists for — not five
              times down the list. */}
          {strategy.disclosuresCaptured ? (
            <>
              <div className="mt-4">
                <RiskBand band={riskBandNumber(strategy.riskBand)} />
              </div>

              <dl className="mt-4 border-t border-hairline">
                <MiniRow label="Benchmark">
                  <Field value={strategy.benchmark} />
                </MiniRow>
                <MiniRow label="Minimum">
                  {strategy.minInvestment === null ? (
                    <NotCaptured />
                  ) : (
                    <span className="tabular">
                      {formatInr(strategy.minInvestment)}
                    </span>
                  )}
                </MiniRow>
                <MiniRow label="Exit load">
                  <Field value={strategy.exitLoad} tabular />
                </MiniRow>
                <MiniRow label="Expense">
                  <Percent value={strategy.expenseRatio} cap={strategy.expenseRatioIsCap} />
                </MiniRow>
                <MiniRow label="Redemption">
                  <Field value={strategy.redemptionFrequency} />
                </MiniRow>
                <MiniRow label="Taxation">
                  <Field value={strategy.taxation} />
                </MiniRow>
              </dl>
            </>
          ) : (
            <>
              <p className="mt-4 text-[13px] leading-[20px] text-muted">
                {NOT_CAPTURED_NOTE}
              </p>

              {/* What the feed does give us, so the card is not just an
                  apology. */}
              <dl className="mt-4 border-t border-hairline">
                <MiniRow label="AMFI code">
                  <span className="tabular">{strategy.amfiSchemeCode}</span>
                </MiniRow>
                <MiniRow label="ISIN">
                  <Field value={strategy.isin} tabular />
                </MiniRow>
              </dl>
            </>
          )}
        </div>
      </div>
    </RowListItem>
  );
}

function MiniRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-5 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[13px] leading-[20px] text-body">
        {children}
      </dd>
    </div>
  );
}

function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-2.5 py-0.5 text-[12px] capitalize leading-[18px] text-body">
      {category}
    </span>
  );
}

/* ============================================================
   Compare dialog — property by property.

   Focus is trapped, Escape and the backdrop close it, and focus
   returns to the button that opened it. Enter 0.22s, exit 0.15s:
   exits are always faster than entrances.

   Every property renders a value or "Not captured". No blanks — a
   blank cell in a comparison reads as "nothing to disclose", which
   is a different claim from "we have not captured it".
   ============================================================ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function CompareDialog({
  open,
  strategies: chosen,
  onClose,
}: {
  open: boolean;
  strategies: Strategy[];
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  /* createPortal needs a real document, which does not exist during SSR. */
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const undisclosed = chosen.filter((s) => !s.disclosuresCaptured).length;

  /**
   * Portalled to <body>, not rendered in place.
   *
   * The dialog's mount point is inside `<Section id="tracker">`, whose
   * `isolate` (isolation: isolate) opens a stacking context. A z-index only
   * ranks siblings WITHIN its context, so the overlay's z-[1000] ranked it
   * against the tracker's own children while the section as a whole painted
   * at z-auto — losing to the sticky site header's z-[200], a direct child of
   * <body>. The header band cut across the top of the panel and its nav links
   * stayed lit and clickable over the backdrop, with aria-modal="true" set.
   * That same element's `overflow-x-clip` can also clip fixed descendants.
   *
   * A portal sidesteps both: the overlay becomes a child of <body>, in the
   * root stacking context, where z-[1000] means what it says.
   *
   * `mounted` gates it because document does not exist during SSR. The dialog
   * is only reachable by clicking, so there is nothing to server-render.
   */
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          /* AnimatePresence tracks its children BY KEY — without one the
             exiting overlay is never unmounted and a transparent full-screen
             layer keeps swallowing every click on the page. */
          key="compare-dialog"
          className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: EXIT } }}
          transition={{ duration: DUR.ui, ease: EASE.outQuart }}
          onKeyDown={onKeyDown}
        >
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: "oklch(0.19 0.011 265 / 0.55)" }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, transition: { duration: EXIT } }}
            transition={{ duration: 0.22, ease: EASE.outQuart }}
            className="relative flex max-h-[88vh] w-full max-w-[1100px] flex-col border border-hairline bg-surface outline-none"
          >
            <div className="flex items-start justify-between gap-6 border-b border-hairline px-6 py-5 sm:px-8">
              <div>
                <h2
                  id={titleId}
                  className="text-[22px] font-medium leading-[30px] text-ink"
                >
                  Comparing <span className="tabular">{chosen.length}</span>{" "}
                  schemes
                </h2>
                <p className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-muted">
                  Every field exactly as filed. NAV data fetched from AMFI,
                  updated daily, as at {formatUpdated(navLastUpdated)}.
                  {undisclosed > 0 ? (
                    <>
                      {" "}
                      <span className="tabular text-ink">{undisclosed}</span> of
                      these schemes has no captured scheme information document,
                      so its disclosure rows read{" "}
                      <span className="text-ink">Not captured</span> rather than
                      a value we do not hold.
                    </>
                  ) : null}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:bg-accent-wash"
              >
                <span className="sr-only">Close comparison</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m2 2 10 10M12 2 2 12"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div
              className="flex-1 overflow-auto"
              data-lenis-prevent
              role="region"
              aria-label="Scheme comparison, property by property"
              tabIndex={0}
            >
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 border-b border-hairline bg-surface px-6 py-3 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted sm:px-8"
                    >
                      Property
                    </th>
                    {chosen.map((s) => (
                      <th
                        key={s.id}
                        scope="col"
                        className="min-w-[240px] border-b border-hairline px-4 py-3 align-bottom"
                      >
                        {/* Not uppercased — the sub-brands are cased
                            deliberately (iSIF, QSIF, WSIF). */}
                        <span className="block text-[12px] font-semibold leading-[14px] text-accent">
                          {amcById.get(s.amcId)?.sifName ?? "—"}
                        </span>
                        <span className="mt-1 block text-[15px] font-medium leading-[22px] text-ink">
                          {s.name}
                        </span>
                        {s.disclosuresCaptured ? null : (
                          <span className="mt-2 block text-[12px] leading-[16px] font-normal text-muted">
                            {NOT_CAPTURED_NOTE}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {PROPERTIES.map((property) => (
                    <tr key={property.label} className="align-top">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-hairline bg-surface px-6 py-4 text-[13px] font-normal leading-[20px] text-muted sm:px-8"
                      >
                        {property.label}
                      </th>
                      {chosen.map((s) => (
                        <td
                          key={s.id}
                          className="border-b border-hairline px-4 py-4 text-[13px] leading-[20px] text-body"
                        >
                          {property.render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

const PROPERTIES: { label: string; render: (s: Strategy) => ReactNode }[] = [
  {
    label: "Asset manager",
    render: (s) => <Field value={amcById.get(s.amcId)?.name ?? null} />,
  },
  { label: "Category", render: (s) => <CategoryChip category={s.category} /> },
  { label: "Mandate", render: (s) => <Field value={s.type} /> },
  {
    label: "NAV",
    render: (s) => {
      const nav = getNav(s.id);
      return nav.status === "live" ? (
        <span className="tabular text-ink">{formatNav(nav.today)}</span>
      ) : (
        <PendingBadge />
      );
    },
  },
  {
    label: "NAV as at",
    render: (s) => {
      const nav = getNav(s.id);
      return nav.status === "live" ? (
        <span className="tabular">{formatUpdated(nav.asOf)}</span>
      ) : (
        <NotCaptured />
      );
    },
  },
  {
    /* Measured against each scheme's own previous published NAV, so the dates
       behind two rows may differ — the NAV-as-at row above carries them. */
    label: "Change",
    render: (s) => {
      const nav = getNav(s.id);
      return nav.status === "live" ? (
        <Delta pct={nav.changePct} />
      ) : (
        <NotCaptured />
      );
    },
  },
  {
    label: "Risk band",
    render: (s) => <RiskBand band={riskBandNumber(s.riskBand)} />,
  },
  {
    label: "Minimum investment",
    render: (s) =>
      s.minInvestment === null ? (
        <NotCaptured />
      ) : (
        <span className="tabular text-ink">{formatInr(s.minInvestment)}</span>
      ),
  },
  {
    label: "Expense ratio",
    render: (s) => <Percent value={s.expenseRatio} cap={s.expenseRatioIsCap} />,
  },
  {
    label: "Exit load",
    render: (s) => <Field value={s.exitLoad} tabular />,
  },
  { label: "Benchmark", render: (s) => <Field value={s.benchmark} /> },
  {
    label: "Redemption",
    render: (s) => <Field value={s.redemptionFrequency} />,
  },
  { label: "Taxation", render: (s) => <Field value={s.taxation} /> },
  { label: "Dividend", render: (s) => <Field value={s.dividend} /> },
  {
    label: "AMFI scheme code",
    render: (s) => <span className="tabular">{s.amfiSchemeCode}</span>,
  },
  { label: "ISIN", render: (s) => <Field value={s.isin} tabular /> },
  { label: "Overview", render: (s) => <Field value={s.overview} /> },
];
