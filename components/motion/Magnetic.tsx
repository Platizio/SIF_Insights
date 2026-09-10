"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";
import { SPRING } from "@/lib/motion";

/**
 * Magnetic pull toward the pointer.
 *
 * Chosen over a custom cursor deliberately: replacing the OS pointer reads
 * as "agency portfolio" and costs credibility with an investor audience.
 * This gives the same craft signal invisibly.
 *
 * Disabled entirely on coarse pointers and under reduced motion.
 *
 * THE TWO PROPS MEAN WHAT THEY SAY, and both of them stopped meaning it once:
 *
 * · There used to be an inner span translating at 0.45x the shell "for a
 *   parallax between container and text". There was no parallax. The entire
 *   visible control is a DESCENDANT of that span, so both transforms compose
 *   on the same pixels and nothing moves relative to anything — the only
 *   effect was that the control travelled 1.45x the clamped offset. Measured
 *   on `/`: shell 10.00px against `cap = 10`, visible control 14.50px. The
 *   wrapper is gone rather than fixed, because it cannot be fixed HERE: a
 *   real differential needs the label to be a SIBLING of the pill it lags
 *   behind, and this component is handed one opaque `children` and has no
 *   idea which part of it is which. If that effect is wanted, it belongs at
 *   a call site that owns both halves.
 *
 * · The rect used to be read on every pointermove — from the shell, which is
 *   the element already carrying the translation. So each sample measured a
 *   centre that the previous sample had moved, and the offset converged to
 *   the fixed point of `o = (d - o) * strength`, i.e. `strength / (1 +
 *   strength)` = 0.219 rather than the 0.28 asked for. The geometry is now
 *   captured once, on `pointerenter`, with the live translation subtracted
 *   back out — so `centre` is the LAYOUT centre however far the spring
 *   happens to have travelled when the pointer arrives, and `strength` is
 *   literal. (One consequence, taken knowingly: the cache does not follow the
 *   page if it scrolls while the pointer sits still on the control. That
 *   costs a slightly stale pull for one hover and nothing else; re-reading
 *   layout every frame to avoid it is the more expensive mistake.)
 */
export function Magnetic({
  children,
  strength = 0.28,
  cap = 10,
  className,
}: {
  children: ReactNode;
  strength?: number;
  cap?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, SPRING.cursor);
  const y = useSpring(my, SPRING.cursor);

  /** Untransformed viewport centre of the shell, captured on entry. */
  const centre = useRef<{ x: number; y: number } | null>(null);

  if (reduce) return <span className={className}>{children}</span>;

  const clamp = (v: number) => Math.max(-cap, Math.min(cap, v));

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* getBoundingClientRect() reports the TRANSFORMED border box, and this is
       the transformed element — so subtract what the spring is currently
       applying to get back to where the shell actually sits in layout. */
    centre.current = {
      x: r.left + r.width / 2 - x.get(),
      y: r.top + r.height / 2 - y.get(),
    };
  };

  const onEnter = (e: React.PointerEvent) => {
    // Coarse pointers (touch) fire enter/move on tap — ignore them.
    if (e.pointerType !== "mouse") return;
    measure();
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    // A pointer already inside the shell at mount gets no pointerenter.
    if (!centre.current) measure();
    const c = centre.current;
    if (!c) return;
    // Clamped on the composed offset, which is now the ONLY offset: whatever
    // this pair reaches is exactly what the control travels.
    mx.set(clamp((e.clientX - c.x) * strength));
    my.set(clamp((e.clientY - c.y) * strength));
  };

  const reset = () => {
    centre.current = null;
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.span
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
