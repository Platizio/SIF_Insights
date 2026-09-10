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
   *
   * BOTH STATES MUST MEASURE THE SAME WIDTH, and that does not happen for
   * free — the swap used to move the layout. Measured on `/`, the `30 of 30`
   * odometer was 62.41px as text and 55.09px once the columns mounted, and
   * the label beside it jumped 6.11px left at hydration. Two independent
   * causes, both fixed below and both easy to reintroduce:
   *
   *   (a) the host is `inline-flex`, so prefix and suffix each become their
   *       OWN flex item and the leading space of a suffix like " of 30" is
   *       collapsed as leading white space on that item's line. In the plain
   *       text branch the whole label is one text node and the space
   *       survives. Hence `whitespace-pre` on the affix spans — worth ~7.8px
   *       here, i.e. almost all of the jump.
   *   (b) each digit slot was pinned to a hand-picked `w-[0.62em]` while the
   *       mono face's tabular advance is 0.60em, so every digit was 0.02em
   *       too wide. Slots are now sized from the FONT (`1ch`, the advance of
   *       "0", with tabular figures guaranteeing every digit matches it),
   *       which cannot drift when the type does.
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
    <span ref={ref} className={cn("tabular inline-flex items-baseline", className)}>
      {/**
       * The value as ONE real text node, and the only copy of it a machine
       * ever sees. This replaced `role="text" aria-label={label}` on the host.
       *
       * `text` is a WebKit-only non-ARIA role: everywhere else it maps to
       * `generic`, and `aria-label` is spec-prohibited on `generic`. Chromium
       * happens to compute the right name anyway, so that was fragile rather
       * than broken — a name that depended on one engine ignoring the spec.
       * Real text in the tree needs no such indulgence.
       *
       * It also fixes two things an aria-label never could, because neither
       * find-in-page nor the clipboard reads the accessibility tree: searching
       * the page for the figure now matches, and copying the row yields
       * "₹10,00,000" instead of the digit strips' "₹ 0 1 2 3 4 5 6 7 8 9 …".
       * The strips are `select-none` so they contribute nothing to a copy;
       * this span is out of flow (`sr-only` is absolutely positioned), so it
       * contributes nothing to the width either.
       */}
      <span className="sr-only">{label}</span>

      {/* Everything visible is decoration over that text: one `aria-hidden`
          subtree, so the figure is announced exactly once. */}
      <span aria-hidden="true" className="inline-flex select-none items-baseline">
        {/* `whitespace-pre`: see (a) in the note above — without it a flex
            item's leading space is collapsed and the row reflows on mount. */}
        {prefix ? <span className="whitespace-pre">{prefix}</span> : null}

        {chars.map((c, i) => {
          if (!/\d/.test(c)) {
            return <span key={i}>{c}</span>;
          }
          const fromRight = chars.length - 1 - i;
          /* MUST be em, not %. A percentage translate resolves against the
             element's OWN height, and this strip is 10 digits tall — so "-100%"
             scrolls past all ten instead of advancing one. Each digit span is
             exactly 1em, so em is the unit that maps to a single slot.
             (Height only. The WIDTH below is `ch`, for the reason in (b).) */
          const target = `-${Number(c)}em`;

          return (
            <span
              key={i}
              /* `w-[1ch]` = the advance of "0" in the inherited face, which
                 `.tabular` has already pinned to `font-variant-numeric:
                 tabular-nums` — so every digit occupies exactly this box and
                 the slot matches the plain-text branch glyph for glyph. The
                 previous hand-tuned `w-[0.62em]` was 0.02em per digit wider
                 than the real advance, which is half of the hydration reflow
                 and would have to be re-tuned by hand on any type change. */
              className="inline-block h-[1em] w-[1ch] overflow-hidden [font-variant-numeric:tabular-nums]"
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

        {suffix ? <span className="whitespace-pre">{suffix}</span> : null}
      </span>
    </span>
  );
}
