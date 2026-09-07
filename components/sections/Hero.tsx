"use client";

/* ============================================================
   HERO — the banner + the lede.

   The banner is a static image (see HeroBanner). It replaced the WebGL
   Yield Surface, which still lives in components/webgl/ — HeroCanvas and
   YieldSurface are intact and unimported, so the old treatment is one
   import away if it is ever wanted back.

   The proof-tile bento was removed pending a replacement treatment; the
   hero is a single column over the banner for now. Everything the bento
   used (Odometer, DrawnPath, the AMC discs) is still available in the
   motion + primitives modules when the new treatment lands.

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
import Image from "next/image";
import type { ReactNode } from "react";

import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
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
      {/* Substrate, never a competitor — see HeroBanner for the scrim that
          keeps the lede legible over it. */}
      <HeroBanner />

      <Shell className="relative z-10">
        <HeroLede />
      </Shell>
    </Section>
  );
}

/* ============================================================
   Banner
   ============================================================ */

/**
 * The hero banner.
 *
 * NO ENTRANCE ANIMATION, deliberately. This is the largest painted element
 * above the fold and therefore a live LCP candidate, and Chrome refuses to
 * score an element that starts at opacity 0 — fading it in would register as
 * a measured LCP regression, not a taste choice. It is the same rule that
 * keeps the headline at delay 0 in CHOREO.
 *
 * The art is 3840x1646 (21:9) with its detail massed on the right and pale
 * water and haze on the left, so `object-right` keeps the architecture in
 * frame at desktop widths while the lede sits over the quiet side. A phone
 * viewport is roughly 0.7:1 against the art's 2.33:1, so cover would crop to
 * a narrow vertical slice of the dark right-hand massing with dark type on
 * top — hence `object-center` below md, where the scrim also thickens.
 */
function HeroBanner() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        src="/sif-hero-4k-21x9.png"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className="object-cover object-center md:object-right"
      />

      {/* Scrim, in two axes. Every stop fades to the SAME hue at zero alpha
          and never to `transparent`, which is rgba(0,0,0,0) — a ramp toward
          black that leaves a grey cast over warm paper. That exact mistake
          has already shipped a visible grey box on this page once.

          HORIZONTAL was 0.94 at the left edge, which is very nearly opaque
          paper: it erased the misty ridges and water the art puts behind the
          lede and left that half looking blank. Measured, the raw image there
          is already luminance 209-234 out of 255, and the headline clears
          14:1 against it — so that veil was buying nothing and costing the
          picture. 0.58 keeps the type crisp and lets the ridges read. */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            "linear-gradient(to right, oklch(0.976 0.005 85 / 0.58) 0%, oklch(0.976 0.005 85 / 0.46) 34%, oklch(0.976 0.005 85 / 0.16) 62%, oklch(0.976 0.005 85 / 0) 82%)",
        }}
      />
      {/* VERTICAL, and it carries the legibility budget the horizontal one
          gave up. Type size is not uniform down the column: the 80px headline
          has ~14:1 of headroom, while the 14px trust row sits on the darkest
          part of the art (luminance 128) in a colour that only clears 4.60:1
          on bare paper. So the veil is absent where the type is huge and
          heaviest where it is small — reveal the picture at the top, protect
          the fine print at the bottom. */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.976 0.005 85 / 0) 40%, oklch(0.976 0.005 85 / 0.50) 72%, oklch(0.976 0.005 85 / 0.72) 100%)",
        }}
      />
      {/* Below md the art is a texture behind the type, not a picture beside
          it, so the veil is near-opaque and runs vertically. */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.976 0.005 85 / 0.93) 0%, oklch(0.976 0.005 85 / 0.86) 55%, oklch(0.976 0.005 85 / 0.72) 100%)",
        }}
      />

      {/* Both edges dissolve into the paper. Without the top fade the art
          cut in on a hard horizontal seam a few pixels under the header,
          which read as a mis-cropped image rather than a banner. */}
      <div
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.976 0.005 85 / 1), oklch(0.976 0.005 85 / 0))",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.976 0.005 85 / 0), oklch(0.976 0.005 85 / 1))",
        }}
      />
    </div>
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
        /* 44ch, not the 52ch this measure used on flat paper. At 52ch the
           longest line reached x=908 and ran into the glass massing, where
           the art drops to luminance 88 and the line measured 3.05:1 —
           under AA. Pulling the measure in stops the lede short of the
           architecture instead of veiling the architecture to protect it,
           and 44ch is still comfortably inside the 45-75ch band. */
        className="mt-8 max-w-[44ch] text-[17px] leading-[30px] text-body"
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
        className="mt-12 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.cta, DUR.reveal)}
      >
        {/* NO <GlassField> here, unlike every other CTA cluster on the site.
            That field exists to give backdrop-filter something to blur when a
            glass button sits on flat paper. The banner already supplies it, so
            the field was pure redundancy — and its -inset-x bleed put a hazy
            rectangle 38px LEFT of the text column, breaking the hero's left
            margin against the art. The buttons now frost against the image,
            which is what the treatment was always meant to do. */}
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
    /* text-body, not the text-muted this cluster uses elsewhere. Muted
       clears only 4.60:1 on bare paper, so it has essentially no headroom
       left for a background image — measured against the darkest pixels
       under this row it came out at 3.58:1 even under the old near-opaque
       scrim, i.e. it was already failing AA before the banner landed. Body
       on the same pixels clears 4.9:1. */
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] leading-[20px] text-body">
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
