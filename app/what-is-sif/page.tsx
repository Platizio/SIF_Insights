import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import {
  Eyebrow,
  PendingBadge,
  Section,
  Shell,
} from "@/components/primitives";
import { CategoryComparison } from "@/components/sections/CategoryComparison";
import { Faq } from "@/components/sections/Faq";
import { cn } from "@/lib/cn";
import {
  formatUpdated,
  navLastUpdated,
  stats,
  strategiesByCategory,
  type Category,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "What is a SIF",
  description:
    "Specialised Investment Funds are a SEBI category introduced in 2025 — hedge-fund-style flexibility inside a regulated pooled structure, from a ₹10 lakh minimum. The definition, the rules and where SIFs sit against mutual funds, PMS and AIF.",
  alternates: { canonical: "/what-is-sif" },
};

const SEBI_CIRCULAR =
  "https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html";

/* One display size, shared by every H2 and every figure on the page. The
   contract caps a section at four type sizes; letting the numerals borrow
   the heading size is what keeps each section inside that budget. */
const DISPLAY = "text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.14] text-ink";
const BODY = "text-[17px] leading-[30px] text-body";

/**
 * Cascade interval, matched to the `stagger` token `<Group>` propagates to its
 * `<GroupItem>` children, so each drawn hairline leads its own row by a
 * constant beat. Capped at 10 — past that a cascade reads as lag.
 */
const STEP = 0.06;
const CASCADE_CAP = 10;
const stepDelay = (i: number) => Math.min(i, CASCADE_CAP - 1) * STEP;

/* ============================================================
   Content. Every string here is the brief's copy verbatim; every
   number resolves through @/lib/data.
   ============================================================ */

type Feature = {
  title: string;
  body: string;
  /** Only two of the four carry a figure. The other two show none rather
      than borrowing one — an invented number is the failure mode here. */
  figure?: { value: number; prefix?: string; suffix?: string };
};

const FEATURES: Feature[] = [
  {
    title: "Minimum investment",
    body: "Investors need to commit at least ₹10 lakh.",
    figure: { value: stats.minInvestment, prefix: "₹" },
  },
  {
    title: "Regulated by SEBI",
    body: "SIFs are tightly governed under SEBI’s rules.",
  },
  {
    title: "Investment flexibility",
    body: "SIFs can invest in a broad universe of assets.",
  },
  {
    title: "Risk controls",
    body: `SIFs are allowed up to ${stats.maxUnhedgedShortPct}% unhedged short exposure.`,
    figure: { value: stats.maxUnhedgedShortPct, suffix: "%" },
  },
];

const AUDIENCE = [
  "For investors seeking growth with controlled volatility.",
  "For those investing ₹10 lakh or more with a long-term view.",
  "For anyone wanting tax-efficient, professional strategies.",
  "For investors looking for advanced long-short portfolio tools.",
];

const CATEGORY_TILES: { id: Category; label: string; href: string }[] = [
  { id: "equity", label: "Equity", href: "/strategies/equity" },
  { id: "hybrid", label: "Hybrid", href: "/strategies/hybrid" },
  { id: "debt", label: "Debt", href: "/strategies/debt" },
];

/** Derived, never asserted — the type label comes out of the schemes themselves. */
const typeLabel = (category: Category) =>
  Array.from(new Set(strategiesByCategory[category].map((s) => s.type))).join(" · ");

/* ============================================================
   Page
   ============================================================ */

export default function WhatIsSifPage() {
  return (
    <>
      <PageHeader
        eyebrow="The category"
        lines={["Specialised Investment", "Funds, explained."]}
        standfirst={
          <>
            A SEBI fund category introduced in 2025. SIFs sit between mutual
            funds and the PMS/AIF tier — hedge-fund-style flexibility inside a
            regulated pooled structure, from a{" "}
            <span className="tabular">₹10 lakh</span> minimum.
          </>
        }
        meta={[
          "SEBI circular, Feb 2025",
          <>
            <span className="tabular">{stats.strategyCount}</span> schemes
            tracked
          </>,
          <>
            <span className="tabular">{stats.amcCount}</span> asset managers
          </>,
        ]}
      />

      <Definition />
      <DefiningFeatures />

      {/* The SIF vs MF vs PMS vs AIF table. It belongs here more than
          anywhere, and its "See the strategies" button resolves to the
          #strategies section below. */}
      <CategoryComparison />

      <WhoShouldInvest />
      <StrategyTypes />

      {/* Five questions, and a "Talk to us" button that resolves to #consult. */}
      <Faq />

      {/* id="consult": the imported <Faq /> links to #consult. */}
      <ConsultCta id="consult" lines={["Consult before", "you commit."]} />
    </>
  );
}

/* ============================================================
   The definition
   ============================================================ */

function Definition() {
  return (
    <Section>
      <Shell>
        {/* 460 / 120 / 660 — the framing column stays narrow so the
            definition itself reads at a full editorial measure. */}
        <div className="grid gap-14 xl:grid-cols-[460px_660px] xl:gap-x-[120px]">
          <div>
            <Rise>
              <Eyebrow>Definition</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["What a SIF is."]}
              className={cn("mt-6", DISPLAY)}
            />
          </div>

          <div>
            <Rise>
              <p className={BODY}>
                Specialised Investment Funds are a new category of investment
                product introduced by{" "}
                <Outbound href={SEBI_CIRCULAR}>SEBI in 2025</Outbound>, created
                to give Indian investors access to more sophisticated, flexible
                and diversified strategies than traditional mutual funds allow.
              </p>
            </Rise>

            <Rule className="my-10" delay={0.1} />

            <Rise delay={0.14}>
              <p className={BODY}>
                Mutual funds invest in equity, debt or hybrid schemes under
                strict diversification limits. SIFs can operate with
                hedge-fund-style flexibility inside SEBI&rsquo;s framework —
                bridging the gap between mutual funds, which are too limited for
                advanced strategies, and PMS/AIF, which are too expensive and
                exclusive for most investors.
              </p>
            </Rise>

            {/* The quote's own left rule draws down as the lines rise. */}
            <blockquote className="relative mt-14 pl-6">
              <Rule vertical className="absolute inset-y-0 left-0" delay={0.2} />
              <LineReveal
                as="p"
                delay={0.26}
                lines={[
                  "Think of SIFs as a regulated middle",
                  "ground — advanced strategies, but with",
                  "a lower ticket size than PMS and AIF.",
                ]}
                className="text-[clamp(19px,2.1vw,26px)] leading-[1.56] text-ink"
              />
            </blockquote>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Four defining features
   ============================================================ */

function DefiningFeatures() {
  return (
    <Section>
      <Shell>
        {/* 420 / 16 / 804 — the contract's named features grid. */}
        <div className="grid gap-14 xl:grid-cols-[420px_804px] xl:gap-4">
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>Features</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Four defining", "features."]}
              className={cn("mt-6", DISPLAY)}
            />
            <Rise delay={0.12}>
              <p className="mt-6 max-w-[36ch] text-[15px] leading-[24px] text-muted">
                The two figures here are set by SEBI&rsquo;s SIF framework, not
                by us.
              </p>
            </Rise>
          </div>

          <Group className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <GroupItem key={feature.title} className="h-full">
                <FeatureCard feature={feature} />
              </GroupItem>
            ))}
          </Group>
        </div>
      </Shell>
    </Section>
  );
}

/**
 * Figure above, title below, everything bottom-aligned. The two cards with no
 * figure keep their titles on the same baseline as the two that have one, so
 * the absence reads as composition rather than as a missing value.
 */
function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <TiltCard className="h-full min-h-[300px] p-8">
      <div className="flex h-full flex-col justify-end gap-10">
        {feature.figure ? (
          <Figure {...feature.figure} className={DISPLAY} />
        ) : null}
        <div>
          <h3 className="text-[22px] font-medium leading-[30px] text-ink">
            {feature.title}
          </h3>
          <p className="mt-3 text-[15px] leading-[24px] text-body">
            {feature.body}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

/* ============================================================
   Who should invest
   ============================================================ */

function WhoShouldInvest() {
  return (
    <Section>
      <Shell>
        <div className="max-w-[620px]">
          <Rise>
            <Eyebrow>Investors</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            lines={["Who should", "invest."]}
            className={cn("mt-6", DISPLAY)}
          />
        </div>

        {/* A ledger, not cards — four claims of equal weight, separated by the
            rules rather than boxed by them. */}
        <Group className="mt-14">
          <Rule />
          {AUDIENCE.map((point, i) => (
            <Fragment key={point}>
              <GroupItem>
                <div className="grid gap-3 py-8 sm:grid-cols-[80px_1fr] sm:gap-10">
                  <span className="tabular text-[12px] leading-[20px] tracking-[0.08em] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="max-w-[46ch] text-[clamp(17px,1.7vw,20px)] leading-[1.6] text-ink">
                    {point}
                  </p>
                </div>
              </GroupItem>
              {/* Sibling of the item, not a child: inside <GroupItem> the rule
                  would inherit that wrapper's opacity and could never lead
                  its own row. */}
              <Rule delay={stepDelay(i)} />
            </Fragment>
          ))}
        </Group>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Three strategy types

   id="strategies" deliberately: <CategoryComparison> above links to it.
   ============================================================ */

function StrategyTypes() {
  return (
    <Section id="strategies">
      <Shell>
        <div className="max-w-[620px]">
          <Rise>
            <Eyebrow>The strategies</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            lines={["Three strategy", "types."]}
            className={cn("mt-6", DISPLAY)}
          />
        </div>

        {/* Thirds — 3 × 402.66px, gap 16. */}
        <Group className="mt-14 grid gap-4 md:grid-cols-3">
          {CATEGORY_TILES.map((tile) => {
            const count = strategiesByCategory[tile.id].length;
            const types = typeLabel(tile.id);

            return (
              <GroupItem key={tile.id} className="h-full">
                <Link
                  href={tile.href}
                  className="group flex h-full min-h-[280px] flex-col justify-between gap-10 border border-hairline bg-surface p-8 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent-dim"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[22px] font-medium leading-[30px] text-ink">
                        {tile.label}
                      </h3>
                      {types ? (
                        <p className="mt-2 text-[13px] leading-[20px] text-muted">
                          {types}
                        </p>
                      ) : null}
                    </div>
                    <TileArrow />
                  </div>

                  {count > 0 ? (
                    <div>
                      <Figure value={count} className={DISPLAY} />
                      <p className="mt-1 text-[13px] leading-[20px] text-muted">
                        {count === 1 ? "scheme" : "schemes"}
                      </p>
                    </div>
                  ) : (
                    /* Debt is genuinely empty. The absence is the information. */
                    <div>
                      <PendingBadge />
                      <p className="mt-3 text-[13px] leading-[20px] text-muted">
                        Launching soon
                      </p>
                    </div>
                  )}
                </Link>
              </GroupItem>
            );
          })}
        </Group>

        {/* A figure that animated once must still say when it was true. */}
        <Rise delay={0.2}>
          <p className="mt-8 text-[13px] leading-[20px] text-muted">
            Coverage as of {formatUpdated(navLastUpdated)}.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Local pieces
   ============================================================ */

/**
 * Thin wrapper so the figures on this page share one class.
 *
 * This used to carry a no-JS twin, because Motion serialised the odometer's
 * `initial` transform into the server render and every digit column arrived
 * on zero. That is now fixed inside <Odometer> itself — the server emits the
 * plain value and the columns swap in on mount — so the twin is gone.
 */
function Figure({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <Odometer
      value={value}
      prefix={prefix}
      suffix={suffix}
      className={className}
    />
  );
}

function Outbound({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Reveals move on Y; hover moves on X. */
function TileArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="mt-2.5 shrink-0 text-muted transition-[transform,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:text-accent"
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
