import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import {
  Eyebrow,
  PendingBadge,
  Section,
  Shell,
} from "@/components/primitives";
import { StrategyGrid } from "@/components/sections/StrategyGrid";
import {
  formatInr,
  formatUpdated,
  getNav,
  mandates,
  navLastUpdated,
  riskBandNumber,
  stats,
  strategies,
  strategiesByCategory,
  type Category,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Strategies",
  description:
    "Every Specialised Investment Fund scheme currently offered in India — thirty schemes across seventeen asset managers and five long-short mandates — with the disclosures each house has filed, and an honest gap where it has not.",
};

/* ============================================================
   Category summaries.

   Counted from @/lib/data, never asserted. Two tiers, and they
   have different denominators: name, mandate, category and NAV
   come from AMFI's feed and exist for every scheme, while the
   disclosure fields exist only for the schemes we have actually
   researched. Any tally that mixes the two is a lie by omission,
   so `disclosed` travels with every disclosure-derived figure.
   ============================================================ */

type Summary = {
  count: number;
  houses: number;
  live: number;
  /** How many of `count` carry a captured disclosure set. */
  disclosed: number;
  mandates: { type: string; count: number }[];
  /** Distinct bands, ascending — from the captured subset ONLY. */
  bands: number[];
};

function summarise(category: Category): Summary {
  const list = strategiesByCategory[category];
  const disclosed = list.filter((s) => s.disclosuresCaptured);

  const mandateCounts = new Map<string, number>();
  for (const s of list) mandateCounts.set(s.type, (mandateCounts.get(s.type) ?? 0) + 1);

  return {
    count: list.length,
    houses: new Set(list.map((s) => s.amcId)).size,
    live: list.filter((s) => getNav(s.id).status === "live").length,
    disclosed: disclosed.length,
    mandates: [...mandateCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    bands: [
      ...new Set(
        disclosed
          .map((s) => riskBandNumber(s.riskBand))
          .filter((b): b is number => b !== null),
      ),
    ].sort((a, b) => a - b),
  };
}

/** "Band 5" when they agree, "Bands 1, 2 and 5" when they do not. */
function bandLabel(bands: number[]): string {
  if (bands.length === 0) return "Not captured";
  if (bands.length === 1) return `Band ${bands[0]}`;
  const head = bands.slice(0, -1).join(", ");
  return `Bands ${head} and ${bands[bands.length - 1]}`;
}

const CATEGORY_CARDS: {
  id: Category;
  label: string;
  blurb: string;
}[] = [
  {
    id: "equity",
    label: "Equity",
    blurb:
      "Long positions paired with short positions in listed equity, run inside SEBI's SIF framework. The category label hides the split — the mandates inside it are not one instrument.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    blurb:
      "Equity and debt allocations combined with hedging. Among the schemes whose disclosures we hold, the risk bands and redemption windows genuinely differ house to house.",
  },
  {
    id: "debt",
    label: "Debt",
    blurb:
      "SEBI's framework permits a debt category. No asset manager has filed one, so there is nothing to show.",
  },
];

/* Every distinct mandate in the feed, commonest first, with the categories
   it sits under. `mandates` is already sorted — we only add the category
   tag, because category alone conceals two of the five. */
const MANDATE_ROWS = mandates.map((m) => ({
  ...m,
  categories: [
    ...new Set(strategies.filter((s) => s.type === m.type).map((s) => s.category)),
  ],
}));

/* ============================================================
   Risk disclosure — reproduced verbatim. This is material
   disclosure, not page furniture; the wording does not get edited
   for rhythm.
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

const STEPS = [
  {
    title: "Assess your profile and goals",
    body: (
      <>
        Start with horizon, liquidity needs and tolerance for drawdown.
        SEBI&apos;s framework sets a{" "}
        <span className="tabular">{formatInr(stats.minInvestment)}</span> floor for
        every SIF, which makes it a concentrated decision rather than a trial.
      </>
    ),
  },
  {
    title: "Compare schemes and disclosures",
    body: (
      <>
        Read the risk band, exit load, expense ratio, benchmark and redemption
        frequency side by side. We hold that full set for{" "}
        <span className="tabular">
          {stats.disclosedCount} of {stats.strategyCount}
        </span>{" "}
        schemes so far — the other{" "}
        <span className="tabular">
          {stats.strategyCount - stats.disclosedCount}
        </span>{" "}
        publish a NAV and nothing else. The{" "}
        <Link
          href="/sif-tracker"
          className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
        >
          SIF tracker
        </Link>{" "}
        puts all {stats.strategyCount} schemes in one table.
      </>
    ),
  },
  {
    title: "Consult us before committing",
    body: (
      <>
        SIF Insight is a distributor, not an investment adviser. We can walk you
        through what each scheme discloses and how the categories differ — the
        decision, and any advice on it, stays with you and your adviser.
      </>
    ),
  },
];

export default function StrategiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="The funds"
        /* Hand-split so the break is ours, but the numbers are the real
           stats.strategyCount / stats.amcCount — 30 and 17. */
        lines={["Thirty schemes.", "Seventeen houses."]}
        standfirst={
          <>
            Every SIF scheme currently offered in India — {stats.equityCount}{" "}
            equity, {stats.hybridCount} hybrid, no debt scheme yet — across{" "}
            {stats.mandateCount} distinct long-short mandates.{" "}
            {stats.disclosedCount === stats.strategyCount ? (
              <>
                We hold the full disclosure set for every one of them, read from
                each scheme’s own information document.
              </>
            ) : (
              <>
                We hold the full disclosure set for {stats.disclosedCount} of
                them; the rest publish a NAV and nothing more, and are marked as
                such.
              </>
            )}
          </>
        }
        meta={[
          /* The headline is hand-split literal text; these are the same two
             figures read straight off `stats`, so the page still self-checks. */
          <>
            <span className="tabular">{stats.strategyCount}</span> schemes from{" "}
            <span className="tabular">{stats.amcCount}</span> houses
          </>,
          <>
            <span className="tabular">{stats.mandateCount}</span> mandates
          </>,
          <>
            <span className="tabular">
              {stats.disclosedCount} of {stats.strategyCount}
            </span>{" "}
            with disclosures captured
          </>,
          <>
            <span className="tabular">
              {stats.liveNavCount} of {stats.strategyCount}
            </span>{" "}
            with a live NAV
          </>,
          <>Updated {formatUpdated(navLastUpdated)}</>,
        ]}
        aside={
          <div className="border border-hairline bg-surface p-8">
            <p className="text-[13px] leading-[20px] text-muted">
              Regulatory minimum, every SIF
            </p>
            <Odometer
              value={stats.minInvestment}
              prefix="₹"
              className="mt-3 block text-[clamp(30px,3.2vw,40px)] font-medium leading-[1.1] text-ink"
            />
            <p className="mt-4 text-[13px] leading-[20px] text-muted">
              Set by SEBI&apos;s SIF framework, not by us — a floor on the
              category, not a per-scheme disclosure.
            </p>
          </div>
        }
      />

      <CategoryCards />
      <Mandates />

      {/* Filter pills, tilt cards and the disclosure rows already live here.
          Rebuilding it would fork the disclosure logic. */}
      {/* embedded: the PageHeader above already says "Thirty schemes.
          Seventeen houses.", and this page carries its own risk-disclosure
          block. */}
      <StrategyGrid embedded />

      <HowToInvest />
      <RiskDisclosure />
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
   Three categories — two launched, one genuinely empty.
   ============================================================ */

function CategoryCards() {
  return (
    <Section id="categories">
      <Shell>
        <div className="max-w-[720px]">
          <Rise>
            <Eyebrow>By category</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            lines={["Three categories.", "Two have launched."]}
            className="mt-4 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
          />
          <Rise delay={0.1}>
            <p className="mt-6 text-[17px] leading-[30px] text-body">
              SEBI&apos;s framework opens equity, hybrid and debt to Specialised
              Investment Funds. Two categories carry filed schemes today; the
              third is empty, and we show it empty.
            </p>
          </Rise>
        </div>

        <Group className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <GroupItem key={card.id} className="h-full">
              <CategoryCard card={card} />
            </GroupItem>
          ))}
        </Group>
      </Shell>
    </Section>
  );
}

function CategoryCard({ card }: { card: (typeof CATEGORY_CARDS)[number] }) {
  const s = summarise(card.id);
  const launched = s.count > 0;

  return (
    /* The whole card is the link and carries no aria-label: an aria-label on
       a link replaces its accessible name, which would hide the disclosure
       list from screen readers. A long name is the lesser cost. */
    <Link href={`/strategies/${card.id}`} className="group block h-full">
      <TiltCard className="flex h-full min-h-[340px] flex-col justify-between p-8">
        <div>
          <div className="flex items-start justify-between gap-4">
            <Eyebrow>{card.label}</Eyebrow>
            {launched ? null : <PendingBadge />}
          </div>

          <Odometer
            value={s.count}
            className="mt-8 block text-[clamp(46px,5vw,68px)] font-medium leading-[1.06] text-ink"
          />
          <p className="mt-1 text-[13px] leading-[20px] text-muted">
            {launched
              ? `scheme${s.count === 1 ? "" : "s"} from ${s.houses} ${s.houses === 1 ? "house" : "houses"}`
              : "Launching soon"}
          </p>

          <p className="mt-6 text-[15px] leading-[24px] text-body">
            {card.blurb}
          </p>
        </div>

        {launched ? (
          /* Every figure here states the population it was counted over.
             Risk band exists only on the researched schemes, so its row
             carries that denominator rather than borrowing the card's. */
          <dl className="mt-10 border-t border-hairline">
            <Fact label="Mandates">
              <span className="tabular">{s.mandates.length}</span>
            </Fact>
            <Fact
              label="Risk band"
              note={`from ${s.disclosed} of ${s.count} captured`}
            >
              {bandLabel(s.bands)}
            </Fact>
            <Fact label="Live NAV">
              <span className="tabular">
                {s.live} of {s.count}
              </span>
            </Fact>
          </dl>
        ) : (
          <p className="mt-10 border-t border-hairline pt-5 text-[13px] leading-[20px] text-muted">
            No debt SIF has launched yet.
          </p>
        )}

        <span className="mt-8 inline-flex items-center gap-2 text-[14px] leading-[20px] text-accent">
          {launched ? "See the schemes" : "Read why it is empty"}
          <Arrow />
        </span>
      </TiltCard>
    </Link>
  );
}

function Fact({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] leading-[20px] text-ink">
        {children}
        {note ? (
          <span className="mt-0.5 block text-[12px] leading-[18px] text-muted">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
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

/* ============================================================
   By mandate — the split the two-category view hides.

   AMFI names a specific mandate on every scheme, and there are
   five. Two of them are single-scheme mandates filed inside a
   category that says nothing about them, so the category tabs
   alone under-describe the market.

   The bar is a share of a COUNT, which is a legitimate shared
   scale. NAVs are not, and are nowhere near this section.
   ============================================================ */

function Mandates() {
  return (
    <Section id="mandates">
      <Shell>
        <div className="grid gap-12 xl:grid-cols-[460px_1fr] xl:gap-[120px]">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>By mandate</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Five mandates,", "two categories."]}
              className="mt-6 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
            />
            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                Category tells you equity or hybrid. The mandate AMFI files
                against each scheme is finer than that, and it is where the
                market actually differs — a sector-rotation book and an
                ex-top-100 book are both &ldquo;equity&rdquo; and are not the
                same instrument.
              </p>
            </Rise>
            <Rise delay={0.16}>
              <p className="mt-5 text-[14px] leading-[20px] text-muted">
                Counted across all{" "}
                <span className="tabular">{stats.strategyCount}</span> schemes.
                The mandate comes from AMFI&apos;s feed, so unlike the disclosure
                rows it is present for every one of them.
              </p>
            </Rise>
          </div>

          {/* Row classes go on <GroupItem>, which is the actual sibling.
              GroupItem always renders its own wrapper, so anything nested
              inside is an only child and `first:` matches on EVERY row —
              border-t + border-b gave a doubled 2px rule between every pair,
              on a page drawn entirely in single hairlines. */}
          <Group>
            {MANDATE_ROWS.map((m) => (
              <GroupItem
                key={m.type}
                className="border-b border-hairline py-6 first:border-t"
              >
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h3 className="text-[17px] font-medium leading-[24px] text-ink">
                      {m.type}
                    </h3>
                    <p className="tabular shrink-0 text-[14px] leading-[20px] text-muted">
                      {m.count} of {stats.strategyCount}
                    </p>
                  </div>
                  <p className="mt-1 text-[13px] capitalize leading-[20px] text-muted">
                    {m.categories.join(" · ")}
                  </p>
                  {/* Share of scheme count. Static width — animating width
                      relayouts every frame and is banned. */}
                  <div className="mt-4 h-px w-full bg-hairline" aria-hidden="true">
                    <div
                      className="h-px bg-accent"
                      style={{
                        width: `${(m.count / stats.strategyCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </GroupItem>
            ))}
          </Group>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Process — three steps, hairline separated.
   ============================================================ */

function HowToInvest() {
  return (
    <Section id="how-to-invest">
      <Shell>
        <div className="grid gap-12 xl:grid-cols-[420px_1fr] xl:gap-16">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>Process</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["How to", "invest."]}
              className="mt-6 text-[clamp(32px,3.8vw,48px)] font-medium leading-[1.14] text-ink"
            />
            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                Three steps, in order. None of them is a recommendation — this is
                how to read the schemes, not which one to buy.
              </p>
            </Rise>
          </div>

          {/* On <GroupItem>, not a nested div: nested, it is an only child, so
              `first:pt-0` applied to every step and the absolute Rule landed
              on the content-box top edge instead of dividing the rows.
              GroupItem's wrapper also supplies the containing block for that
              absolute rule. */}
          <Group>
            {STEPS.map((step, i) => (
              <GroupItem key={step.title} className="relative pt-8 first:pt-0">
                <div>
                  {i > 0 ? (
                    <Rule className="absolute inset-x-0 top-0" delay={i * 0.06} />
                  ) : null}
                  <div className="grid gap-4 pb-8 sm:grid-cols-[72px_1fr] sm:gap-8">
                    <p className="tabular text-[14px] leading-[24px] text-accent">
                      0{i + 1}
                    </p>
                    <div>
                      <h3 className="text-[22px] font-medium leading-[30px] text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-[52ch] text-[17px] leading-[30px] text-body">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              </GroupItem>
            ))}
          </Group>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Risk disclosure
   ============================================================ */

function RiskDisclosure() {
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
                Long-short mandates carry exposures a plain equity fund does not.
                These four apply across every scheme listed above.
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
