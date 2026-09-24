import Link from "next/link";
import type { ReactNode } from "react";
import { AmcMark } from "@/components/AmcMark";
import { PageHeader } from "@/components/PageHeader";
import { Rise } from "@/components/motion/Reveal";
import { Button, Delta, RiskBand, Section, Shell } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { SourceNote } from "@/components/ui/SourceNote";
import { navSourceUrl } from "@/lib/data";
import { formatExpense, formatInr, formatNav, formatUpdated } from "@/lib/format";
import { PRIMARY_CTA } from "@/lib/nav";
import { compareHref, DEFAULT_SCREEN, screenHref } from "@/lib/screener/url";
import type { SifDetail } from "./detail";

/* ============================================================
   The scheme page's opening: who files it, what it is, the four
   fields every fund row on the site carries (risk band, exit load,
   expense, minimum), the latest NAV, and the two ways forward —
   add it to a comparison, or talk to us.
   ============================================================ */

const CATEGORY_LABEL = { equity: "Equity", hybrid: "Hybrid", debt: "Debt" } as const;

/** In-page anchors, in the order the sections render. */
export const SIF_SECTIONS = [
  { id: "performance", label: "Performance" },
  { id: "risk", label: "Risk" },
  { id: "costs", label: "Costs" },
  { id: "terms", label: "Liquidity & terms" },
  { id: "fund", label: "Fund & management" },
  { id: "documents", label: "Documents" },
] as const;

export function SifHeader({ detail }: { detail: SifDetail }) {
  const { row, strategy, amc } = detail;
  const category = CATEGORY_LABEL[row.category];
  const article = row.category === "equity" ? "An" : "A";
  const mandate = row.strategy
    ? `following SEBI’s ${row.strategyLabel} strategy`
    : `on the ${row.type} mandate`;
  const began = row.inception;

  return (
    <>
      <Shell className="pt-10">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[20px] text-muted">
            <Crumb href="/">Home</Crumb>
            <Crumb href="/amc">AMCs</Crumb>
            <Crumb href={`/amc/${row.amcId}`}>{row.brand}</Crumb>
            <li aria-current="page" className="min-w-0 text-body">
              {row.shortName}
            </li>
          </ol>
        </nav>
      </Shell>

      <PageHeader
        className="pt-8"
        eyebrow={row.amcName}
        lines={[row.shortName]}
        standfirst={
          <>
            Filed with AMFI as “{row.name}”. {article} {category.toLowerCase()} SIF{" "}
            {mandate}, run by {row.amcName} under its {row.brand} brand.
          </>
        }
        meta={[
          <>
            AMFI code <span className="tabular">{row.code}</span>
          </>,
          ...(strategy.isin
            ? [
                <>
                  ISIN <span className="tabular">{strategy.isin}</span>
                </>,
              ]
            : []),
          ...(began
            ? [
                <>
                  {began.basis === "allotment" ? "Allotted" : "First NAV"}{" "}
                  <span className="tabular">{formatUpdated(began.date)}</span>
                </>,
              ]
            : []),
        ]}
        aside={<NavPanel detail={detail} amc={amc} />}
      />

      <Section id="overview" className="pt-0">
        <Shell>
          <Rise>
            <ul aria-label="Classification" className="flex flex-wrap gap-2">
              <li>
                <Pill
                  group="Category"
                  href={screenHref({
                    ...DEFAULT_SCREEN,
                    filters: { cat: { t: "set", ids: [row.category] } },
                  })}
                  more={`See every ${category.toLowerCase()} SIF in the screener`}
                >
                  {category}
                </Pill>
              </li>
              <li>
                <Pill
                  group="Strategy"
                  href={
                    row.strategy
                      ? screenHref({
                          ...DEFAULT_SCREEN,
                          filters: { str: { t: "set", ids: [row.strategy] } },
                        })
                      : null
                  }
                  more={`See every ${row.strategyLabel} SIF in the screener`}
                >
                  {row.strategyLabel}
                </Pill>
              </li>
            </ul>
          </Rise>

          <Rise delay={0.08}>
            {/* gap-px over a hairline ground: exact dividers at every wrap. The
                exit load is the document's own sentence, so it gets the wide
                track instead of being paraphrased to fit a narrow one. */}
            <dl className="mt-6 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_2fr]">
              <KeyFact label="Risk band">
                <RiskBand band={row.riskBand} />
              </KeyFact>
              <KeyFact label="Expense ratio">
                {strategy.expenseRatio === null ? (
                  <NotCaptured />
                ) : (
                  <>
                    <span className="tabular">
                      {formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)}
                    </span>
                    {strategy.expenseRatioIsCap ? (
                      <span className="mt-1 block text-[13px] leading-[20px] text-muted">
                        Maximum permitted. <a href="#costs" className="underline decoration-hairline underline-offset-4 hover:text-ink">Charged TER below</a>
                      </span>
                    ) : null}
                  </>
                )}
              </KeyFact>
              <KeyFact label="Minimum investment">
                {row.minInvestment === null ? (
                  <NotCaptured />
                ) : (
                  <span className="tabular">{formatInr(row.minInvestment)}</span>
                )}
              </KeyFact>
              <KeyFact label="Exit load">
                {row.exitLoad.text === null ? <NotCaptured /> : row.exitLoad.text}
              </KeyFact>
            </dl>
          </Rise>

          <Rise delay={0.14}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href={PRIMARY_CTA.href}>{PRIMARY_CTA.label}</Button>
              <Button href={compareHref([row.code])} variant="ghost">
                Add to compare
              </Button>
            </div>
          </Rise>

          <Rise delay={0.18}>
            <nav aria-label="On this page" className="mt-10 border-t border-hairline pt-5">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-[20px]">
                {SIF_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent hover:decoration-current"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Rise>
        </Shell>
      </Section>
    </>
  );
}

function Crumb({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Link
        href={href}
        className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
      >
        {children}
      </Link>
      <span aria-hidden="true">/</span>
    </li>
  );
}

/** A classification pill. A link into the screener where a filter exists for it. */
function Pill({
  group,
  href,
  more,
  children,
}: {
  group: string;
  href: string | null;
  /** Screen-reader tail naming where the link goes. */
  more: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <span className="text-muted">{group}</span>
      <span>{children}</span>
    </>
  );
  const cls =
    "inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-[13px] leading-[20px] text-ink";

  return href ? (
    <Link
      href={href}
      className={`${cls} transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:text-accent`}
    >
      {body}
      <span className="sr-only"> — {more}</span>
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

function KeyFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-surface px-6 py-5">
      <dt className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="mt-3 text-[15px] leading-[24px] text-ink">{children}</dd>
    </div>
  );
}

/**
 * The house and the latest NAV. A NAV is published once a day, so it is the
 * LATEST NAV, dated — never "live". The move is against the previous
 * published NAV, which is named, because it is not always yesterday.
 */
function NavPanel({ detail, amc }: { detail: SifDetail; amc: SifDetail["amc"] }) {
  const { row } = detail;
  const day = row.returns["1D"];
  const prior = detail.returns["1D"];

  return (
    <div>
      <AmcMark amc={amc} size="xl" />
      {/* Not uppercased: the brands are cased deliberately (iSIF, qsif). */}
      <p className="mt-4 text-[13px] font-semibold leading-[20px] text-accent">{row.brand}</p>
      <p className="text-[13px] leading-[20px] text-muted">{row.amcName}</p>

      <div className="mt-6 border-t border-hairline pt-5">
        <p className="text-[13px] leading-[20px] text-muted">Latest NAV</p>
        {Number.isFinite(row.nav) ? (
          <p className="tabular mt-1 text-[clamp(28px,3vw,36px)] font-medium leading-[1.2] text-ink">
            {formatNav(row.nav)}
          </p>
        ) : (
          <p className="mt-1">
            <NotCaptured />
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {"v" in day ? <Delta pct={day.v} /> : <NotCaptured reason={day.absent} />}
          <span className="text-[13px] leading-[20px] text-muted">
            1D
            {prior.status === "ok" ? (
              <>
                , vs {formatNav(prior.from.nav)} on{" "}
                <span className="tabular">{formatUpdated(prior.from.date)}</span>
              </>
            ) : null}
          </span>
        </div>

        {row.navAsOf ? (
          <AsOf className="mt-3" label="NAV as of" iso={row.navAsOf} format={formatUpdated} />
        ) : null}
        <SourceNote sources={[{ label: "AMFI", href: navSourceUrl }]} />
      </div>
    </div>
  );
}
