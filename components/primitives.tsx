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

/** 1240px shell. Gutter 100px desktop, 24px mobile. */
export function Shell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-6 xl:px-0", className)}>
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
 * unchanged. Callers pass `changePct` straight through — never guard here.
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
  if (pct === null) {
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

  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const colour = {
    up: "text-gain",
    down: "text-loss",
    flat: "text-flat",
  }[dir];
  const glyph = { up: "▲", down: "▼", flat: "—" }[dir];
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";

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
        {Math.abs(pct).toFixed(2)}%
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

/** The 5 unlaunched funds. Honest, not hidden, not faked. */
export function PendingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-[12px] text-pending",
        className,
      )}
    >
      Awaiting launch
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
