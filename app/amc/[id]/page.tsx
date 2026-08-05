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
   Nine of the seventeen houses have none captured at all — this
   page has to read correctly for those, not just tolerate them.
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const amc = amcById.get(id);
  if (!amc) return { title: "Asset manager not found" };

  const own = schemesOf(amc.id);
  const disclosed = disclosedCount(own);
  return {
    title: `${amc.sifName} — ${amc.name}`,
    description: `${amc.description}. ${own.length} scheme${
      own.length === 1 ? "" : "s"
    } tracked, ${liveCount(own)} with a NAV filed with AMFI, and the disclosure set for ${disclosed} of them.`,
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
     could be mistaken for a value. */
  const bands = [
    ...new Set(
      own
        .map((s) => riskBandNumber(s.riskBand))
        .filter((b): b is number => b !== null),
    ),
  ].sort((a, b) => a - b);

  const expenses = own
    .map((s) => s.expenseRatio)
    .filter((e): e is number => e !== null);

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
              NAV data fetched from AMFI. Updated daily; file dated{" "}
              {formatUpdated(navLastUpdated)}.{" "}
              {disclosed === 0
                ? "We hold no scheme information document for this house yet, so risk band and expense are shown as not captured rather than estimated."
                : `Risk band and expense are drawn from the ${disclosed} of ${own.length} ${
                    own.length === 1 ? "scheme" : "schemes"
                  } whose disclosures we have captured.`}
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

/** "2.25%" for one value, "2.00–2.25%" across a house that varies. */
function formatExpenseRange(values: number[]): string {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high
    ? `${low.toFixed(2)}%`
    : `${low.toFixed(2)}–${high.toFixed(2)}%`;
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
                  {strategy.expenseRatio.toFixed(2)}%
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
