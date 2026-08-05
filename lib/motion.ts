import type { Variants } from "motion/react";

/* ============================================================
   MOTION TOKENS — revision 2

   Derived from forensics on the reference site plus the premium-finance
   motion playbook. The old system (one curve, 700ms, y32 fade-up on
   everything) read as functional rather than authored. This one is
   built around masked reveals, drawn rules and data motion.
   ============================================================ */

export const EASE = {
  /** Editorial reveal curve. The workhorse. */
  out: [0.22, 1, 0.36, 1],
  /** Big travel — hero choreography, image wipes. */
  outExpo: [0.16, 1, 0.3, 1],
  /** UI state — popovers, tabs, accordions. */
  outQuart: [0.25, 1, 0.5, 1],
  /** Scrubbed / pinned sections. */
  inOut: [0.76, 0, 0.24, 1],
} as const;

export const DUR = {
  micro: 0.14, // hover, press, focus
  ui: 0.26, // nav, tab, popover
  reveal: 0.72, // cards entering
  line: 0.85, // masked text lines
  wipe: 0.95, // clip-path image reveals
  rule: 0.7, // hairline draws
  hero: 1.1, // first-paint choreography
  odometer: 1.4, // digit roll
} as const;

/** Linear's rule: exits are faster than entrances. */
export const EXIT = 0.15;

export const SPRING = {
  /** Magnetic elements and pointer follow. */
  cursor: { stiffness: 220, damping: 28, mass: 0.6 },
  /** Card tilt. Objects may spring; quantities may not. */
  card: { stiffness: 150, damping: 20, mass: 0.8 },
} as const;

/* ============================================================
   Variants
   ============================================================ */

/**
 * The masked line reveal. Travel is 100% of the line box, so the text
 * emerges from behind its own baseline rather than drifting through
 * empty space. No opacity on the inner span — the mask does the work;
 * adding opacity makes it mushy.
 */
export const lineInner: Variants = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: { duration: DUR.line, ease: EASE.out } },
};

/**
 * `inherit: true` on every `show` transition below is load-bearing, not
 * decoration.
 *
 * Motion resolves an element's `transition` PROP only as a fallback: in
 * animateTarget, `transition = variantTransition ? resolveTransition(...) :
 * props.transition`. Since each variant here carries its own transition, the
 * prop was being discarded outright — so every `delay` we pass at a call site
 * was inert. Rows had no cascade, staggered blocks landed in one frame, and
 * the choreography read as a single simultaneous pop.
 *
 * `inherit: true` makes resolveTransition shallow-merge the prop underneath
 * the variant (variant keys win, so duration and ease are still owned here),
 * which lets `delay` through and nothing else.
 */
export const lineGroup: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05, inherit: true },
  },
};

/**
 * Block reveal for cards and panels. Deliberately small travel —
 * 8–14px reads as arrival; 32px reads as "generic fade-up".
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.reveal, ease: EASE.out, inherit: true },
  },
};

/** Table rows: 8px only. Big travel on a ledger looks like a slot machine. */
export const row: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE.outQuart, inherit: true },
  },
};

/** Hairline rule draw. transform only — never width. */
export const ruleDraw: Variants = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: { duration: DUR.rule, ease: EASE.outQuart, inherit: true },
  },
};

/** Clip-path image wipe. The frame opens; the image settles. */
export const wipe: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  show: {
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: DUR.wipe, ease: EASE.outExpo, inherit: true },
  },
};

export const wipeInner: Variants = {
  hidden: { y: "8%", scale: 1.06 },
  show: {
    y: "0%",
    scale: 1,
    transition: { duration: DUR.wipe, ease: EASE.outExpo },
  },
};

/** Cap stagger near 10 items — beyond that it reads as lag, not choreography. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Origin-anchored UI. Set transformOrigin from the trigger. */
export const popover: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE.outQuart },
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: EXIT } },
};

/* ============================================================
   Reveal entry lines — percentages of the VIEWPORT, never of the element.

   These are bottom root-margins: "fire once the element's top edge has
   passed this far up the screen". They replaced a pair of IntersectionObserver
   `amount` fractions (0.35 and 0.5), which were a trap.

   `amount` is a fraction of the ELEMENT. Any element taller than
   1 / amount viewports can never satisfy it — the browser physically cannot
   show 35% of it at once — so the observer never fires and the block stays
   at opacity 0 forever. That blanked the AMC index: a 3319px grid of house
   cards in a 720px viewport tops out at 22% visible.

   A root-margin has no such ceiling: it is reachable at any element height.
   Prefer these over adding a new `amount` anywhere.
   ============================================================ */
export const ENTER = {
  /** Hairlines and rules — draw on arrival. */
  rule: 2,
  /** Table bodies — start the cascade as the first rows clear the fold. */
  rows: 4,
  /** List items and framed images. */
  item: 8,
  /** Default for blocks and stagger containers. */
  block: 12,
  /** Headlines — land once the type is properly on screen. */
  lines: 18,
  /** Charts — a line drawing itself at the fold reads as a glitch. */
  chart: 25,
} as const;

/* ============================================================
   Parallax rate ladder — substrate only, never content.
   Body copy, tables and charts are ALWAYS 0.
   ============================================================ */
export const PARALLAX = {
  substrate: 0.06,
  watermark: 0.12,
  framedImage: 0.18,
  card: 0.03,
  content: 0,
} as const;
