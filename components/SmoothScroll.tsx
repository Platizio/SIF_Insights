"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { registerSmoothScroll } from "@/lib/smooth-scroll-control";

/**
 * Scroll smoothing only. No hijacking, no pinning, no scroll-jacked sections.
 * Disabled outright when the user asks for reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      // Matches --ease-out-quint closely enough to feel like one system.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    /* Published so the mobile nav panel can pause it while it is open.
       Stopping Lenis is half of that lock; the CSS half lives in
       SiteHeader. See lib/smooth-scroll-control.ts for why both. */
    const deregister = registerSmoothScroll(lenis);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      deregister();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
