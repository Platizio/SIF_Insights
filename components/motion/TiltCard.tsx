"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";

/** Max tilt in degrees. 4.5° confirms the card is a liftable object.
    Above ~8° it becomes a toy — wrong register for fund disclosure. */
const MAX_DEG = 4.5;

/**
 * Pointer tilt plus an accent border-follow highlight.
 *
 * High perspective (1400px) gives subtle realism; low perspective is
 * dramatic and cheap. The glow is a wash of the aqua accent, the same hue
 * as the `hover:border-accent-dim` below — on cream paper a white glow is
 * invisible and reads as a rendering bug.
 *
 * The lift is a pseudo-layer's opacity, never an animated box-shadow
 * (which repaints every frame), and it respects the no-shadow rule by
 * using a hairline border shift instead of elevation.
 */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, SPRING.card);
  const sy = useSpring(py, SPRING.card);

  const rotateY = useTransform(sx, [0, 1], [-MAX_DEG, MAX_DEG]);
  const rotateX = useTransform(sy, [0, 1], [MAX_DEG, -MAX_DEG]);

  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  /* Fades to the same hue at zero alpha, not to `transparent` — the keyword
     is rgba(0,0,0,0), so a gradient ending there interpolates toward black
     and washes the card grey instead of dissolving. */
  const glow = useMotionTemplate`radial-gradient(220px circle at ${gx} ${gy}, oklch(0.55 0.10 195 / 0.10), oklch(0.55 0.10 195 / 0) 62%)`;

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  if (reduce) {
    return (
      <div
        className={cn(
          "relative h-full border border-hairline bg-surface",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div style={{ perspective: 1400 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        /* FRAME ONLY — the caller's `className` must NOT land here.
           This element cannot be the caller's layout box because it is not
           the element that parents `children`: the translateZ wrapper below
           sits in between. A caller passing `flex flex-col justify-between`
           would therefore distribute exactly ONE flex item (the wrapper) and
           the real content would stack in normal block flow inside it, so
           every card kept whatever slack the tallest card in its grid row
           created. Measured on `/#strategies`: three 620px-tall cards in one
           row had 33 / 99 / 85px below their disclosure lists, while under
           `prefers-reduced-motion` — the branch above, which puts `className`
           on the content's own parent — all of them measured 33px.
           So: frame and positioning live here, the caller's layout classes go
           on the wrapper, and the two branches lay out identically. */
        /* Written out in full — Tailwind scans source text, so the curve
           cannot be interpolated from a token. `duration-200` is
           --duration-micro; the ease is the site's ONE curve
           (--ease-out-quint / lib/motion EASE). Bare `transition-colors`
           silently ships Tailwind's own cubic-bezier(0.4,0,0.2,1), which is
           a second easing curve on a site whose contract has one. */
        className={cn(
          "group relative h-full border border-hairline bg-surface",
          "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "hover:border-accent-dim",
        )}
      >
        {/* Accent follow-highlight. Opacity only — no repaint cost. */}
        <motion.span
          aria-hidden="true"
          style={{ background: glow }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100"
        />
        {/* translateZ(0) flattens the content onto its own plane inside the
            3D context so text does not shimmer as the card tilts. `relative`
            (no z-index needed — later sibling in the same stacking context)
            keeps it above the absolutely-positioned glow span. `h-full` is
            kept in the base so a caller that passes no height still fills the
            frame; twMerge dedupes it against the caller's own `h-full`. */}
        <div
          style={{ transform: "translateZ(0)" }}
          className={cn("relative h-full", className)}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
