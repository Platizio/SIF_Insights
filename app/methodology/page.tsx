import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import {
  A,
  LEGAL_UPDATED,
  LegalDocument,
  P,
  Terms,
  UL,
  type LegalClause,
} from "@/components/legal/LegalDocument";
import { PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { RETURN_RULES, industryAum, navLastUpdated, navSourceUrl, stats } from "@/lib/data";
import { ABSENT_LABEL, formatUpdated } from "@/lib/format";
import { FIELDS, LIQUIDITY_LABEL, type Field, type FieldGroup } from "@/lib/screener/fields";
import { SITE } from "@/lib/site";

/**
 * /methodology — how every figure on the site is sourced and computed.
 *
 * The metric registry (lib/screener/fields.ts) links each field to an anchor
 * here; every one of those anchors exists below, either as a clause id or as
 * an alias on the clause that covers it. The rules quoted are read from
 * RETURN_RULES, so the page cannot drift from the code that applies them,
 * and "Metrics not yet calculated" is the registry's own `planned` list.
 */

const DESCRIPTION =
  "How SIF Insight sources NAV, AUM and expense data and calculates returns, volatility, drawdown and the other figures shown across the site.";

export const metadata: Metadata = {
  title: "Methodology",
  description: DESCRIPTION,
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology — SIF Insight",
    description: DESCRIPTION,
    url: "/methodology",
    images: "/opengraph-image",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

/* Heatmap band edges. These mirror the private bounds `heatGrade` applies in
   lib/format.ts (spec §9); F1 has been asked to export them so this page can
   read them rather than restate them. */
const HEAT_SHORT = ["0.25", "1", "2.5"] as const;
const HEAT_LONG = ["1", "3", "7"] as const;

/* Why each group of planned metrics is not yet calculated. */
const PLANNED_REASON: Partial<Record<FieldGroup, string>> = {
  risk: "Needs a benchmark index series and a risk-free rate held alongside each scheme, and enough history to be meaningful.",
  benchmark: "Needs the benchmark index’s own daily series, which we do not yet hold.",
  size: "Needs at least two month-end AUM figures per scheme from AMC disclosures.",
  portfolio: "Needs monthly portfolio disclosures from each AMC, which are not yet captured.",
};

const PLANNED: Field[] = FIELDS.filter((f) => f.status === "planned");

const aum = industryAum();

const CLAUSES: LegalClause[] = [
  {
    id: "sources",
    heading: "Data sources",
    body: (
      <>
        <Terms
          rows={[
            {
              term: "NAV",
              detail: (
                <>
                  The daily NAV file published by AMFI (<A href={navSourceUrl}>source</A>).
                </>
              ),
            },
            {
              term: "Scheme terms",
              detail:
                "Each AMC’s Investment Strategy Information Document (ISID), Scheme Information Document and Key Information Memorandum — risk band, benchmark, exit load, liquidity, minimum investment, maximum expense ratio.",
            },
            { term: "AUM", detail: "Month-end AUM from AMC factsheets and monthly disclosures." },
            { term: "Expense ratio", detail: "The TER disclosures AMCs publish for each plan." },
            {
              term: "Calculations",
              detail: "Returns, volatility, drawdown and scheme age are calculated by SIF Insight from the AMFI NAV series, as set out below.",
            },
          ]}
        />
        <P>
          A researched value is used only once it has been checked against the
          document it came from; each carries the document and the place in it.
          Of the <span className="tabular">{stats.strategyCount}</span> schemes
          we track, <span className="tabular">{stats.fullyDisclosedCount}</span>{" "}
          have every headline disclosure captured.
        </P>
      </>
    ),
  },
  {
    id: "as-of",
    heading: "As-of dates",
    body: (
      <P>
        Every figure is shown with the date it is correct as of. The latest NAV
        file we hold is dated{" "}
        <time dateTime={navLastUpdated} className="tabular">
          {formatUpdated(navLastUpdated)}
        </time>
        , and that date — not the day you are reading — is the reference date
        for every return, age and window on the site. AUM and expense ratios
        carry their own, usually earlier, dates. We show the latest NAV, not a
        live price.
      </P>
    ),
  },
  {
    id: "face-value",
    heading: "NAV and face value",
    body: (
      <>
        <P>
          SIF units are issued at different face values — some at ₹10, others
          at ₹1,000. A scheme’s NAV therefore says nothing about whether it has
          done better or worse than another, and we never rank, chart or
          compare NAVs across schemes. Percentage change is the only basis on
          which schemes are compared.
        </P>
        <P>
          Where the face value is stated in a scheme document we use it. Where
          it is not, we infer it from the first published NAV — ₹1,000 if that
          NAV is above ₹200, otherwise ₹10 — and label it as inferred.
        </P>
      </>
    ),
  },
  {
    id: "returns",
    heading: "Trailing returns",
    aliases: ["one-day-change"],
    body: (
      <>
        <UL>
          <li>
            <strong className="font-medium text-ink">1D</strong> is the change
            from the previous published NAV, whatever its date.
          </li>
          <li>
            <strong className="font-medium text-ink">1W</strong> looks back 7
            calendar days.
          </li>
          <li>
            <strong className="font-medium text-ink">1M, 3M, 6M, 1Y, 2Y</strong>{" "}
            look back by calendar months or years from the reference date.
          </li>
          <li>
            The start value is the last NAV published on or before the target
            date. If the series starts after the target date, or the nearest
            earlier NAV is more than{" "}
            <span className="tabular">{RETURN_RULES.maxStartGapDays}</span> days
            before it, the return is shown as “{ABSENT_LABEL["insufficient-history"]}”.
          </li>
          <li>
            Periods shorter than{" "}
            <span className="tabular">{RETURN_RULES.annualiseFromDays}</span>{" "}
            days are absolute returns; periods of a year or more are annualised
            (CAGR).
          </li>
          <li>
            <strong className="font-medium text-ink">Since inception</strong>{" "}
            starts from the face value on the allotment date where both are
            taken from a scheme document, and otherwise from the first
            published NAV. The label says which.
          </li>
        </UL>
        <P>{PAST_PERFORMANCE_NOTE}</P>
      </>
    ),
  },
  {
    id: "monthly-returns",
    heading: "Monthly returns",
    body: (
      <P>
        A month’s return runs from the last NAV of the previous month to the
        last NAV of the month. Only completed months are shown; the current,
        partial month is not.
      </P>
    ),
  },
  {
    id: "inception",
    heading: "Inception and scheme age",
    body: (
      <P>
        Inception is the allotment date stated in the scheme document. Where
        that has not been captured we use the date of the first published NAV
        and label it so. Age is measured from inception to the reference date.
      </P>
    ),
  },
  {
    id: "volatility",
    heading: "Volatility",
    body: (
      <P>
        The sample standard deviation of daily NAV returns, annualised by
        multiplying by the square root of{" "}
        <span className="tabular">{RETURN_RULES.tradingDaysPerYear}</span>. It
        is calculated only once a scheme has at least{" "}
        <span className="tabular">{RETURN_RULES.minObsForRisk}</span> daily
        returns; before that it is shown as “{ABSENT_LABEL["insufficient-history"]}”.
      </P>
    ),
  },
  {
    id: "max-drawdown",
    heading: "Maximum drawdown",
    aliases: ["drawdown"],
    body: (
      <P>
        The largest fall in NAV from a previous peak to a subsequent trough over
        the scheme’s published history, as a percentage of the peak. The same
        minimum of <span className="tabular">{RETURN_RULES.minObsForRisk}</span>{" "}
        observations applies.
      </P>
    ),
  },
  {
    id: "risk-band",
    heading: "Risk band",
    body: (
      <P>
        The risk band (1 to 5) is the one the AMC assigns under the SEBI
        framework, taken from the scheme’s latest document we hold. It is not a
        SIF Insight rating. See{" "}
        <A href="/regulatory-disclosures#risk-bands">Regulatory Disclosures</A>.
      </P>
    ),
  },
  {
    id: "benchmarks",
    heading: "Benchmarks",
    body: (
      <P>
        The benchmark is the index the scheme document names. Where AMCs word
        the same index differently we group them under one name for filtering,
        and keep the document’s own wording on the scheme page.
      </P>
    ),
  },
  {
    id: "aum",
    heading: "Assets under management",
    body: (
      <>
        <P>
          AUM is the scheme-level month-end figure in ₹ crore, as the AMC
          discloses it. AMC and industry totals add up the schemes reporting for
          the same month — the month with the most schemes reporting — and
          state how many schemes they cover, so a partial total is never shown
          as a complete one.
        </P>
        <P>
          {aum ? (
            <>
              Current coverage: <span className="tabular">{aum.counted}</span> of{" "}
              <span className="tabular">{aum.total}</span> schemes, as of{" "}
              <span className="tabular">{formatUpdated(aum.asOf)}</span>.
            </>
          ) : (
            <>No verified AUM figures are held yet, so AUM is shown as “{ABSENT_LABEL["not-captured"]}”.</>
          )}
        </P>
      </>
    ),
  },
  {
    id: "ter",
    heading: "Expense ratio (TER)",
    body: (
      <P>
        Where the AMC’s TER disclosure has been captured, we show the charged
        total expense ratio of the Regular plan with its date. Otherwise we
        show the maximum the scheme document permits, written “Up to x%”. The
        two are different figures: the charged TER is usually below the
        maximum.
      </P>
    ),
  },
  {
    id: "exit-load",
    heading: "Exit load",
    body: (
      <P>
        Exit load is read from the scheme document. Where the load steps down
        over time, the headline percentage is the highest rate charged and the
        period is the latest point at which any load still applies; the
        document’s full wording is shown on the scheme page.
      </P>
    ),
  },
  {
    id: "liquidity",
    heading: "Liquidity and redemption",
    body: (
      <>
        <P>
          To make schemes filterable, the redemption frequency in each scheme
          document is grouped into one of these buckets:{" "}
          {Object.values(LIQUIDITY_LABEL).join(", ")}. The bucket is a summary;
          notice periods, cut-offs and settlement times are in the document’s
          exact wording, which is shown on the scheme page and prevails.
        </P>
      </>
    ),
  },
  {
    id: "heatmap",
    heading: "Heatmap grades",
    body: (
      <>
        <P>
          Return heatmaps shade each cell by the size of the move, in four
          grades each side of zero. Every cell also prints its signed figure —
          colour never carries gain or loss on its own.
        </P>
        <Terms
          rows={[
            {
              term: "1D and 1W",
              detail: (
                <span className="tabular">
                  below {HEAT_SHORT[0]}% · {HEAT_SHORT[0]}–{HEAT_SHORT[1]}% · {HEAT_SHORT[1]}–{HEAT_SHORT[2]}% · above {HEAT_SHORT[2]}%
                </span>
              ),
            },
            {
              term: "1M and longer",
              detail: (
                <span className="tabular">
                  below {HEAT_LONG[0]}% · {HEAT_LONG[0]}–{HEAT_LONG[1]}% · {HEAT_LONG[1]}–{HEAT_LONG[2]}% · above {HEAT_LONG[2]}%
                </span>
              ),
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "missing-values",
    heading: "When a value is missing",
    body: (
      <Terms
        rows={[
          {
            term: ABSENT_LABEL["insufficient-history"],
            detail: "The scheme has not existed long enough, or its NAV series has a gap, for the figure to be calculated honestly.",
          },
          {
            term: ABSENT_LABEL["not-captured"],
            detail: "The value exists in principle but we have not yet taken it from an official document.",
          },
          {
            term: ABSENT_LABEL["not-applicable"],
            detail: "The field does not apply to this scheme.",
          },
        ]}
      />
    ),
  },
  {
    id: "not-yet-calculated",
    heading: "Metrics not yet calculated",
    aliases: ["planned"],
    body: (
      <>
        <P>
          These metrics are planned. Until the data behind them is held, they
          do not appear as columns, filters or sort options anywhere on the
          site.
        </P>
        <Terms
          rows={PLANNED.map((f) => ({
            term: f.label,
            detail: PLANNED_REASON[f.group] ?? "The data it depends on is not yet captured.",
          }))}
        />
      </>
    ),
  },
];

export default function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        lines={["How the numbers", "are made."]}
        standfirst={DESCRIPTION}
        meta={[
          <>
            Latest NAV file{" "}
            <time dateTime={navLastUpdated} className="tabular">
              {formatUpdated(navLastUpdated)}
            </time>
          </>,
          <>
            <span className="tabular">{stats.strategyCount}</span> schemes
          </>,
        ]}
      />
      <LegalDocument clauses={CLAUSES} updated={LEGAL_UPDATED} />
    </>
  );
}
