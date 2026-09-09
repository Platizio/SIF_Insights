import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import {
  Delta,
  Eyebrow,
  PendingBadge,
  RiskBand,
  Section,
  Shell,
} from "@/components/primitives";
import {
  amcById,
  formatExpense,
  formatInr,
  formatNav,
  formatUpdated,
  getNav,
  hasFullDisclosures,
  navLastUpdated,
  navSourceUrl,
  riskBandNumber,
  stats,
  strategiesByCategory,
  type Category,
  type Strategy,
} from "@/lib/data";

/* ============================================================
   Routing. Three categories exist in the framework; anything
   else is a 404, not an empty page.
   ============================================================ */

const CATEGORIES: Category[] = ["equity", "hybrid", "debt"];

function isCategory(value: string): value is Category {
  return (CATEGORIES as string[]).includes(value);
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

const SEBI_CIRCULAR =
  "https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html";

/* ============================================================
   Facts are counted from @/lib/data, never asserted.

   Two populations, and they are NOT interchangeable. AMFI's feed
   gives every scheme a name, code, ISIN, mandate, category and
   NAV. The disclosure fields — band, minimum, expense, exit load,
   redemption, benchmark — exist only for the schemes we have
   researched. A tally that silently counts the researched subset
   while the header says thirty is a lie by omission, so every
   tally below carries the population it was counted over.
   ============================================================ */

/** Distinct values with how many schemes carry each, most common first. */
function tally<T extends string | number>(values: T[]): { value: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Pulls one disclosure field, dropping the schemes that do not have it. */
function captured<T>(list: Strategy[], pick: (s: Strategy) => T | null): T[] {
  return list.map(pick).filter((v): v is T => v !== null);
}

/**
 * One counted dimension: what was found, and how many it was looked for in.
 *
 * `captured()` drops the nulls, which is correct for the values and wrong
 * for the denominator. Counting twelve risk bands and then printing them
 * "of 14" is the same lie by omission this page exists to prevent — the two
 * missing schemes vanish between the tally and its heading. So the shortfall
 * travels WITH the tally instead of being recomputed at the call site, and
 * the row below renders it as a stated absence.
 */
type Tally<T extends string | number> = {
  rows: { value: T; count: number }[];
  /** Schemes in `population` that actually state this field. */
  captured: number;
  /** Schemes the field was looked for in — the row's real denominator. */
  population: number;
};

/** Tallies one field over `list`, keeping the count it failed to find. */
function dimension<T extends string | number>(
  list: Strategy[],
  pick: (s: Strategy) => T | null,
  order?: (a: { value: T; count: number }, b: { value: T; count: number }) => number,
): Tally<T> {
  const values = captured(list, pick);
  const rows = tally(values);
  return {
    rows: order ? [...rows].sort(order) : rows,
    captured: values.length,
    population: list.length,
  };
}

function summarise(list: Strategy[]) {
  const disclosed = list.filter((s) => s.disclosuresCaptured);

  return {
    count: list.length,
    houses: new Set(list.map((s) => s.amcId)).size,
    live: list.filter((s) => getNav(s.id).status === "live").length,
    /** Schemes with a disclosures entry at all — NOT with every field in it. */
    disclosed: disclosed.length,
    /**
     * Of those, how many still leave one of the named fields blank.
     *
     * `hasFullDisclosures` is the site-wide definition of a complete entry,
     * so the heading that introduces these rows and the counts on them are
     * answering the same question. Each row still states its own coverage;
     * this figure only warns the reader that the rows will not agree.
     */
    incomplete: disclosed.filter((s) => !hasFullDisclosures(s)).length,

    // From the feed — present for all `count`.
    mandates: dimension(list, (s) => s.type),

    // From disclosures — looked for in `disclosed`, found in fewer.
    bands: dimension(
      disclosed,
      (s) => riskBandNumber(s.riskBand),
      (a, b) => a.value - b.value,
    ),
    minimums: dimension(disclosed, (s) => s.minInvestment),
    /* Tallied as FORMATTED figures, not bare ratios. Every ratio on file is
       the ISID's maximum permissible TER, and `formatExpense` is the one
       place that says so; grouping the numbers and printing "%" after them
       would state a fee the investor may not be paying — and would drop the
       two-decimal form every other expense figure on the site uses. */
    expenses: dimension(disclosed, (s) =>
      formatExpense(s.expenseRatio, s.expenseRatioIsCap),
    ),
    exitLoads: dimension(disclosed, (s) => s.exitLoad),
    redemptions: dimension(disclosed, (s) => s.redemptionFrequency),
    benchmarks: dimension(disclosed, (s) => s.benchmark),
  };
}

type Facts = ReturnType<typeof summarise>;

/* ============================================================
   Copy. Standfirsts take the counted facts rather than asserting
   numbers, so a new AMFI file cannot leave the prose stale.
   ============================================================ */

const COPY: Record<
  Category,
  {
    eyebrow: string;
    lines: string[];
    standfirst: (f: Facts) => ReactNode;
    metaTitle: string;
    metaDescription: string;
  }
> = {
  equity: {
    eyebrow: "Equity",
    lines: ["Long-short", "equity."],
    standfirst: (f) => (
      <>
        Every equity SIF currently offered in India — {f.count} schemes from{" "}
        {/* Explicit `{" "}`: the space that follows this expression on the
            same source line is swallowed in the compiled output, so the count
            ran into the next word ("3distinct"). */}
        {f.houses} houses, across {f.mandates.rows.length}{" "}
        distinct long-short mandates. Name, code and NAV come from
        AMFI&apos;s feed; the disclosure rows come from the asset manager
        {/* Both clauses are conditional because both count absences, and an
            absence of nothing is not a fact worth printing: "0 schemes have
            none captured yet" reads as a defect, not as full coverage. */}
        {f.count - f.disclosed > 0 ? (
          <>, and {f.count - f.disclosed} schemes have none captured yet</>
        ) : null}
        {f.incomplete > 0 ? (
          <>
            , and {f.incomplete} of the captured entries still leave a field
            blank
          </>
        ) : null}
        .
      </>
    ),
    metaTitle: "Equity strategies",
    metaDescription:
      "Every equity Specialised Investment Fund offered in India, with the mandate and NAV AMFI publishes for each, and the risk band, exit load, expense ratio, benchmark and redemption frequency where the asset manager's disclosures have been captured.",
  },
  hybrid: {
    eyebrow: "Hybrid",
    lines: ["Multi-asset", "long-short."],
    standfirst: (f) => (
      <>
        Every hybrid SIF currently offered in India — {f.count} schemes from{" "}
        {f.houses} houses, across {f.mandates.rows.length} multi-asset long-short
        mandates. Where disclosures are captured, the risk bands and redemption
        windows genuinely differ house to house
        {/* "the other 0 schemes publish a NAV and nothing else" was printing
            whenever coverage was complete. Both shortfalls are stated only
            when there is one, and the gap that actually bites this page is
            the second: every hybrid scheme has an entry, four of them are a
            field short. */}
        {f.count - f.disclosed > 0 ? (
          <>
            ; the other {f.count - f.disclosed} schemes publish a NAV and
            nothing else
          </>
        ) : null}
        {f.incomplete > 0 ? (
          <>
            ; {f.incomplete} of the entries we hold state every field but one,
            and each row below counts that absence rather than dropping the
            scheme
          </>
        ) : null}
        .
      </>
    ),
    metaTitle: "Hybrid strategies",
    metaDescription:
      "Every hybrid Specialised Investment Fund offered in India, with the mandate and NAV AMFI publishes for each, and the risk band, exit load, expense ratio, benchmark and redemption frequency where the asset manager's disclosures have been captured.",
  },
  debt: {
    eyebrow: "Debt",
    lines: ["Debt SIFs,", "not yet filed."],
    standfirst: () => (
      <>
        SEBI&apos;s framework permits a debt category alongside equity and hybrid.
        No asset manager has filed one, so this page has no schemes — and no
        placeholder cards standing in for them.
      </>
    ),
    metaTitle: "Debt strategies",
    metaDescription:
      "No debt Specialised Investment Fund has launched in India yet. SEBI's 2025 framework permits the category; we will list schemes here as they are filed.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};

  return {
    title: COPY[category].metaTitle,
    description: COPY[category].metaDescription,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const copy = COPY[category];
  const list = strategiesByCategory[category];
  const facts = summarise(list);
  const empty = list.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={copy.eyebrow}
        lines={copy.lines}
        standfirst={copy.standfirst(facts)}
        meta={
          empty
            ? [
                <>
                  <span className="tabular">0</span> schemes filed
                </>,
                <>SEBI framework, February 2025</>,
                <>Checked {formatUpdated(navLastUpdated)}</>,
              ]
            : [
                <>
                  <span className="tabular">{facts.count}</span>{" "}
                  {facts.count === 1 ? "scheme" : "schemes"}
                </>,
                <>
                  <span className="tabular">{facts.houses}</span>{" "}
                  {facts.houses === 1 ? "asset manager" : "asset managers"}
                </>,
                <>
                  <span className="tabular">{facts.mandates.rows.length}</span>{" "}
                  {facts.mandates.rows.length === 1 ? "mandate" : "mandates"}
                </>,
                <>
                  <span className="tabular">
                    {facts.disclosed} of {facts.count}
                  </span>{" "}
                  with disclosures captured
                </>,
                <>Updated {formatUpdated(navLastUpdated)}</>,
              ]
        }
      />

      {empty ? (
        <EmptyCategory />
      ) : (
        <>
          <AtAGlance facts={facts} />
          <Schemes list={list} facts={facts} />
        </>
      )}

      <RiskDisclosure empty={empty} />
      <CategoryNav current={category} />
      <ConsultCta
        lines={["Compare first.", "Consult before you commit."]}
        body={
          <>
            Tell us your goals, horizon and risk comfort. We will show you what
            each scheme discloses and where the {stats.strategyCount} schemes
            differ — as a distributor, not an adviser.
          </>
        }
      />
    </>
  );
}

/* ============================================================
   At a glance.

   Split into two blocks with two different denominators, and each
   row restates its own. The feed block is complete; the
   disclosure block covers a subset and says so twice — once as a
   block heading, once per row — because a reader who lands on a
   single row must still be able to see what it was counted over.

   "Its own" means its own FIELD. A single `disclosureScope` shared
   by six rows was counting documents, and a document is not a
   field: on hybrid it announced "14 of 14 with disclosures" above
   twelve risk bands, because two of those fourteen entries state
   no band. Each row now derives its scope from the field it
   tallies, and every shortfall is rendered as a "Not captured"
   entry so the counts sum to the total the row states.
   ============================================================ */

/**
 * What one row was counted over, taken from the field rather than the file.
 *
 * Read on its own, "12 of the 14 with disclosures" is the whole story: the
 * page holds fourteen entries and twelve of them answer this question.
 */
function scopeOf(counts: { captured: number; population: number }): string {
  return counts.captured === counts.population
    ? `all ${counts.population} with disclosures`
    : `${counts.captured} of the ${counts.population} with disclosures`;
}

/**
 * The heading over the disclosure tallies, and the only sentence that has to
 * hold for all six rows at once.
 *
 * Two independent shortfalls, so two independent clauses. `missing` counts
 * schemes with no entry at all — they are outside every tally below.
 * `incomplete` counts entries that exist and are still a field short, which
 * is the failure that made this heading wrong: it read "Captured for all 14"
 * over rows summing to twelve. Neither clause prints at zero.
 */
function disclosureNote(facts: Facts, missing: number): string {
  if (missing === 0 && facts.incomplete === 0) {
    return `Captured for all ${facts.count} schemes on this page.`;
  }

  const gaps =
    facts.incomplete === 0
      ? ""
      : ` An entry is not a full set: ${facts.incomplete} of the ${facts.disclosed} we hold state every field but one. Each row below is counted over the schemes that disclose that field, and the rest are counted as “Not captured” rather than dropped, so every row sums to the total it states.`;

  if (missing === 0) {
    return `An entry exists for all ${facts.count} schemes on this page.${gaps}`;
  }

  return `Captured for ${facts.disclosed} of ${facts.count} schemes. The other ${missing} publish a NAV and nothing else, so they are in none of the tallies below — they appear further down with every disclosure row marked “Not captured”.${gaps}`;
}

function AtAGlance({ facts }: { facts: Facts }) {
  const missing = facts.count - facts.disclosed;

  return (
    <Section id="at-a-glance">
      <Shell>
        <div className="grid gap-12 xl:grid-cols-[420px_1fr] xl:gap-16">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>At a glance</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Counted,", "not claimed."]}
              className="mt-6 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
            />
            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                Each row below is a tally, and each states the schemes it was
                counted over. AMFI&apos;s feed covers all {facts.count}; the
                disclosure rows cover the {facts.disclosed} whose filings we hold,
                so nothing here averages a gap into a number.
              </p>
            </Rise>

            <Rise delay={0.16}>
              <div className="mt-10 flex flex-wrap gap-x-12 gap-y-8">
                <div>
                  <Odometer
                    value={facts.count}
                    className="block text-[clamp(38px,4vw,52px)] font-medium leading-[1.06] text-ink"
                  />
                  <p className="mt-2 text-[13px] leading-[20px] text-muted">
                    Schemes
                  </p>
                </div>
                <div>
                  <Odometer
                    value={facts.houses}
                    className="block text-[clamp(38px,4vw,52px)] font-medium leading-[1.06] text-ink"
                  />
                  <p className="mt-2 text-[13px] leading-[20px] text-muted">
                    Asset managers
                  </p>
                </div>
                <div>
                  <Odometer
                    value={facts.disclosed}
                    className="block text-[clamp(38px,4vw,52px)] font-medium leading-[1.06] text-ink"
                  />
                  <p className="mt-2 text-[13px] leading-[20px] text-muted">
                    of {facts.count} with disclosures
                  </p>
                </div>
              </div>
            </Rise>
          </div>

          <div className="flex flex-col gap-14">
            <Group>
              <GroupItem>
                <BlockHeading
                  label="From AMFI's feed"
                  note={`Published for all ${facts.count} schemes on this page.`}
                />
              </GroupItem>
              <dl>
                <TallyRow
                  label="Mandate"
                  scope={`all ${facts.count} schemes`}
                  counts={facts.mandates}
                />
                {/* The one feed field that can be absent: a scheme in the
                    file with no published NAV is counted, not omitted. */}
                <TallyRow
                  label="NAV observation"
                  scope={`all ${facts.count} schemes`}
                  counts={{
                    rows: [
                      {
                        value: `Live, as at ${formatUpdated(navLastUpdated)}`,
                        count: facts.live,
                      },
                    ],
                    captured: facts.live,
                    population: facts.count,
                  }}
                  absent="No NAV in the current AMFI file"
                />
              </dl>
            </Group>

            <Group>
              <GroupItem>
                {/* Three states, because there are three ways coverage can
                    fall short: no entry, an entry missing a field, or both.
                    The old heading knew only the first, so a page where
                    every scheme had an entry announced full capture while
                    the rows beneath it counted twelve of fourteen. */}
                <BlockHeading
                  label="From scheme disclosures"
                  note={disclosureNote(facts, missing)}
                />
              </GroupItem>
              <dl>
                <TallyRow
                  label="Risk band"
                  scope={scopeOf(facts.bands)}
                  counts={facts.bands}
                  render={(band) => <RiskBand band={band} />}
                />
                <TallyRow
                  label="Minimum investment"
                  scope={scopeOf(facts.minimums)}
                  counts={facts.minimums}
                  render={(v) => <span className="tabular">{formatInr(v)}</span>}
                />
                {/* `formatExpense` has already qualified the figure — see
                    `summarise`. Printing the raw ratio with a "%" glued on
                    would state a ceiling as a charge. */}
                <TallyRow
                  label="Expense ratio"
                  scope={scopeOf(facts.expenses)}
                  counts={facts.expenses}
                  render={(v) => <span className="tabular">{v}</span>}
                />
                <TallyRow
                  label="Exit load"
                  scope={scopeOf(facts.exitLoads)}
                  counts={facts.exitLoads}
                />
                <TallyRow
                  label="Redemption"
                  scope={scopeOf(facts.redemptions)}
                  counts={facts.redemptions}
                />
                <TallyRow
                  label="Benchmark"
                  scope={scopeOf(facts.benchmarks)}
                  counts={facts.benchmarks}
                />
              </dl>
            </Group>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

function BlockHeading({ label, note }: { label: string; note: string }) {
  return (
    <div className="max-w-[64ch] pb-2">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-3 text-[13px] leading-[20px] text-muted">{note}</p>
    </div>
  );
}

/**
 * One disclosure dimension.
 *
 * Every value carries `n of total`, and the label column repeats the
 * population `total` refers to — a row read on its own must not imply it
 * was counted over the whole page. Values are never collapsed either:
 * folding "Band 1, Band 2, Band 5" into "up to Band 5" is exactly the
 * flattening these pages exist to avoid.
 *
 * The absence is a value too. A field nobody filed in still happened to the
 * schemes that did not file it, so the shortfall renders as its own entry
 * instead of leaving the reader to notice that the counts come up short of
 * the total printed beside them. Anyone adding a column here should be able
 * to add the numbers in it and land on `population`.
 */
function TallyRow<T extends string | number>({
  label,
  scope,
  counts,
  absent = "Not captured",
  render,
}: {
  label: string;
  /** The population `counts.population` refers to, restated on the row. */
  scope: string;
  counts: Tally<T>;
  /** What the shortfall is called. "Not captured" everywhere but the feed. */
  absent?: string;
  render?: (value: T) => ReactNode;
}) {
  const { rows, population } = counts;
  const notCaptured = population - counts.captured;
  const show = (value: T) => (render ? render(value) : <>{value}</>);

  /* <GroupItem> IS the wrapper div, and dt/dd are its DIRECT children.
     A <dl> permits exactly one div around a dt/dd group; this row used to
     nest a second `display:contents` div inside it, which is two deep and
     therefore invalid — axe reported `definition-list` and `dlitem` SERIOUS
     on every category page, i.e. screen readers were not announcing this as
     a definition list at all. The inner div was buying nothing: it was
     `display:contents`, so dt/dd were already the grid items of the layout
     one level up. Dropping it changes no pixel and makes the markup legal.

     The grid and hairline classes must stay on <GroupItem> rather than move
     down to a wrapper of our own: a nested div is an only child, so
     `first:border-t` would match on EVERY row and draw a top rule against
     the previous row's `border-b`, doubling the hairline between each pair.
     GroupItem's divs are siblings inside the <dl>, so `first:` means the
     first row — one rule above the list, one below each row. */
  return (
    <GroupItem className="grid gap-2 border-b border-hairline py-5 first:border-t sm:grid-cols-[190px_1fr] sm:gap-6">
      <dt>
        <span className="block text-[13px] leading-[22px] text-muted">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-[18px] text-muted">
          {scope}
        </span>
      </dt>
      <dd className="text-[15px] leading-[22px] text-ink">
        {rows.length === 0 ? (
          <span className="text-muted">
            Not captured for any scheme on this page
          </span>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={String(r.value)}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
              >
                <span>{show(r.value)}</span>
                <span className="tabular shrink-0 text-[13px] text-muted">
                  {r.count} of {population}
                </span>
              </li>
            ))}
            {/* Muted, and last — an absence is not one of the values, but
                it is the difference between this list and its total. */}
            {notCaptured > 0 ? (
              <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-muted">
                <span>{absent}</span>
                <span className="tabular shrink-0 text-[13px]">
                  {notCaptured} of {population}
                </span>
              </li>
            ) : null}
          </ul>
        )}
      </dd>
    </GroupItem>
  );
}

/* ============================================================
   The schemes — one detail card each.

   Ordered captured-disclosures first, then the rest, and the
   intro says so. Sorting on a field 17 of 30 schemes do not have
   must never make those schemes quietly disappear.
   ============================================================ */

function Schemes({ list, facts }: { list: Strategy[]; facts: Facts }) {
  const ordered = [...list].sort(
    (a, b) => Number(b.disclosuresCaptured) - Number(a.disclosuresCaptured),
  );
  const missing = facts.count - facts.disclosed;

  return (
    <Section id="schemes">
      <Shell>
        <div className="max-w-[720px]">
          <Rise>
            <Eyebrow>The schemes</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            lines={["Every scheme,", "in full."]}
            className="mt-4 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
          />
          <Rise delay={0.1}>
            <p className="mt-6 text-[17px] leading-[30px] text-body">
              {missing === 0 ? (
                <>
                  Overview, NAV and the complete disclosure set for each fund.
                  Nothing is abbreviated and nothing is filled in where the asset
                  manager has not filed it.
                </>
              ) : (
                <>
                  The {facts.disclosed} schemes whose disclosures we hold are
                  listed first, in full. The remaining {missing} follow: real name,
                  ISIN, mandate and NAV from AMFI, and every disclosure row marked
                  &ldquo;Not captured&rdquo; rather than blank, defaulted or
                  guessed.
                </>
              )}
            </p>
          </Rise>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          {ordered.map((strategy) => (
            <Rise key={strategy.id}>
              <StrategyDetail strategy={strategy} />
            </Rise>
          ))}
        </div>

        <p className="mt-8 max-w-[64ch] text-[14px] leading-[20px] text-muted">
          {/* No cadence is claimed. Nothing in this pipeline guarantees a
              daily refresh, and "Updated daily" sat beside a file that was
              five days old — the dated statement is the one we can stand
              behind, so it is the only one made. */}
          NAV data fetched from AMFI. Last updated{" "}
          {formatUpdated(navLastUpdated)}, from{" "}
          <a
            href={navSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
          >
            AMFI&apos;s SIF NAV file
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          . Absolute NAVs are not comparable across schemes — units were issued
          at different face values. Percentage change is comparable, and is what
          the change figure beside each NAV states.
        </p>
      </Shell>
    </Section>
  );
}

function StrategyDetail({ strategy }: { strategy: Strategy }) {
  const amc = amcById.get(strategy.amcId);
  const nav = getNav(strategy.id);

  return (
    <article className="border border-hairline bg-surface">
      <div className="grid gap-10 p-8 sm:p-10 xl:grid-cols-[1fr_480px] xl:gap-16">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {/* Eyebrow styling but NOT the <Eyebrow> primitive, which
                  uppercases — that renders the "iSIF" sub-brand as "ISIF".
                  Brand casing wins over the label treatment. */}
              <span className="text-[12px] font-semibold leading-[14px] tracking-[0.08em] text-accent">
                {amc?.sifName ?? "—"}
              </span>
              <p className="mt-2 text-[13px] leading-[20px] text-muted">
                {amc?.name ?? "Asset manager not listed"}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-3 py-1 text-[12px] capitalize leading-[18px] text-body">
              {strategy.category}
            </span>
          </div>

          <h3 className="mt-8 text-[clamp(22px,2.2vw,28px)] font-medium leading-[1.24] text-ink">
            {strategy.name}
          </h3>
          <p className="mt-2 text-[13px] leading-[20px] text-muted">
            {strategy.type}
          </p>

          {strategy.overview ? (
            <p className="mt-6 max-w-[58ch] text-[17px] leading-[30px] text-body">
              {strategy.overview}
            </p>
          ) : null}

          {/* Said once at card level, so the eight rows opposite do not have
              to repeat the caveat eight times. */}
          {strategy.disclosuresCaptured ? null : (
            <p className="mt-6 max-w-[58ch] border-l border-hairline pl-5 text-[14px] leading-[22px] text-muted">
              Disclosures for this scheme are not yet captured — see the scheme
              information document. AMFI publishes its name, ISIN, mandate and
              NAV; everything else below is marked accordingly.
            </p>
          )}

          <Rule className="mt-8" />

          <div className="mt-8">
            {nav.status === "live" ? (
              <>
                <p className="text-[13px] leading-[20px] text-muted">
                  NAV as of {formatUpdated(nav.asOf)}
                </p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <span className="tabular text-[clamp(26px,2.8vw,34px)] leading-[1.1] text-ink">
                    {formatNav(nav.today)}
                  </span>
                  <Delta pct={nav.changePct} size="lg" />
                </div>
                <p className="mt-3 max-w-[48ch] text-[13px] leading-[20px] text-muted">
                  Change is measured against this scheme’s previous published
                  NAV, which is not always the day before — AMFI’s series omits
                  non-dealing days.
                </p>
              </>
            ) : (
              <p className="max-w-[48ch] text-[13px] leading-[20px] text-muted">
                No NAV for this scheme in the current AMFI file.
              </p>
            )}
          </div>
        </div>

        {/* Every field the AMC discloses, in one list. Risk band, exit load,
            expense ratio and minimum are the material four — they are never
            dropped for space, and never defaulted when absent. */}
        <dl className="xl:border-l xl:border-hairline xl:pl-16">
          <DetailRow label="Minimum investment">
            {strategy.minInvestment === null ? (
              <NotCaptured />
            ) : (
              <span className="tabular">{formatInr(strategy.minInvestment)}</span>
            )}
          </DetailRow>
          <DetailRow label="Expense ratio">
            {strategy.expenseRatio === null ? (
              <NotCaptured />
            ) : (
              <span className="tabular">
                {formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)}
              </span>
            )}
          </DetailRow>
          <DetailRow label="Exit load">
            {strategy.exitLoad ?? <NotCaptured />}
          </DetailRow>
          <DetailRow label="Risk band">
            <RiskBand band={riskBandNumber(strategy.riskBand)} />
          </DetailRow>
          <DetailRow label="Benchmark">
            {strategy.benchmark ?? <NotCaptured />}
          </DetailRow>
          <DetailRow label="Redemption">
            {strategy.redemptionFrequency ?? <NotCaptured />}
          </DetailRow>
          <DetailRow label="Taxation">
            {strategy.taxation ?? <NotCaptured />}
          </DetailRow>
          <DetailRow label="Dividend">
            {strategy.dividend ?? <NotCaptured />}
          </DetailRow>
          <DetailRow label="AMFI scheme code">
            <span className="tabular">{strategy.amfiSchemeCode}</span>
          </DetailRow>
          <DetailRow label="ISIN">
            {strategy.isin === null ? (
              <NotCaptured />
            ) : (
              <span className="tabular">{strategy.isin}</span>
            )}
          </DetailRow>
        </dl>
      </div>
    </article>
  );
}

/** An absent disclosure is a stated absence, never a blank or a default. */
function NotCaptured() {
  return <span className="text-muted">Not captured</span>;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-hairline py-4 first:border-t last:border-b-0 sm:grid-cols-[150px_1fr] sm:gap-6">
      <dt className="text-[13px] leading-[22px] text-muted">{label}</dt>
      <dd className="text-[15px] leading-[22px] text-ink">{children}</dd>
    </div>
  );
}

/* ============================================================
   Debt — genuinely empty. No cards, no "coming soon" grid.
   ============================================================ */

function EmptyCategory() {
  return (
    <Section id="empty">
      <Shell>
        <div className="grid gap-12 xl:grid-cols-[420px_1fr] xl:gap-16">
          <div>
            <Rise>
              <Eyebrow>Empty on purpose</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Nothing here,", "and that is the point."]}
              className="mt-6 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
            />
          </div>

          <div className="border border-hairline bg-surface p-8 sm:p-12">
            <Rise>
              <PendingBadge />
              <h3 className="mt-6 text-[22px] font-medium leading-[30px] text-ink">
                No debt SIF has launched yet.
              </h3>
              <p className="mt-4 max-w-[58ch] text-[17px] leading-[30px] text-body">
                SEBI&apos;s{" "}
                <a
                  href={SEBI_CIRCULAR}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                >
                  2025 framework for Specialised Investment Funds
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                permits a debt category alongside equity and hybrid. As of{" "}
                {formatUpdated(navLastUpdated)} no asset manager has filed a debt
                scheme, so there is nothing to list. We will add schemes here as
                they are filed with AMFI — not before.
              </p>
            </Rise>

            <Rule className="mt-10" delay={0.14} />

            {/* Stacked, not a two-up grid: a 50/50 split is off-limits, and
                two full-width rows read as a continuation of the hairlines. */}
            <Group className="mt-10 flex flex-col gap-3">
              <GroupItem>
                <CategoryTeaser id="equity" label="Equity" />
              </GroupItem>
              <GroupItem>
                <CategoryTeaser id="hybrid" label="Hybrid" />
              </GroupItem>
            </Group>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

function CategoryTeaser({ id, label }: { id: Category; label: string }) {
  const count = strategiesByCategory[id].length;
  return (
    <Link
      href={`/strategies/${id}`}
      /* Hover lifts the surface tint rather than recolouring the border —
         hairline is the only border colour. */
      className="group flex items-baseline justify-between gap-4 border border-hairline bg-surface-2 px-6 py-5 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface"
    >
      <span className="text-[15px] leading-[22px] text-ink">{label}</span>
      <span className="tabular flex items-center gap-2 text-[14px] leading-[20px] text-accent">
        {count}
        <Arrow />
      </span>
    </Link>
  );
}

/* ============================================================
   Risk disclosure — verbatim on every category page.
   ============================================================ */

const RISKS = [
  {
    title: "Market risk",
    body: "Equity markets can be volatile. Long-short strategies aim to reduce but cannot eliminate market risk entirely.",
  },
  {
    title: "Derivative risk",
    body: "Use of derivatives for hedging introduces counterparty risk and potential for amplified losses.",
  },
  {
    title: "Short selling risk",
    body: "Short positions have theoretically unlimited loss potential if the shorted stock rises significantly.",
  },
  {
    title: "Liquidity risk",
    body: "Some positions may be difficult to exit during market stress, affecting fund performance.",
  },
];

function RiskDisclosure({ empty }: { empty: boolean }) {
  return (
    <Section id="risks">
      <Shell>
        <div className="grid gap-12 xl:grid-cols-[420px_1fr] xl:gap-16">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>Risk disclosure</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["What these", "strategies risk."]}
              className="mt-6 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
            />
            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                {empty
                  ? "These apply to the SIF structure itself, and will apply to any debt scheme filed under it."
                  : "Long-short mandates carry exposures a plain equity or debt fund does not. These four apply to every scheme on this page — including the ones whose own disclosures we do not yet hold."}
              </p>
            </Rise>
          </div>

          <Group>
            {RISKS.map((risk, i) => (
              <GroupItem key={risk.title} className="relative pt-7 first:pt-0">
                <div>
                  {i > 0 ? (
                    <Rule className="absolute inset-x-0 top-0" delay={i * 0.06} />
                  ) : null}
                  <div className="pb-7">
                    <h3 className="text-[17px] font-medium leading-[24px] text-ink">
                      {risk.title}
                    </h3>
                    <p className="mt-2 max-w-[58ch] text-[17px] leading-[30px] text-body">
                      {risk.body}
                    </p>
                  </div>
                </div>
              </GroupItem>
            ))}

            <GroupItem>
              <p className="max-w-[58ch] text-[14px] leading-[20px] text-muted">
                Risk bands are indicative and may vary with market conditions and
                portfolio composition. Consult your financial adviser before
                investing.
              </p>
            </GroupItem>
          </Group>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Sibling categories
   ============================================================ */

const CATEGORY_LABEL: Record<Category, string> = {
  equity: "Equity",
  hybrid: "Hybrid",
  debt: "Debt",
};

function CategoryNav({ current }: { current: Category }) {
  const others = CATEGORIES.filter((c) => c !== current);

  return (
    <Section>
      <Shell>
        <Rule />
        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/strategies"
            className="group inline-flex items-center gap-2 text-[15px] leading-[22px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink"
          >
            <span aria-hidden="true" className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-1">
              ←
            </span>
            All {stats.strategyCount} schemes
          </Link>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {others.map((c) => (
              <Link
                key={c}
                href={`/strategies/${c}`}
                className="group inline-flex items-center gap-2 text-[15px] leading-[22px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink"
              >
                {CATEGORY_LABEL[c]}
                <span className="tabular text-[13px] text-muted">
                  {strategiesByCategory[c].length}
                </span>
                <Arrow />
              </Link>
            ))}
          </div>
        </div>
      </Shell>
    </Section>
  );
}

function Arrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
    >
      <path
        d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
