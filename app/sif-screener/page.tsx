import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ConsultCta } from "@/components/ConsultCta";
import { Rise, Rule } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { amcs, buildSifRows, formatUpdated, navLastUpdated, stats, type Amc } from "@/lib/data";
import { fieldsFor } from "@/lib/screener/fields";
import { SITE } from "@/lib/site";
import { Screener } from "./Screener";

/* The interactive screen lives in ./Screener because `metadata` is
   Server-Component-only and this route needs both. The server passes
   plain rows (buildSifRows) — the client island never touches lib/data.

   Canonical is the bare path: a screen in the query string is a view of
   this page, not a page of its own, so every ?q=…&r6m=… variant points
   search engines back here.

   `openGraph` is restated in full because Next merges metadata shallowly:
   declaring the key replaces the root layout's block, image included. */
export const metadata: Metadata = {
  title: "SIF Screener",
  description: `Screen and shortlist all ${stats.strategyCount} Specialised Investment Funds from ${stats.amcCount} AMCs by strategy, performance, risk, AUM, cost, liquidity and fund manager.`,
  alternates: { canonical: "/sif-screener" },
  openGraph: {
    title: `SIF Screener — filter, sort and shortlist all ${stats.strategyCount} SIFs`,
    description: `Every standardised metric on ${SITE.name} as a filter, a sort key and a column — across all ${stats.strategyCount} Specialised Investment Funds.`,
    url: "/sif-screener",
    images: "/opengraph-image.png",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

/** PRD p.47 — the journey the Screener sits in, in the PRD's own words. */
const JOURNEY: { step: string; name: string; line: string; href?: string }[] = [
  { step: "01", name: "SIF Tracker", line: "Monitor the market", href: "/sif-tracker" },
  { step: "02", name: "SIF Screener", line: "Interrogate the market" },
  { step: "03", name: "Compare", line: "Evaluate shortlisted SIFs", href: "/compare" },
];

const SOURCES = ["AMFI", "AMC Disclosures", "Factsheets", "Scheme Documents", "SIF Insight Calculations"];

export default function SifScreenerPage() {
  const rows = buildSifRows();
  const amcMap: Record<string, Amc> = Object.fromEntries(amcs.map((a) => [a.id, a]));
  /* Derived from the registry, so it tracks what is actually screenable. */
  const metricCount = fieldsFor(rows).length;

  return (
    <>
      <PageHeader
        eyebrow="Interrogate the market"
        lines={["SIF Screener"]}
        standfirst="Screen and shortlist SIFs using the parameters that matter to you — across strategy, AMC, performance, risk, AUM, cost, liquidity, fund management and other scheme characteristics."
        meta={[
          <Fragment key="sifs">
            <span className="tabular">{stats.strategyCount}</span> SIFs
          </Fragment>,
          <Fragment key="amcs">
            <span className="tabular">{stats.amcCount}</span> AMCs
          </Fragment>,
          <Fragment key="metrics">
            <span className="tabular">{metricCount}</span> metrics to filter, sort and show
          </Fragment>,
          <Fragment key="nav">Latest NAV {formatUpdated(navLastUpdated)}</Fragment>,
        ]}
        aside={
          <ol aria-label="Tracker, Screener, Compare" className="border-t border-hairline">
            {JOURNEY.map((j) => (
              <li
                key={j.step}
                aria-current={j.href ? undefined : "page"}
                className="grid grid-cols-[40px_1fr] gap-x-3 border-b border-hairline py-4"
              >
                <span className="tabular pt-0.5 text-[12px] leading-[20px] text-muted">{j.step}</span>
                <span>
                  {j.href ? (
                    <Link
                      href={j.href}
                      className="text-[15px] leading-[22px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
                    >
                      {j.name}
                    </Link>
                  ) : (
                    <span className="text-[15px] font-medium leading-[22px] text-accent-dim">{j.name}</span>
                  )}
                  <span className="block text-[13px] leading-[20px] text-muted">{j.line}</span>
                </span>
              </li>
            ))}
          </ol>
        }
      />

      <Section id="screener">
        <Shell>
          <Screener rows={rows} amcs={amcMap} />

          <Rule className="mt-16" />

          {/* Asymmetric: provenance left, how to read the figures right. */}
          <div className="mt-12 grid gap-10 lg:grid-cols-[400px_1fr] lg:gap-16">
            <Rise>
              <Eyebrow>Data date &amp; sources</Eyebrow>
              <AsOf iso={navLastUpdated} format={formatUpdated} className="mt-4" />
              <p className="mt-2 text-[14px] leading-[22px] text-body">
                <span className="text-muted">Sources: </span>
                {SOURCES.map((s, i) => (
                  <Fragment key={s}>
                    {i > 0 ? <span aria-hidden="true" className="text-muted"> | </span> : null}
                    {i > 0 ? <span className="sr-only">, </span> : null}
                    {s}
                  </Fragment>
                ))}
              </p>
              <Link
                href="/methodology"
                className="group mt-5 inline-flex items-center gap-2 text-[14px] leading-[20px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
              >
                How we calculate
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </Rise>

            <Rise delay={0.08}>
              <ul className="max-w-[78ch] space-y-3 text-[13px] leading-[20px] text-muted">
                <li>{PAST_PERFORMANCE_NOTE}</li>
                <li>
                  Returns under a year are simple returns; a year or longer is annualised (CAGR).
                  Volatility, maximum drawdown and returns are SIF Insight calculations from AMFI’s
                  published NAVs; the methodology page sets out each one.
                </li>
                <li>
                  Latest NAV can be shown and filtered, but never sorted: SIFs start from different
                  face values (₹10 or ₹1,000), so a higher NAV is not a higher return.
                </li>
                <li>
                  A SIF without a value for a metric sorts last in either direction, and is set
                  aside — and counted — by any filter on that metric. Nothing is estimated to fill
                  a gap.
                </li>
              </ul>
            </Rise>
          </div>
        </Shell>
      </Section>

      <ConsultCta
        eyebrow={null}
        lines={["Shortlisted a few?", "Talk them through."]}
        body="Tell us what you are screening for. We will walk you through how the strategies on your shortlist differ and what each scheme document says — the decision stays yours."
      />
    </>
  );
}
