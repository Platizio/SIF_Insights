"use client";

import { motion } from "motion/react";
import { createElement, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ENTER, lineGroup, lineInner } from "@/lib/motion";
import { useRevealed } from "@/components/motion/Reveal";

/**
 * Masked line reveal — the single highest-leverage swap away from fade-up.
 * Each line sits in an overflow-hidden box and translates from y:100%,
 * so the text rises from behind its own baseline like set type.
 *
 * Pass lines pre-split. We do NOT auto-split at runtime: a resize-driven
 * re-split causes layout thrash, and hand-split lines let us control where
 * the headline breaks (which matters — the serif word must land deliberately).
 *
 * ACCESSIBILITY: the visible text is inside real heading tags. The mask is
 * purely visual. With JS off, `data-reveal` + the noscript rule in layout
 * forces the inner spans back to y:0.
 */
export function LineReveal({
  lines,
  as: Tag = "h2",
  className,
  lineClassName,
  delay = 0,
}: {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /* Headlines wait slightly longer than body blocks, so the type lands
     once it is properly on screen rather than clipping in at the fold. */
  const revealed = useRevealed(ref, ENTER.lines);

  // createElement rather than <Tag> — a polymorphic JSX tag loses children
  // inference and TS resolves the children prop to `never`.
  return createElement(
    Tag,
    { className },
    <motion.span
      ref={ref}
      data-reveal=""
      className="block"
      variants={lineGroup}
      initial="hidden"
      /* Not `whileInView`: a headline must not depend on an observer that
         can silently never fire. useRevealed adds a failsafe. */
      animate={revealed ? "show" : "hidden"}
      transition={{ delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className="block overflow-hidden"
          /* Slack so descenders (g, y, p) don't clip against the mask edge. */
          style={{ paddingBottom: "0.08em", marginBottom: "-0.08em" }}
        >
          {/* data-reveal on the INNER span too, not just the group above.
              The mask hides this element by translating it 100% down, and
              both safety nets (noscript, html.reveals-forced) reset
              transform only on [data-reveal]. Without this attribute the
              nets rescue the wrapper while the type stays pushed out of
              its own overflow-hidden box — a headline-shaped hole. */}
          <motion.span
            data-reveal=""
            variants={lineInner}
            className={cn("block will-change-transform", lineClassName)}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>,
  );
}
