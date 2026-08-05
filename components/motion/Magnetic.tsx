"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { SPRING } from "@/lib/motion";

/**
 * Magnetic pull toward the pointer.
 *
 * Chosen over a custom cursor deliberately: replacing the OS pointer reads
 * as "agency portfolio" and costs credibility with an investor audience.
 * This gives the same craft signal invisibly.
 *
 * The detail that makes it feel physical is the inner label moving at
 * 0.45x the shell's displacement — a parallax between container and text.
 * Without it, the button just slides.
 *
 * Disabled entirely on coarse pointers and under reduced motion.
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
  const lx = useTransform(x, (v) => v * 0.45);
  const ly = useTransform(y, (v) => v * 0.45);

  if (reduce) return <span className={className}>{children}</span>;

  const clamp = (v: number) => Math.max(-cap, Math.min(cap, v));

  const onMove = (e: React.PointerEvent) => {
    // Coarse pointers (touch) fire pointermove on tap — ignore them.
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
    my.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x, y }}
      className={className}
    >
      <motion.span style={{ x: lx, y: ly }} className="block">
        {children}
      </motion.span>
    </motion.span>
  );
}
