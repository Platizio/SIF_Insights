import type { ReactNode } from "react";
import {
  ChartIcon,
  CompareIcon,
  DocumentIcon,
  LayersIcon,
} from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { stats } from "@/lib/data";
import { formatInr } from "@/lib/format";

/* ============================================================
   WHAT IS A SIF & WHY SIF? — home, PRD p.13-14.

   Educational, not data-heavy: the PRD is explicit that this block
   carries no fund names, NAVs or performance numbers. The single
   figure it prints — the minimum investment — is the regulatory
   threshold from `stats`, never a typed literal, so a change in the
   framework cannot leave a stale "₹10 Lakh" behind.

   Server component. Every motion wrapper it uses is a client island
   from components/motion, which keeps the reveal invariant in one place.
   ============================================================ */

/** "₹10 Lakh" when the threshold is a whole number of lakh, else the full figure. */
function thresholdLabel(rupees: number): string {
  const lakh = rupees / 100_000;
  return Number.isInteger(lakh) ? `₹${lakh} Lakh` : formatInr(rupees);
}

/** The investment spectrum, in order of structural sophistication (PRD p.13). */
const SPECTRUM: { label: string; current?: boolean }[] = [
  { label: "Mutual Funds" },
  { label: "SIFs", current: true },
  { label: "PMS" },
  { label: "AIFs" },
];

type Reason = { title: string; body: string; icon: ReactNode };

export function WhatIsSif() {
  const REASONS: Reason[] = [
    {
      title: "Greater Strategy Flexibility",
      body: "Access strategies beyond conventional long-only investing.",
      icon: <ChartIcon size={22} />,
    },
    {
      title: "Long-Short Opportunities",
      body: "Certain SIF strategies can take both long and permitted short exposures.",
      icon: <CompareIcon size={22} />,
    },
    {
      title: "Multiple Investment Mandates",
      body: "Explore equity, hybrid, asset-allocation and other specialised strategies.",
      icon: <LayersIcon size={22} />,
    },
    {
      title: `${thresholdLabel(stats.minInvestment)} Investment Threshold`,
      body: "Provides access to specialised strategies at a lower threshold than PMS and AIF structures.",
      icon: <DocumentIcon size={22} />,
    },
  ];

  return (
    <Section id="what-is-sif">
      <Shell>
        {/* Asymmetric split: heading column narrow, copy + spectrum wide. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <Rise>
              <Eyebrow>The basics</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              className="mt-5 text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.2] text-ink"
              lines={["What is a Specialised", "Investment Fund?"]}
            />
          </div>

          <div className="lg:pt-9">
            <Rise delay={0.08}>
              <p className="max-w-[60ch] text-[17px] leading-[30px] text-body">
                A Specialised Investment Fund (SIF) is an investment framework
                introduced for investors seeking strategies with greater
                flexibility than traditional mutual funds. SIFs can use
                approaches such as long-short strategies, derivatives and
                dynamic asset allocation, depending on the scheme mandate.
              </p>
            </Rise>
          </div>
        </div>

        <Rise delay={0.12} className="mt-14">
          <Spectrum />
        </Rise>

        <Rule className="mt-20" />

        {/* A sub-heading of this section, so no second eyebrow — the four
            type sizes here are the display clamp, 22, 17 and 15. */}
        <LineReveal
          as="h3"
          className="mt-14 text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.2] text-ink"
          lines={["Why SIF?"]}
        />

        <Group className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {REASONS.map((r) => (
            <GroupItem key={r.title} className="h-full">
              <article className="flex h-full flex-col border border-hairline bg-surface p-7">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-accent"
                >
                  {r.icon}
                </span>
                <h4 className="mt-8 text-[22px] font-medium leading-[30px] text-ink">
                  {r.title}
                </h4>
                <p className="mt-3 text-[15px] leading-[26px] text-body">{r.body}</p>
              </article>
            </GroupItem>
          ))}
        </Group>

        <Rise delay={0.1} className="mt-12">
          <Button href="/what-is-sif" variant="ghost">
            Learn more about SIFs
          </Button>
        </Rise>
      </Shell>
    </Section>
  );
}

/**
 * Mutual Funds → SIFs → PMS → AIFs as a real ordered list, styled as a
 * track: a horizontal row from md up, a vertical rail below it. The SIF
 * step carries the brand accent and says so in text for screen readers — the highlight is never colour alone.
 */
function Spectrum() {
  return (
    <figure>
      <ol
        aria-label="Investment spectrum, from traditional to more sophisticated structures"
        className="relative grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-0"
      >
        {SPECTRUM.map((step, i) => (
          <li
            key={step.label}
            className={cn(
              "relative flex items-center gap-4 border px-6 py-6 md:flex-col md:items-start md:gap-6 md:py-8",
              /* Shared hairlines between neighbours: every step draws its own
                 box, and from md the left edge of steps 2-4 is dropped so
                 two borders never stack into a 2px seam. */
              i > 0 && "md:border-l-0",
              step.current
                ? "border-accent bg-accent-wash md:border-l"
                : "border-hairline bg-ground",
              /* The highlighted step's left edge replaces its neighbour's
                 right edge, so that one must go instead. */
              SPECTRUM[i + 1]?.current && "md:border-r-0",
            )}
          >
            <span
              className={cn(
                "tabular text-[15px] leading-[22px]",
                step.current ? "text-accent-dim" : "text-muted",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "text-[22px] font-medium leading-[30px]",
                step.current ? "text-accent-dim" : "text-ink",
              )}
            >
              {step.label}
              {step.current ? <span className="sr-only"> (highlighted)</span> : null}
            </span>
            {i < SPECTRUM.length - 1 ? (
              <span
                aria-hidden="true"
                className="ml-auto text-muted md:absolute md:top-1/2 md:right-0 md:z-10 md:ml-0 md:flex md:h-7 md:w-7 md:translate-x-1/2 md:-translate-y-1/2 md:items-center md:justify-center md:rounded-full md:border md:border-hairline md:bg-ground"
              >
                <span className="inline-block rotate-90 md:rotate-0">→</span>
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <figcaption className="mt-6 flex flex-col gap-4 md:flex-row md:items-baseline md:justify-between">
        <span className="max-w-[60ch] text-[15px] leading-[26px] text-body">
          SIFs bridge the space between traditional mutual funds and more
          sophisticated investment structures.
        </span>
        <span
          aria-hidden="true"
          className="hidden shrink-0 items-center gap-3 text-[15px] leading-[22px] text-muted md:inline-flex"
        >
          Traditional
          <span className="h-px w-16 bg-hairline" />
          More sophisticated
        </span>
      </figcaption>
    </figure>
  );
}
