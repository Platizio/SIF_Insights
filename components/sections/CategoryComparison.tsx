import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise, RowItem, Rule } from "@/components/motion/Reveal";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/* ============================================================
   The category table — one source of truth, two renderings.
   Desktop gets a real <table>; below md the same arrays render
   as one card per category. Nothing is duplicated by hand.
   ============================================================ */

type ColumnKey = "sif" | "mf" | "pms" | "aif";

type Column = { key: ColumnKey; label: string; ours?: boolean };

/** SIF leads, and is the only tinted column. */
const COLUMNS: Column[] = [
  { key: "sif", label: "SIF", ours: true },
  { key: "mf", label: "Mutual Fund" },
  { key: "pms", label: "PMS" },
  { key: "aif", label: "AIF" },
];

type Cell =
  | { kind: "text"; text: string }
  | { kind: "figure"; value: string; lead?: string };

const txt = (text: string): Cell => ({ kind: "text", text });
/**
 * Figures carry `.tabular` so the minimums align down the row. These are
 * editorial category copy — the regulatory thresholds of four *product
 * classes*, not values from `@/lib/data` — so they stay verbatim strings.
 * Never route them through `<Odometer>` or `formatInr`.
 */
const fig = (value: string, lead?: string): Cell => ({ kind: "figure", value, lead });

type Row = { label: string; cells: Record<ColumnKey, Cell> };

const ROWS: Row[] = [
  {
    label: "Minimum",
    cells: {
      sif: fig("₹10 lakh"),
      mf: fig("₹500", "As low as"),
      pms: fig("₹50 lakh"),
      aif: fig("₹1 crore"),
    },
  },
  {
    label: "Targeted investors",
    cells: {
      sif: txt("HNIs, professionals, retail with high-risk appetite"),
      mf: txt("Retail, HNIs, institutional"),
      pms: txt("HNIs, UHNIs, family offices"),
      aif: txt("UHNIs, institutions, sophisticated investors"),
    },
  },
  {
    label: "Structure",
    cells: {
      sif: txt("Pooled fund with advanced strategies"),
      mf: txt("Pooled vehicle across equity, debt, hybrid"),
      pms: txt("Individually managed portfolios"),
      aif: txt("Pooled fund (Cat I, II, III) — startups, PE, hedge funds"),
    },
  },
  {
    label: "Strategies",
    cells: {
      sif: txt("Flexible; long-short, dynamic asset allocation"),
      mf: txt("Plain vanilla: equity, debt, hybrid, thematic, index, ETFs"),
      pms: txt("Customised per client"),
      aif: txt("PE/VC, distressed, hedge-fund-like"),
    },
  },
  {
    label: "Taxation",
    cells: {
      sif: txt("Pass-through (like mutual funds)"),
      mf: txt("Pass-through — LTCG/STCG by type"),
      pms: txt("Investor taxed directly"),
      aif: txt("Pass-through Cat I & II; Cat III taxed at fund level (trust @ 42.744%)"),
    },
  },
];

/**
 * Column hover, pure CSS. `:has()` is the only way to reach every cell of a
 * column from a hover on one of them — Tailwind cannot express it, and this
 * file may not touch globals.css. No JS, so it degrades to simply not
 * happening on touch and on ancient browsers.
 */
const COLUMN_HOVER_CSS = COLUMNS.filter((c) => !c.ours)
  .map(
    (c) =>
      `.sif-cmp:has([data-col=${c.key}]:hover) [data-col=${c.key}]{background-color:var(--color-surface-2)}`,
  )
  .join("");

/** Written out in full — Tailwind scans source text, so it cannot be interpolated. */
const LIFT = "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]";

const LABEL = "text-[13px] font-normal uppercase leading-[18px] tracking-[0.06em] text-muted";

/**
 * Cascade interval, matched to the `stagger` token that `<Group>` propagates
 * to its `<RowItem>` children. Keeping the rules on the same beat is what
 * makes each hairline read as leading its own row by a constant ~40ms
 * (`stagger`'s delayChildren) rather than drifting away from it.
 * Capped at 10 — past that a cascade reads as lag, not choreography.
 */
const STEP = 0.06;
const CASCADE_CAP = 10;
const stepDelay = (i: number) => Math.min(i, CASCADE_CAP - 1) * STEP;

function CellBody({ cell }: { cell: Cell }) {
  if (cell.kind === "figure") {
    return (
      <>
        {cell.lead ? <span className="text-muted">{cell.lead} </span> : null}
        <span className="tabular">{cell.value}</span>
      </>
    );
  }
  return <>{cell.text}</>;
}

export function CategoryComparison() {
  // No section background here — the <GlassField> behind the CTA gives that
  // one button its backdrop without texturing the whole section.
  return (
    <Section id="what-is-a-sif" className="relative isolate">
      <style href="sif-cmp-column-hover" precedence="default">
        {COLUMN_HOVER_CSS}
      </style>
      <Shell>
        <div className="grid gap-14 xl:grid-cols-[420px_804px] xl:gap-4">
          {/* Framing column — stays with the table on the way down. Sticky sits
              on a plain div; the motion wrappers live inside it, so no
              transformed ancestor can break the stick. */}
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>The category</Eyebrow>
            </Rise>

            <LineReveal
              lines={["Where SIFs", "sit."]}
              className="mt-6 text-[clamp(36px,3.8vw,52px)] font-medium leading-[1.12] text-ink"
            />

            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                Introduced by SEBI in 2025, Specialised Investment Funds occupy the gap
                between mutual funds and the PMS/AIF tier — hedge-fund-style long-short
                flexibility, inside a regulated pooled structure, from a{" "}
                <span className="tabular">₹10 lakh</span> minimum.
              </p>
            </Rise>

            {/* The quote's own left rule draws down as the lines rise. */}
            <blockquote className="relative mt-10 pl-6">
              <Rule vertical className="absolute inset-y-0 left-0" delay={0.12} />
              <LineReveal
                as="p"
                delay={0.18}
                lines={[
                  "A regulated middle ground —",
                  "advanced strategies, at a lower",
                  "ticket than PMS and AIF.",
                ]}
                className="text-[clamp(17px,1.7vw,20px)] leading-[1.6] text-ink"
              />
            </blockquote>

            <Rise delay={0.24} className="relative isolate mt-10 inline-block">
              <GlassField />
              <Button href="#strategies" variant="ghost">
                See the strategies
              </Button>
            </Rise>
          </div>

          {/* Comparison */}
          <div>
            {/* Desktop: real tabular data. Rows cascade at 8px via <RowItem>. */}
            <Group className="hidden md:block">
              <table className="sif-cmp w-full table-fixed border-separate border-spacing-0 text-left">
                <caption className="sr-only">
                  Specialised Investment Funds compared with mutual funds, PMS and AIF
                </caption>
                <thead>
                  {/* `relative` anchors the drawn rule to the full row width.
                      The rule must live inside a cell — a <div> is not valid
                      markup as a direct child of <tr>. */}
                  <RowItem className="relative">
                    <th scope="col" className="w-[13.5%] pb-5 pr-5 pt-6 align-bottom">
                      <span className="sr-only">Feature</span>
                      <Rule className="absolute inset-x-0 bottom-0" />
                    </th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        data-col={c.key}
                        className={cn(
                          "w-[21.625%] px-5 pb-5 pt-6 align-bottom text-[17px] font-medium leading-[24px]",
                          c.ours ? "bg-accent-wash text-ink" : `bg-surface text-body ${LIFT}`,
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                  </RowItem>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <RowItem key={row.label} className="relative">
                      <th scope="row" className={cn("py-6 pr-5 align-top text-left", LABEL)}>
                        {row.label}
                        <Rule
                          className="absolute inset-x-0 bottom-0"
                          delay={stepDelay(i + 1)}
                        />
                      </th>
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          data-col={c.key}
                          className={cn(
                            "px-5 py-6 align-top text-[15px] leading-[22px]",
                            c.ours ? "bg-accent-wash text-ink" : `bg-surface text-body ${LIFT}`,
                          )}
                        >
                          <CellBody cell={row.cells[c.key]} />
                        </td>
                      ))}
                    </RowItem>
                  ))}
                </tbody>
              </table>
            </Group>

            {/* Below md a four-column table is unreadable — same data, stacked. */}
            <Group className="grid gap-4 md:hidden">
              {COLUMNS.map((c) => (
                <GroupItem key={c.key}>
                  <article
                    className={cn(
                      "border border-hairline px-6 py-7",
                      c.ours ? "bg-accent-wash" : "bg-surface",
                    )}
                  >
                    <h3
                      className={cn(
                        "text-[17px] font-medium leading-[24px]",
                        c.ours ? "text-ink" : "text-body",
                      )}
                    >
                      {c.label}
                    </h3>
                    <dl className="mt-5">
                      {ROWS.map((row) => (
                        <div
                          key={row.label}
                          className="border-t border-hairline py-4 first:border-t-0 first:pt-0 last:pb-0"
                        >
                          <dt className={LABEL}>{row.label}</dt>
                          <dd
                            className={cn(
                              "mt-1 text-[15px] leading-[22px]",
                              c.ours ? "text-ink" : "text-body",
                            )}
                          >
                            <CellBody cell={row.cells[c.key]} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                </GroupItem>
              ))}
            </Group>
          </div>
        </div>
      </Shell>
    </Section>
  );
}
