"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { useRevealed } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { ENTER, ruleDraw } from "@/lib/motion";

/**
 * A horizontal bar — AUM by strategy, share of the market, a count.
 *
 * REVEAL-SAFE BY CONSTRUCTION. The bar's LENGTH is its CSS width, set once
 * from the data; the ANIMATION is a scaleX 0 → 1 on top of it. The two
 * are kept separate because the safety nets reset `transform` to none: if
 * the length were itself a scaleX, a reader with JS off (or a dead frame
 * loop) would see every bar at 100% — a chart that silently claims every
 * value is the maximum. This way the fallback is the true bar, merely
 * undrawn. Transform only while moving, never `width`, per the motion
 * rules; `data-reveal` so both nets can find it.
 *
 * Decorative (`aria-hidden`). The caller prints the value beside it —
 * a bar is never the only place a number exists.
 *
 * THE FACE-VALUE TRAP APPLIES. Bar length is a cross-row comparison, so
 * never feed it absolute NAV: two schemes are priced off ~₹1,000 and the
 * rest off ~₹10. AUM, counts and percentages only.
 */

/* Literal class strings — Tailwind scans source text. */
const TONES = {
  accent: "bg-accent",
  ink: "bg-ink",
  "series-3": "bg-series-3",
  "series-4": "bg-series-4",
} as const;

export function HBar({
  value,
  max,
  tone = "accent",
  delay = 0,
  className,
}: {
  value: number;
  /** The value that fills the track — usually the largest in the set. */
  max: number;
  tone?: keyof typeof TONES;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref, ENTER.chart);

  /* A non-finite or non-positive input draws an empty track rather than a
     guessed bar. The caller's printed value says what is missing. */
  const fraction =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.min(1, Math.max(0, value / max))
      : 0;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("h-2 w-full bg-surface-2", className)}
    >
      <motion.div
        data-reveal=""
        className={cn("h-full origin-left", TONES[tone])}
        style={{ width: `${fraction * 100}%` }}
        variants={ruleDraw}
        initial="hidden"
        animate={revealed ? "show" : "hidden"}
        transition={{ delay }}
      />
    </div>
  );
}
