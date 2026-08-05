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
 * Pointer tilt plus a warm border-follow highlight.
 *
 * High perspective (1400px) gives subtle realism; low perspective is
 * dramatic and cheap. The glow is a warm amber wash — on cream paper a
 * white glow is invisible and reads as a rendering bug.
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
        className={cn(
          "group relative border border-hairline bg-surface transition-colors duration-200",
          "hover:border-accent-dim",
          className,
        )}
      >
        {/* Warm follow-highlight. Opacity only — no repaint cost. */}
        <motion.span
          aria-hidden="true"
          style={{ background: glow }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
        <div style={{ transform: "translateZ(0)" }} className="relative h-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
