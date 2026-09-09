"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { rise as reveal, stagger } from "@/lib/motion";
import { useRevealed } from "@/components/motion/Reveal";

/* Reveal/Stagger/StaggerItem below are the revision-1 wrappers, kept so
   existing sections keep compiling. New work should use the richer set in
   components/motion/Reveal.tsx (Rise, Group, Rule, Wipe, Parallax). */

/* ============================================================
   Layout
   ============================================================ */

/**
 * Full-bleed shell. Gutter only — no max width.
 *
 * This was a centred 1240px column, which on a 1920px display left 340px of
 * dead paper down each side and made a 16:9 screen read as a narrow strip of
 * content floating in a margin. The shell now runs edge to edge and the
 * gutter grows with the viewport instead.
 *
 * WIDTH IS NOT MEASURE. Going full-bleed widens the CONTAINER; it must never
 * widen a paragraph, because a 200-character line is unreadable however much
 * room there is for it. Every body block keeps its own ch-based cap (there
 * are 48 of them across the site) and those caps are what still decide how
 * long a line gets. What actually gains from the extra width is the dense
 * material: the tracker table, the card grids, the NAV board.
 */
export function Shell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        /* Capped at 2400px and centred. Edge-to-edge is right for a 16:9
           display; on a 3440px ultrawide it would stretch a table past the
           point the eye can track a row across, so the gutter takes over
           beyond the cap. */
        "mx-auto w-full max-w-[2400px] px-6 md:px-10 lg:px-14 xl:px-20 2xl:px-24",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section rhythm constant: 100px 0. No exceptions. */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-[100px]", className)}>
      {children}
    </section>
  );
}

/* ============================================================
   Motion wrappers
   ============================================================ */

/** Staggers children 100ms apart in reading order. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const staggerRef = useRef<HTMLDivElement>(null);
  const staggerRevealed = useRevealed(staggerRef);
  return (
    <motion.div
      ref={staggerRef}
      data-reveal=""
      className={className}
      variants={stagger}
      initial="hidden"
      /* "show", not "visible". Every variant in lib/motion defines exactly
         hidden/show, and Motion resolves a string label as a plain key
         lookup with no fallback — an unknown label makes the child's
         animation a no-op, so <StaggerItem> stayed at opacity 0 forever on a
         perfectly healthy browser. Same family as the unreachable threshold
         in useRevealed: an unreachable LABEL rather than an unreachable
         amount, and the safety nets cannot see it because nothing is broken
         at runtime. */
      animate={staggerRevealed ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

/** A child of <Stagger>. Inherits the parent's timing. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div data-reveal="" className={className} variants={reveal}>
      {children}
    </motion.div>
  );
}

/* ============================================================
   Type
   ============================================================ */

/** Eyebrow precedes every section heading. 12px, uppercase, +0.08em, accent. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent",
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ============================================================
   Buttons — radius 999px means interactive. Always.
   The arrow slides on X; reveals move on Y.
   ============================================================ */

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "inverse";
  className?: string;
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
}: ButtonProps) {
  /* Tinted translucent glass. Text colours are picked for contrast against
     the tint over warm paper, not for brand tidiness — accent-dim on the
     primary tint, ink on the near-clear ghost. */
  const styles = {
    primary: "glass glass-primary text-accent-dim",
    ghost: "glass glass-ghost text-ink",
    inverse: "glass glass-inverse text-ground",
  }[variant];

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium",
        "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        styles,
        className,
      )}
    >
      <span>{children}</span>
      <Arrow />
    </Link>
  );
}

function Arrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
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

/* ============================================================
   Data display
   ============================================================ */

/**
 * Gain/loss is never colour alone — always paired with ▲/▼ and a sign.
 *
 * `pct` stays nullable for the scheme that has only one published NAV: with
 * no prior close there is no move to state. That renders as an explicit
 * "No prior close" rather than as 0.00%, which would claim the fund was
 * unchanged. Callers pass `changePct` straight through — never guard here,
 * which is also why a non-finite `pct` (a NaN out of a division by a zero or
 * absent prior close) takes the same branch: "no move can be stated" is the
 * honest reading of it, and it is the one thing this component must never
 * render as a figure. It used to print "NaN%".
 */
export function Delta({
  pct,
  className,
  size = "sm",
}: {
  pct: number | null;
  className?: string;
  size?: "sm" | "lg";
}) {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted",
          size === "lg" ? "text-[17px]" : "text-[13px]",
          className,
        )}
        title="Only one published NAV is held for this scheme, so there is no prior close to measure a move against."
      >
        <span aria-hidden="true">—</span>
        <span>No prior close</span>
      </span>
    );
  }

  /**
   * ONE rounded value decides direction, sign AND digits.
   *
   * They used to be derived separately — direction and sign from the raw
   * `pct`, the digits from `Math.abs(pct).toFixed(2)` — so any move in
   * 0 < |pct| < 0.005 rendered as "▼ −0.00%": a loss glyph, a minus sign and
   * a zero magnitude, all at once. Rounding first makes the three agree by
   * construction, because there is only one number left to read.
   *
   * `-0` survives this correctly and is why the comparisons are written
   * against 0 rather than as a sign test: `(-0) > 0` and `(-0) < 0` are both
   * false, so a negative zero takes the flat branch, and `Math.abs` erases
   * the sign before it can reach the digits. (-0.004).toFixed(2) is "-0.00",
   * which Number() reads back as exactly that -0.
   */
  const shown = Number(pct.toFixed(2));
  const dir = shown > 0 ? "up" : shown < 0 ? "down" : "flat";
  const colour = {
    up: "text-gain",
    down: "text-loss",
    flat: "text-flat",
  }[dir];
  const glyph = { up: "▲", down: "▼", flat: "—" }[dir];
  const sign = { up: "+", down: "−", flat: "" }[dir];

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1.5 font-medium",
        size === "lg" ? "text-[17px]" : "text-[13px]",
        colour,
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.7em]">
        {glyph}
      </span>
      <span>
        {sign}
        {Math.abs(shown).toFixed(2)}%
      </span>
    </span>
  );
}

/**
 * Risk band carries its number, not just a ramp colour.
 *
 * `band` is nullable: AMFI's NAV feed carries no risk band, so schemes whose
 * disclosures we have not researched show that plainly instead of defaulting
 * to a middle value and implying we know it.
 */
export function RiskBand({
  band,
  className,
}: {
  band: number | null;
  className?: string;
}) {
  if (band === null) {
    return (
      <span className={cn("text-[13px] text-muted", className)}>
        Not captured
      </span>
    );
  }

  const colour = [
    "bg-risk-1",
    "bg-risk-2",
    "bg-risk-3",
    "bg-risk-4",
    "bg-risk-5",
  ][band - 1];

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`Risk Band ${band} of 5`}
    >
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-3 rounded-full",
              i <= band ? colour : "bg-hairline",
            )}
          />
        ))}
      </span>
      <span className="tabular text-[13px] text-muted">Band {band}</span>
    </span>
  );
}

/**
 * What stands in for a NAV that is not in the current AMFI file.
 *
 * It said "Awaiting launch", and asserted more than anyone knows. Every
 * NAV-side caller reaches this through `getNav()`, which returns `pending`
 * for any scheme whose NAV is non-finite — absent from the file, unparseable,
 * suspended, whatever. "Not launched" is one possible cause among several,
 * and it is the one thing the feed cannot tell us. The wording now states the
 * observation instead, matching how the same absence is worded in prose
 * everywhere else on the site ("No NAV for this scheme in the current AMFI
 * file", app/strategies/[category]/page.tsx; "No NAV for this scheme in the
 * AMFI file dated …", app/amc/[id]/page.tsx; "No net asset value is held for
 * this scheme", app/nav-tracker/NavExplorer.tsx).
 *
 * The old docstring also said "the 5 unlaunched funds". There are currently
 * none: all 30 schemes carry a NAV, so on the NAV surfaces this badge is
 * unreachable against today's feed and exists for the day that changes.
 *
 * Two callers use it for a different absence — a CATEGORY with no schemes at
 * all (app/strategies/page.tsx, app/what-is-sif/page.tsx, both of which pair
 * it with their own "Launching soon" / "No debt SIF has launched yet" copy).
 * The new wording is still true there — nothing has filed a NAV for an empty
 * category — but that copy, not this badge, is what carries the launch claim.
 */
export function PendingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-[12px] text-pending",
        className,
      )}
      /* Deliberately says "in the current AMFI file" and not "for this
         scheme": the two category callers below hang this off a category,
         not a scheme, and the sentence has to stay true in both. */
      title="No NAV in the current AMFI file."
    >
      No NAV filed
    </span>
  );
}

/** Content cards are sharp-cornered. Elevation is surface + hairline, never shadow. */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-hairline bg-surface", className)}>
      {children}
    </div>
  );
}
