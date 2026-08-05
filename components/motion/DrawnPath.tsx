"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { useRevealed } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { EASE, ENTER } from "@/lib/motion";

/**
 * A line that draws itself, mimicking the act of plotting.
 *
 * `pathLength={1}` normalises the maths, so the same code works at any
 * viewBox or breakpoint without recomputing dasharray.
 *
 * Deliberately an eased tween, NOT a spring: overshoot on a data line
 * implies the value was briefly wrong. Springs are for objects; quantities
 * get eased tweens. This is the rule that separates a research house from
 * a trading app.
 *
 * Under reduced motion the line is drawn immediately — the draw is
 * informational, so we keep the result and drop only the animation.
 */
export function DrawnPath({
  d,
  className,
  strokeWidth = 1.5,
  duration = 1.2,
  delay = 0,
}: {
  d: string;
  className?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGPathElement>(null);
  /* A chart holds until it is well onto the screen — a line that draws
     itself half off the fold reads as a glitch, not as plotting. */
  const revealed = useRevealed(ref, ENTER.chart);

  return (
    <motion.path
      ref={ref}
      /* Motion renders pathLength as stroke-dasharray/stroke-dashoffset, and
         both safety nets are [data-reveal]-scoped, so this needs the hook AND
         the nets need the stroke properties (see globals.css). Decorative
         today, but DESIGN_CONTRACT mandates DrawnPath for every NAV and chart
         line, so an undrawn line becomes missing data rather than a missing
         flourish. */
      data-reveal=""
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={cn(className)}
      initial={{ pathLength: reduce ? 1 : 0 }}
      /* Not `whileInView`: a line stuck at pathLength 0 is an invisible
         chart, so useRevealed adds a failsafe. */
      animate={{ pathLength: revealed ? 1 : reduce ? 1 : 0 }}
      transition={{ duration: reduce ? 0 : duration, ease: EASE.out, delay }}
    />
  );
}

/** The endpoint marker, revealed after the line lands. */
export function DrawnDot({
  cx,
  cy,
  r = 3.5,
  delay = 1.0,
  className,
}: {
  cx: number;
  cy: number;
  r?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<SVGCircleElement>(null);
  /* A chart holds until it is well onto the screen — a line that draws
     itself half off the fold reads as a glitch, not as plotting. */
  const revealed = useRevealed(ref, ENTER.chart);

  return (
    <motion.circle
      ref={ref}
      data-reveal=""
      cx={cx}
      cy={cy}
      r={r}
      className={cn("fill-accent", className)}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.3, ease: EASE.outQuart, delay }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    />
  );
}
