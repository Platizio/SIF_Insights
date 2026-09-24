"use client";

/* ============================================================
   HERO — the banner + the lede.

   The banner is a static image (see HeroBanner). It replaced the WebGL
   Yield Surface, and components/webgl/ has since been deleted along with
   the three.js stack it needed — HeroCanvas and YieldSurface were dead
   weight no file imported, but their four packages still dragged 55
   modules and 139MB of node_modules into every install — transitives like
   @mediapipe/tasks-vision, draco3d and hls.js that no shipped line of code
   executes. The code is in git history if the old treatment is ever wanted
   back; restoring it means reinstalling three, @react-three/fiber,
   @react-three/drei and @types/three.

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

   The hero carries no market figures (PRD p.3-4: the counts and the
   NAV date were removed from the landing view). It closes on the
   regulatory trust line from SITE instead — a client-safe constant, so
   this island imports nothing from the data layer.
   ============================================================ */

import { motion, useReducedMotion, type Transition } from "motion/react";
import Image from "next/image";

import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { SITE } from "@/lib/site";
import { DUR, EASE } from "@/lib/motion";

/* ============================================================
   Choreography

   A page-load sequence, not a scroll reveal — the hero is above the
   fold, so nothing here waits on a viewport intersection.

   Headline line 1 fires at 0 (the H1 is the LCP candidate). Chrome ignores opacity:0 elements when
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

export function HeroClient() {
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
        preload
        loading="eager"
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
   The load sequence, ~1.1s to the trust line
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
        {/* The brand line (PRD p.11). It replaced "SEBI Regulated ·
            Introduced 2025", which the review struck (p.3). */}
        <Eyebrow>{SITE.name}</Eyebrow>
      </motion.div>

      {/* Masked lines: the type rises from behind its own baseline. Hand-split
          so the serif swap lands where we want it, not where a resize does.
          The swap word is the FIRST of the site's two (the second is in
          ClosingCta) and it opens line 1, so it sits at the head of a line. */}
      <LineReveal
        as="h1"
        delay={CHOREO.headline}
        className="mt-7 text-[clamp(38px,5.4vw,80px)] leading-[1.12] font-medium text-ink"
        lines={[
          <span key="l1">
            <em className="swap">Understand</em> and invest
          </span>,
          "in SIFs with SIF Insight",
        ]}
      />

      <motion.p
        data-reveal=""
        /* 44ch, not wider. At 52ch the longest line ran into the glass
           massing of the banner, where the art drops to luminance 88 and
           the line measured 3.05:1 — under AA. */
        className="mt-8 max-w-[44ch] text-[17px] leading-[30px] text-body"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.standfirst, DUR.reveal)}
      >
        SIF Insight brings India&rsquo;s Specialised Investment Fund ecosystem
        together — connecting AMCs, fund managers, experts and investors on one
        platform. Research, track and compare SIFs, and access expert insights
        to make more informed investment decisions.
      </motion.p>

      <motion.div
        data-reveal=""
        className="mt-12 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.cta, DUR.reveal)}
      >
        {/* No <GlassField>: the banner already gives the glass something to
            frost against. inline-flex is load-bearing — transforms are
            ignored on inline boxes, so a bare <span> would kill the pull. */}
        <Magnetic className="inline-flex">
          <Button href="/sif-tracker" variant="primary">
            Explore SIFs
          </Button>
        </Magnetic>
        <Button href="/learn" variant="ghost">
          Understand SIFs
        </Button>
      </motion.div>

      <motion.div
        data-reveal=""
        className="mt-10"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(CHOREO.trust, DUR.reveal)}
      >
        <TrustLine />
      </motion.div>
    </div>
  );
}

/**
 * The regulatory trust line that closes the hero (PRD p.11): three strong
 * labels, hairline-separated. Text only — no badge art, no seal imagery.
 *
 * text-body/ink, never muted: this row sits on the darkest band of the art,
 * where muted measured 3.58:1. Ink on the same pixels clears AA easily.
 */
function TrustLine() {
  return (
    <ul
      aria-label="Registration"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] leading-[20px]"
    >
      {SITE.trustLine.map((label, i) => (
        <li key={label} className="flex shrink-0 items-center gap-5">
          {i > 0 ? (
            /* Hidden on phones: when the row wraps, a hairline would lead the
               new line and read as an indent. */
            <span aria-hidden="true" className="hidden h-3.5 w-px bg-hairline sm:block" />
          ) : null}
          <strong className="font-semibold text-ink">{label}</strong>
        </li>
      ))}
    </ul>
  );
}
