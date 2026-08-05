"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useRevealed } from "@/components/motion/Reveal";
import { DUR, EASE, ENTER } from "@/lib/motion";
import { useIsClient } from "@/lib/use-is-client";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Fixed-slot digit odometer.
 *
 * Each digit is its own column reserving the width of the widest numeral,
 * so the row is rock-steady while the digits move. A naive count-up
 * re-measures text width every frame and the whole metric row jitters —
 * that jitter is what reads as "widget" instead of "system".
 *
 * COMPLIANCE — non-negotiable: this animates ONCE, lands on the real
 * value, and stops. It never loops and never idle-ticks. A figure that
 * keeps moving implies live data, which for SIF disclosure is a real
 * regulatory problem, not a stylistic one. Always pair with an as-of date.
 */
export function Odometer({
  value,
  decimals = 0,
  prefix,
  suffix,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /* Same trigger as every other reveal, so the `amount` trap documented in
     lib/motion cannot reappear here independently. */
  const inView = useRevealed(ref, ENTER.item);
  const reduce = useReducedMotion();

  /**
   * The digit columns exist ONLY after mount.
   *
   * Motion serialises each strip's `initial` transform into the SERVER
   * render, and the strip's resting position is digit 0 — so SSR emitted
   * ₹00,00,000 for ₹10,00,000. That is worse than a missing animation: it
   * ships the wrong number to anyone without JS, and to every crawler.
   * The `data-reveal` noscript guard cannot save it either, since forcing
   * `transform: none` also lands on zero.
   *
   * So the server (and the first client render, keeping hydration
   * identical) emits plain text. The columns swap in on mount and animate.
   * Both states render the same glyphs at the same size, so the swap is
   * invisible.
   */
  const mounted = useIsClient();

  // Indian grouping, so 1000000 reads 10,00,000.
  const formatted = value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const chars = formatted.split("");
  const label = `${prefix ?? ""}${formatted}${suffix ?? ""}`;

  if (!mounted) {
    return (
      <span ref={ref} className={cn("tabular inline-flex items-baseline", className)}>
        {label}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn("tabular inline-flex items-baseline", className)}
      // The accessible value is the real number, announced once and whole.
      role="text"
      aria-label={label}
    >
      {prefix ? <span aria-hidden="true">{prefix}</span> : null}

      {chars.map((c, i) => {
        if (!/\d/.test(c)) {
          return (
            <span key={i} aria-hidden="true">
              {c}
            </span>
          );
        }
        const fromRight = chars.length - 1 - i;
        /* MUST be em, not %. A percentage translate resolves against the
           element's OWN height, and this strip is 10 digits tall — so "-100%"
           scrolls past all ten instead of advancing one. Each digit span is
           exactly 1em, so em is the unit that maps to a single slot. */
        const target = `-${Number(c)}em`;

        return (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block h-[1em] w-[0.62em] overflow-hidden"
            style={{
              WebkitMaskImage:
                "linear-gradient(transparent 0, #000 22%, #000 78%, transparent 100%)",
              maskImage:
                "linear-gradient(transparent 0, #000 22%, #000 78%, transparent 100%)",
            }}
          >
            <motion.span
              className="block will-change-transform"
              /**
               * THE RESTING STATE IS THE TRUE VALUE. The roll is additive.
               *
               * This used to rest at "0em" and animate TO the value, which
               * made the correct number conditional on two runtime services.
               * If the observer never fired, `animate` was undefined; if rAF
               * never ticked, no frame ever ran. Either way every strip sat
               * on its first digit and the card read "Schemes 0" — not a
               * missing animation but a WRONG FIGURE, which on a disclosure
               * page is a different category of defect.
               *
               * Resting on `target` inverts that: the honest value needs no
               * callback, and the count-up is a keyframe that merely departs
               * from zero and returns. Anything that stops the animation now
               * degrades to the right number instead of to zero.
               */
              initial={{ y: target }}
              animate={inView && !reduce ? { y: ["0em", target] } : { y: target }}
              transition={{
                duration: DUR.odometer,
                ease: EASE.outExpo,
                // Units digit leads, leading digit settles last.
                delay: 0.045 * fromRight,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] leading-[1em]">
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}

      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </span>
  );
}
