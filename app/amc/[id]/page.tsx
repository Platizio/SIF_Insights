import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { ConsultCta } from "@/components/ConsultCta";
import { AmcMark } from "@/components/AmcMark";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  Delta,
  Eyebrow,
  RiskBand,
  Section,
  Shell,
} from "@/components/primitives";
import { cn } from "@/lib/cn";
import {
  amcById,
  amcs,
  formatExpense,
  formatInr,
  formatUpdated,
  getNav,
  navLastUpdated,
  riskBandNumber,
  strategies,
  type Amc,
  type Strategy,
} from "@/lib/data";

/* ============================================================
   One page per asset manager. Everything below is counted from
   the strategy list — scheme counts, categories covered, the risk
   band range, the expense range and how many disclosure sets we
   actually hold. Nothing is asserted, and no gap is papered over.

   AMFI's feed carries scheme code, ISIN, name, category and NAV.
   It carries no minimum, expense, exit load or risk band, so those
   exist only for schemes whose information document we have read.
   Every house currently has all of its schemes read, so the
   undisclosed path below is unexercised against today's data. It is
   written to READ CORRECTLY for a house with none captured, not
   merely to tolerate one, because that is the state every house is
   in from the day AMFI lists it until someone opens its ISID — it
   recurs with each new filing rather than being a backlog we are
   working off. `disclosedCount` is counted here for the same reason
   it is not assumed.
   ============================================================ */

function schemesOf(amcId: string): Strategy[] {
  return strategies.filter((s) => s.amcId === amcId);
}

function liveCount(schemes: Strategy[]): number {
  return schemes.filter((s) => getNav(s.id).status === "live").length;
}

function disclosedCount(schemes: Strategy[]): number {
  return schemes.filter((s) => s.disclosuresCaptured).length;
}

/** Every house in the data prerenders — 17 today, derived not hard-coded.
    An id outside this set falls through to notFound() and 404s. */
export function generateStaticParams() {
  return amcs.map((amc) => ({ id: amc.id }));
}

/** Google truncates a SERP snippet at roughly 155–160 characters. */
const META_MAX = 160;

/**
 * Meta description for one house.
 *
 * Two defects lived in the template this replaces. It read
 * `${amc.description}. ${n} scheme…`, and nine of the seventeen stored
 * `description` values already ended in a full stop, so nine pages
 * shipped "…under the Apex SIF brand.. 1 scheme tracked". And the
 * appended clause ran to 84 characters — "N schemes tracked, N with a
 * NAV filed with AMFI, and the disclosure set for N of them" — byte
 * identical on the ten single-scheme houses, and enough to push nine
 * descriptions past 160.
 *
 * `lib/data` now derives the house sentence rather than storing it, and
 * ends none of them with a stop. The normalisation below stays anyway:
 * it makes the trailing stop a detail of the data rather than something
 * this file is coupled to, and it is the difference between a period
 * appearing in schemes.json again and nine pages shipping "..".
 *
 * The derived sentence runs 127–144 characters and already names the
 * house, its SIF brand and the mandate categories it runs, so there is
 * usually no room left for the counted clause — and no need for it,
 * since the page renders those counts in the header meta row beside it.
 * Each tier below is tried in descending order of value and the first
 * one inside the budget wins, so no house can silently overrun.
 */
function describe(amc: Amc, own: Strategy[]): string {
  const lead = amc.description.replace(/\s*\.\s*$/, "");

  const n = own.length;
  const live = liveCount(own);
  const disclosed = disclosedCount(own);
  const noun = `${n} scheme${n === 1 ? "" : "s"}`;
  const counted =
    live === n && disclosed === n
      ? `${noun}, ${n === 1 ? "NAV" : "NAVs"} and disclosures on file.`
      : `${noun}: ${live} priced, ${disclosed} disclosed.`;

  const withCount = `${lead}. ${counted}`;
  if (withCount.length <= META_MAX) return withCount;

  const plain = `${lead}.`;
  if (plain.length <= META_MAX) return plain;

  /* A house sentence longer than the whole budget. Name the house and
     the holding; the sentence itself is on the page either way. */
  return `${amc.name}'s ${amc.sifName}. ${counted}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const amc = amcById.get(id);
  if (!amc) return { title: "Asset manager not found" };

  const description = describe(amc, schemesOf(amc.id));
  const path = `/amc/${amc.id}`;

  /* Built inside generateMetadata so the share card stays derived from the
     same row the page renders. `openGraph` repeats siteName/locale/type
     because Next merges metadata shallowly: declaring the key replaces the
     root layout's block rather than merging into it. */
  return {
    title: `${amc.sifName} — ${amc.name}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${amc.sifName} — ${amc.name}`,
      description,
      url: path,
      /* Declaring `openGraph` also drops the image the root app/opengraph-image.png
         file convention contributes, which silently downgrades the card to
         twitter:card=summary. Restated, not inherited. */
      images: "/opengraph-image.png",
      siteName: "SIF Insight",
      locale: "en_IN",
      type: "website",
    },
  };
}

/** Matches `metadataBase` in app/layout.tsx. JSON-LD needs absolute URLs. */
const ORIGIN = "https://sifinsight.com";

/**
 * BreadcrumbList — Home → Asset managers → this house.
 *
 * The hierarchy is real in both the URL and the page: /amc/:id sits under
 * /amc, and the page carries an "All asset managers" link back to it. The
 * payoff is that Google replaces the raw URL under the SERP title with the
 * trail, which is worth something across seventeen near-identical /amc/*
 * results. The last item carries no `item` URL, per Google's guidance that
 * the current page is the end of the trail.
 */
function breadcrumbLd(amc: Amc) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Asset managers",
        item: `${ORIGIN}/amc`,
      },
      { "@type": "ListItem", position: 3, name: amc.sifName },
    ],
  };
}

export default async function AmcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const amc = amcById.get(id);
  if (!amc) notFound();

  const own = schemesOf(amc.id);
  const live = liveCount(own);
  const disclosed = disclosedCount(own);
  const allDisclosed = disclosed === own.length;
  const categories = [...new Set(own.map((s) => s.category))];

  /* Risk band and expense only exist on disclosed schemes, so both ranges
     are drawn from a subset and can legitimately be EMPTY. An empty range
     renders as "Not captured", never as a blank cell or a lone dash that
     could be mistaken for a value.

     A house can also hold the document and still leave one field out of it,
     so each range is counted over the schemes that state ITS field — not
     over `disclosed`, which only knows that a document exists. */
  const bands = [
    ...new Set(
      own
        .map((s) => riskBandNumber(s.riskBand))
        .filter((b): b is number => b !== null),
    ),
  ].sort((a, b) => a - b);

  /* The cap flag travels with the ratio. Dropping it here is what let the
     strip print "2.25%" as a charged fee twenty lines above the scheme row's
     "Up to 2.25%" for the same number. */
  const expenses = own.flatMap((s) =>
    s.expenseRatio === null
      ? []
      : [{ ratio: s.expenseRatio, isCap: s.expenseRatioIsCap }],
  );

  const withBand = own.filter((s) => s.riskBand !== null).length;

  const index = amcs.findIndex((a) => a.id === amc.id);
  const prev = index > 0 ? amcs[index - 1] : null;
  const next = index < amcs.length - 1 ? amcs[index + 1] : null;

  const heading = allDisclosed
    ? own.length === 1
      ? "One scheme, in full."
      : `${own.length} schemes, in full.`
    : own.length === 1
      ? "One scheme."
      : `${own.length} schemes.`;

  return (
    <>
      {/* dangerouslySetInnerHTML, not a `{JSON.stringify(...)}` child:
          React HTML-escapes text children and an escaped quote is a JSON
          parse error. `<` is re-escaped so no house name can ever close
          the script element. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd(amc)).replace(/</g, "\\u003c"),
        }}
      />

      <PageHeader
        eyebrow={amc.name}
        lines={[amc.sifName]}
        standfirst={amc.description}
        meta={[
          <Fragment key="schemes">
            <span className="tabular">{own.length}</span>{" "}
            {own.length === 1 ? "scheme" : "schemes"}
          </Fragment>,
          <Fragment key="nav">
            <span className="tabular">{live}</span> of{" "}
            <span className="tabular">{own.length}</span> with a NAV
          </Fragment>,
          <Fragment key="disclosed">
            <span className="tabular">{disclosed}</span> of{" "}
            <span className="tabular">{own.length}</span> with disclosures
          </Fragment>,
          <Fragment key="updated">
            NAV updated {formatUpdated(navLastUpdated)}
          </Fragment>,
        ]}
        aside={
          <div>
            <AmcMark amc={amc} size="lg" />
            <p className="mt-3 max-w-[280px] text-[13px] leading-[20px] text-muted">
              {amc.logo === null
                ? "We hold no mark for this house, so its SIF name is set as type rather than borrowed. We cover this asset manager as a distributor; we do not represent it."
                : "Logo shown for identification only. We cover this asset manager as a distributor; we do not represent it."}
            </p>
          </div>
        }
      />

      {/* ---- Summary strip. Every cell counted from the schemes below. ---- */}
      <Section id="coverage" className="pt-0">
        <Shell>
          <Rise>
            {/* gap-px over a hairline ground: the dividers stay exact at every
                wrap point, which a per-cell border cannot do. */}
            <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCell label="Schemes tracked">
                <Odometer value={own.length} className={FIGURE} />
              </SummaryCell>

              <SummaryCell label="Categories">
                <span className={cn(FIGURE, "capitalize")}>
                  {categories.join(" · ")}
                </span>
              </SummaryCell>

              <SummaryCell label="Risk bands">
                {bands.length === 0 ? (
                  <span className={FIGURE_ABSENT}>Not captured</span>
                ) : (
                  <span className={FIGURE}>
                    Band{" "}
                    <span className="tabular">
                      {bands.length > 1
                        ? `${bands[0]}–${bands[bands.length - 1]}`
                        : bands[0]}
                    </span>
                  </span>
                )}
              </SummaryCell>

              <SummaryCell label="Expense ratio">
                {expenses.length === 0 ? (
                  <span className={FIGURE_ABSENT}>Not captured</span>
                ) : (
                  <span className={cn(FIGURE, "tabular")}>
                    {formatExpenseRange(expenses)}
                  </span>
                )}
              </SummaryCell>
            </div>
          </Rise>

          <Rise delay={0.12}>
            <p className="mt-5 max-w-[86ch] text-[13px] leading-[20px] text-muted">
              Counted from the {own.length === 1 ? "scheme" : "schemes"} below.
              NAV data fetched from AMFI; file dated{" "}
              {formatUpdated(navLastUpdated)}.{" "}
              {/* Counted per FIELD, not per document. "2 of 2 captured" over a
                  Risk bands cell built from one scheme is the same omission
                  the rest of this page exists to avoid. */}
              {disclosed === 0
                ? "We hold no scheme information document for this house yet, so risk band and expense are shown as not captured rather than estimated."
                : `Risk band is captured for ${withBand} of ${own.length}; expense ratio for ${expenses.length} of ${own.length}. The cells above count only those.`}
              {expenses.some((e) => e.isCap) ? (
                <>
                  {" "}
                  An expense figure is the maximum ratio the information
                  document permits, not the ratio being charged — that is
                  published on the asset manager&apos;s own site and moves.
                </>
              ) : null}
            </p>
          </Rise>
        </Shell>
      </Section>

      {/* ---- The schemes, each with what we actually hold. ---- */}
      <Section id="schemes">
        <Shell>
          <Rise>
            <Eyebrow>The schemes</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            className="mt-4 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.2] text-ink"
            lines={[heading]}
          />

          <Rise delay={0.12}>
            <p className="mt-5 max-w-[62ch] text-[15px] leading-[26px] text-body">
              {allDisclosed
                ? "Every field below comes from the scheme information document."
                : `Disclosures are captured for ${disclosed} of ${own.length}. The rest carry the name, scheme code, ISIN, category, mandate and NAV that AMFI publishes — every field beyond that is marked not captured, never guessed.`}
            </p>
          </Rise>

          <Group className="mt-12 flex flex-col gap-4">
            {own.map((strategy) => (
              <GroupItem key={strategy.id}>
                <SchemeCard strategy={strategy} />
              </GroupItem>
            ))}
          </Group>

          <Rise>
            <p className="mt-8 max-w-[720px] text-[13px] leading-[20px] text-muted">
              Risk bands are indicative and may vary with market conditions and
              portfolio composition. Consult your financial adviser before
              investing.
            </p>
          </Rise>
        </Shell>
      </Section>

      {/* ---- Prev / next house. ---- */}
      <Section className="pt-0">
        <Shell>
          <Rule />
          <nav
            aria-label="Asset managers"
            className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
          >
            {prev ? (
              <Pager amc={prev} direction="prev" />
            ) : (
              <span aria-hidden="true" />
            )}

            <Link
              href="/amc"
              className="text-[15px] leading-[22px] text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
            >
              All asset managers
            </Link>

            {next ? (
              <Pager amc={next} direction="next" />
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        </Shell>
      </Section>

      <ConsultCta
        eyebrow={null}
        lines={["Considering a scheme", `from ${amc.sifName}?`]}
        body="Tell us your goals and risk comfort. We will take you through what is on file — and be explicit about what is not."
      />
    </>
  );
}

/* ============================================================
   House mark — one tile geometry, two fills
   ============================================================ */

/* ============================================================
   Scheme card — what we hold, and plainly what we do not.
   ============================================================ */

const FIGURE = "text-[22px] font-medium leading-[30px] text-ink";
/** Same slot, same size — muted, because an absence is not a figure. */
const FIGURE_ABSENT = "text-[22px] font-medium leading-[30px] text-muted";

type ExpenseFigure = { ratio: number; isCap: boolean | null };

/** "2.25%" for one value, "2.00–2.25%" across a house that varies. */
function span(values: number[]): { text: string; spread: boolean } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high
    ? { text: `${low.toFixed(2)}%`, spread: false }
    : { text: `${low.toFixed(2)}–${high.toFixed(2)}%`, spread: true };
}

/**
 * A house's expense figures, stated for what they are.
 *
 * Every ratio on file is the ISID's MAXIMUM permissible TER, so a bare
 * "1.33–2.25%" reads as a spread of prices when it is a spread of ceilings.
 * The qualifier is said once for the whole span rather than per figure —
 * "up to 1.33% – up to 2.25%" is two bounds where the house has one range of
 * them — and a lone cap borrows `formatExpense`'s exact phrasing so the strip
 * and the scheme row below it cannot state the same number differently.
 *
 * Caps and charged ratios are never merged into one span: the low end would
 * be a fee and the high end a limit, and the reader has no way to tell which
 * is which. A house holding both gets a labelled span for each. None does
 * today; the branch exists so the first charged ratio filed is not silently
 * absorbed into the ceilings.
 */
function formatExpenseRange(figures: ExpenseFigure[]): string {
  const caps = figures.filter((f) => f.isCap === true).map((f) => f.ratio);
  const charged = figures.filter((f) => f.isCap !== true).map((f) => f.ratio);
  const parts: string[] = [];

  if (caps.length > 0) {
    const { text, spread } = span(caps);
    parts.push(spread ? `Ceilings of ${text}` : `Up to ${text}`);
  }
  if (charged.length > 0) {
    const { text } = span(charged);
    parts.push(caps.length > 0 ? `Charged ${text}` : text);
  }
  return parts.join(" · ");
}

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-surface px-7 py-6">
      <p className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SchemeCard({ strategy }: { strategy: Strategy }) {
  const nav = getNav(strategy.id);

  return (
    <Card className="p-7 sm:p-10">
      {/* 420 / 1fr — asymmetric, never a half-and-half split. */}
      <div className="grid gap-10 xl:grid-cols-[420px_1fr] xl:gap-16">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Eyebrow>{strategy.type}</Eyebrow>
            <span className="inline-flex shrink-0 items-center rounded-full border border-hairline px-2.5 py-0.5 text-[12px] capitalize leading-[18px] text-body">
              {strategy.category}
            </span>
          </div>

          <h3 className="mt-6 text-[22px] font-medium leading-[30px] text-ink">
            {strategy.name}
          </h3>
          <p className="mt-2 text-[12px] leading-[18px] text-muted">
            AMFI scheme code{" "}
            <span className="tabular">{strategy.amfiSchemeCode}</span>
            {strategy.isin ? (
              <>
                {" · ISIN "}
                <span className="tabular">{strategy.isin}</span>
              </>
            ) : null}
          </p>

          <div className="mt-8">
            {nav.status === "live" ? (
              <>
                {/* Fires once, lands on the filed value, stops. A figure that
                    keeps moving would imply live data we do not claim. */}
                <Odometer
                  value={nav.today}
                  decimals={4}
                  prefix="₹"
                  className="text-[clamp(24px,2.4vw,32px)] font-medium leading-[1.2] text-ink"
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {/* Renders "No prior close". Never guarded here — the
                      primitive owns the null case. */}
                  <Delta pct={nav.changePct} size="lg" />
                  <span className="tabular text-[12px] leading-[18px] text-muted">
                    As at {formatUpdated(nav.asOf)}
                  </span>
                </div>
                {/*
                  No sparkline, no bar, no shared axis — here. A series does
                  exist per scheme now, and the NAV tracker plots it against
                  its OWN axis. What must never happen is a shared scale:
                  SIF-21 sits at ~₹943 and SIF-96 at ~₹1,022 against ~₹10 for
                  the other 28, off a different face value, not performing
                  100× better. So this card states the move as a percentage
                  and links out for the line.
                */}
                <p className="mt-4 max-w-[42ch] text-[12px] leading-[18px] text-muted">
                  Change is measured against this scheme’s previous published
                  NAV. See the{" "}
                  <Link href="/nav-tracker" className="underline">
                    NAV tracker
                  </Link>{" "}
                  for the full series.
                </p>
              </>
            ) : (
              <p className="max-w-[42ch] text-[15px] leading-[26px] text-body">
                No NAV for this scheme in the AMFI file dated{" "}
                {formatUpdated(navLastUpdated)}.
              </p>
            )}
          </div>
        </div>

        <div>
          {strategy.overview ? (
            <p className="mb-8 max-w-[68ch] text-[15px] leading-[26px] text-body">
              {strategy.overview}
            </p>
          ) : null}

          <dl className="grid sm:grid-cols-2 sm:gap-x-10">
            <Disclosure label="Minimum investment">
              {strategy.minInvestment === null ? null : (
                <span className="tabular">
                  {formatInr(strategy.minInvestment)}
                </span>
              )}
            </Disclosure>
            <Disclosure label="Expense ratio">
              {strategy.expenseRatio === null ? null : (
                <span className="tabular">
                  {formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)}
                </span>
              )}
            </Disclosure>
            <Disclosure label="Exit load">{strategy.exitLoad}</Disclosure>
            <Disclosure label="Risk band">
              {/* The primitive renders its own "Not captured" for null. */}
              <RiskBand band={riskBandNumber(strategy.riskBand)} />
            </Disclosure>
            <Disclosure label="Benchmark">{strategy.benchmark}</Disclosure>
            <Disclosure label="Redemption">
              {strategy.redemptionFrequency}
            </Disclosure>
            <Disclosure label="Taxation">{strategy.taxation}</Disclosure>
            <Disclosure label="Dividend">{strategy.dividend}</Disclosure>
          </dl>

          {/* Said once at card level rather than five times in the rows —
              which is exactly what `disclosuresCaptured` is for. */}
          {!strategy.disclosuresCaptured ? (
            <p className="mt-6 border-t border-hairline pt-4 max-w-[68ch] text-[13px] leading-[20px] text-muted">
              Disclosures for this scheme are not yet captured — see the scheme
              information document. The name, code, ISIN, category, mandate and
              NAV above come from AMFI&apos;s feed and are what we hold.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-hairline py-3.5">
      <dt className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
        {label}
      </dt>
      {/* Null never renders as a blank row. Same wording and weight as the
          RiskBand primitive's null state, so absence reads as one thing. */}
      <dd className="mt-2 text-[15px] leading-[22px] text-ink">
        {children ?? <span className="text-[13px] text-muted">Not captured</span>}
      </dd>
    </div>
  );
}

/* ============================================================
   Pager
   ============================================================ */

function Pager({ amc, direction }: { amc: Amc; direction: "prev" | "next" }) {
  const isNext = direction === "next";

  return (
    <Link
      href={`/amc/${amc.id}`}
      className={cn(
        "group flex items-center gap-3",
        isNext && "sm:flex-row-reverse sm:text-right",
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className={cn(
          "shrink-0 text-accent transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isNext
            ? "group-hover:translate-x-1"
            : "rotate-180 group-hover:-translate-x-1",
        )}
      >
        <path
          d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span>
        <span className="block text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
          {isNext ? "Next house" : "Previous house"}
        </span>
        <span className="mt-1 block text-[15px] leading-[22px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
          {amc.sifName}
        </span>
      </span>
    </Link>
  );
}
