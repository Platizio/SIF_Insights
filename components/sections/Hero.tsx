"use client";

/* ============================================================
   HERO — the Yield Surface + the lede.

   The proof-tile bento was removed pending a replacement treatment;
   the hero is a single column over the canvas for now. Everything the
   bento used (Odometer, DrawnPath, the AMC discs) is still available
   in the motion + primitives modules when the new treatment lands.

   "use client" is deliberate. The load sequence needs real
   initial/animate targets with working delays, and the shared wrappers
   can't express them: every variant in lib/motion carries its own
   `transition`, and Motion drops the `transition` PROP whenever the
   resolved variant defines one — so `<Rise delay={0.42}>` never delays.
   Everything below therefore sets its transition explicitly.

   This still server-renders: "use client" only means hydrated, so the
   headline and the standfirst are in the first HTML payload.
   ============================================================ */

import { motion, useReducedMotion, type Transition } from "motion/react";
import type { ReactNode } from "react";

import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { HeroCanvas } from "@/components/webgl/HeroCanvas";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";
import { DUR, EASE } from "@/lib/motion";

/* ============================================================
   Choreography

   A page-load sequence, not a scroll reveal — the hero is above the
   fold, so nothing here waits on a viewport intersection.

   Headline line 1 fires at 0. Chrome ignores opacity:0 elements when
   picking an LCP candidate, so any delay on the H1 is a measured LCP
   regression rather than a taste question. All the luxurious pacing is
   spent on elements that can never be the LCP candidate.
   ============================================================ */

const CHOREO = {
  eyebrow: 0.15,
  headline: 0,
  standfirst: 0.24,
  cta: 0.42,
  trust: 0.55,
} as const;

type Curve = (typeof EASE)[keyof typeof EASE];

/**
 * One reduced-motion decision for the whole section instead of a guard per
 * element. Only the transition changes — `initial` stays identical, so the
 * server and client markup never diverge.
 */
function useEnter() {
  const reduce = useReducedMotion();
  return (
    delay: number,
    duration: number,
    ease: Curve = EASE.out,
  ): Transition => (reduce ? { duration: 0 } : { duration, ease, delay });
}

/* ============================================================
   Section
   ============================================================ */

export function Hero() {
  return (
    <Section
      id="hero"
      className="relative flex min-h-[64vh] items-center pt-[72px] pb-[100px]"
    >
      {/* The Yield Surface. Substrate, never a competitor: it owns its own
          poster, lazy mount, capability gates and reduced-motion freeze. */}
      <HeroCanvas />

      <Shell className="relative z-10">
        <HeroLede />
      </Shell>
    </Section>
  );
}

/* ============================================================
   The load sequence, ~1.1s to the trust cluster
   ============================================================ */

function HeroLede() {
  const enter = useEnter();

  return (
    <div className="flex max-w-[820px] flex-col items-start">
      <motion.div
        data-reveal=""
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.eyebrow, DUR.reveal)}
      >
        <Eyebrow>SEBI Regulated · Introduced 2025</Eyebrow>
      </motion.div>

      {/* Masked lines: the type rises from behind its own baseline. Hand-split
          so the serif swap lands where we want it, not where a resize does. */}
      <LineReveal
        as="h1"
        delay={CHOREO.headline}
        className="mt-7 text-[clamp(40px,5.4vw,80px)] leading-[1.12] font-medium text-ink"
        /* Line 1 is a plain string; only line 2 needs markup, and an element
           inside an array literal must carry a key or React warns. */
        lines={[
          "India’s SIF market,",
          <span key="swap-line">
            in <em className="swap">full</em> view.
          </span>,
        ]}
      />

      <motion.p
        data-reveal=""
        className="mt-8 max-w-[52ch] text-[17px] leading-[30px] text-body"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.standfirst, DUR.reveal)}
      >
        Specialised Investment Funds sit between mutual funds and PMS —
        long-short flexibility under SEBI&rsquo;s framework, from a ₹10 lakh
        minimum. We track every scheme, every NAV, every disclosure.
      </motion.p>

      <motion.div
        data-reveal=""
        className="relative isolate mt-10 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.cta, DUR.reveal)}
      >
        {/* Backdrop for the CTA pair. Fades to its own hue at zero alpha —
            fading to `transparent` (rgba(0,0,0,0)) is what previously left a
            visible grey box over the contours. */}
        <GlassField />
        {/* inline-flex is load-bearing: transforms are ignored on inline boxes,
            so a bare <span> wrapper would silently kill the magnetic pull. */}
        <Magnetic className="inline-flex">
          <Button href="#nav-board" variant="primary">
            Explore the funds
          </Button>
        </Magnetic>
        <Button href="#what-is-a-sif" variant="ghost">
          What is a SIF?
        </Button>
      </motion.div>

      <motion.div
        data-reveal=""
        className="mt-9"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.trust, DUR.reveal)}
      >
        <TrustCluster />
      </motion.div>
    </div>
  );
}

/** Every figure traces to `stats` / `navLastUpdated`. Hairline separators only. */
function TrustCluster() {
  const items: ReactNode[] = [
    <>
      <span className="tabular text-ink">{stats.amcCount}</span> AMCs
    </>,
    <>
      <span className="tabular text-ink">{stats.strategyCount}</span> strategies
    </>,
    <>
      NAV from AMFI ·{" "}
      {/* Formatted with Intl on both passes; the source is a bare date, so a
          viewer west of UTC can legitimately resolve one day earlier. */}
      <span className="tabular" suppressHydrationWarning>
        {formatUpdated(navLastUpdated)}
      </span>
    </>,
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] leading-[20px] text-muted">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-5">
          {i > 0 ? (
            <span aria-hidden="true" className="h-3.5 w-px bg-hairline" />
          ) : null}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
