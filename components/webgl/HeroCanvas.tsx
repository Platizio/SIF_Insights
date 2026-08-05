"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Never in the initial bundle. */
const YieldSurface = dynamic(() => import("./YieldSurface"), {
  ssr: false,
  loading: () => null,
});

/**
 * Poster-first mounting.
 *
 * A static CSS field renders in SSR and owns first paint, so LCP is never
 * affected by WebGL. The canvas mounts on top only once it is in view, the
 * main thread is idle, and the device looks capable — then cross-fades in.
 *
 * Under reduced motion the canvas still mounts but FROZEN at a hand-picked
 * seed. Freezing beats removing: the user gets the identical visual identity
 * with zero motion, rather than a visibly lesser page.
 */
export function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Cheap capability gates — skip WebGL on low-core and data-saver devices.
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if ((navigator.hardwareConcurrency ?? 8) < 4) return;
    if (nav.connection?.saveData) return;
    if ((nav.deviceMemory ?? 8) < 4) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const idle =
          window.requestIdleCallback ??
          ((cb: IdleRequestCallback) => window.setTimeout(() => cb({} as IdleDeadline), 400));
        idle(() => setReady(true), { timeout: 1200 });
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Poster: owns first paint, and remains the fallback if WebGL never mounts. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            // Fade to the same hue at zero alpha, never to `transparent` —
            // that keyword is rgba(0,0,0,0), so the ramp runs toward black and
            // leaves a grey cast over the paper instead of dissolving.
            "radial-gradient(120% 90% at 70% 20%, oklch(0.955 0.022 195 / 0.55), oklch(0.955 0.022 195 / 0) 60%), radial-gradient(90% 80% at 20% 80%, oklch(0.95 0.02 85 / 0.6), oklch(0.95 0.02 85 / 0) 65%)",
        }}
      />
      {ready ? (
        <div className="absolute inset-0 animate-[fadeCanvas_900ms_ease-out_forwards] opacity-0">
          <YieldSurface frozen={!!reduce} />
        </div>
      ) : null}
    </div>
  );
}
