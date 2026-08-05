"use client";

import { useEffect } from "react";

const FORCED = "reveals-forced";

/**
 * Last-resort net: force every reveal visible if the machinery they depend on
 * turns out to be dead.
 *
 * A reveal needs two runtime services, and each can fail independently:
 *
 *   1. requestAnimationFrame. Motion drives all animation from it. When it
 *      does not tick, a `motion` element stays pinned at its `initial`
 *      variant permanently. Ours is `opacity: 0`, so the page is blank while
 *      the DOM is fully populated.
 *
 *   2. IntersectionObserver. If callbacks never arrive, nothing is ever
 *      marked in-view.
 *
 * Neither can be rescued from JavaScript that itself waits on them, which is
 * why the escape hatch is a CSS class (`html.reveals-forced` in globals.css).
 * CSS needs no frames and no observer.
 *
 * ONLY JUDGE A VISIBLE DOCUMENT — this is the whole subtlety. A backgrounded
 * tab suspends rAF and skips the rendering steps that deliver observer
 * callbacks, while timers keep firing. Watching only those two services, that
 * is indistinguishable from a dead renderer, yet it is a perfectly healthy
 * state. Judging it would cost the entire animation design: open the site in
 * a background tab — middle-click a link, restore a multi-tab session — and
 * every reveal gets stamped to its end state before the reader ever looks,
 * for the rest of that page's life. So the probe runs only while the document
 * is visible, re-arms on visibilitychange, and (because a tab can be
 * backgrounded mid-probe) clears the class again if a frame later ticks.
 *
 * PROBE, DO NOT ASSUME. The class is stamped only once a service has
 * demonstrably failed in a document that was actually being rendered.
 *
 * It is NOT a substitute for correct thresholds or correct variant labels —
 * see the ENTER note in lib/motion. A reveal that cannot fire is a bug to fix
 * at the source; this only stops such a bug from showing an empty page.
 */
export function RevealGuard() {
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let io: IntersectionObserver | undefined;

    const teardown = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      io?.disconnect();
      raf = 0;
      timer = undefined;
      io = undefined;
    };

    const probe = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      teardown();

      let frameTicked = false;
      let observerFired = false;

      raf = requestAnimationFrame(() => {
        frameTicked = true;
        /* A frame proves the loop is alive. If an earlier run misjudged a tab
           that was backgrounded mid-probe, undo it now — the CSS uses
           !important, so leaving the class on would silently disable the
           whole reveal system for the rest of the session. */
        document.documentElement.classList.remove(FORCED);
      });

      /* documentElement always intersects a rendered viewport, so a healthy
         observer fires on its first delivery. */
      io = new IntersectionObserver(() => {
        observerFired = true;
      });
      io.observe(document.documentElement);

      /* ~36 frames of slack at 60Hz, so a merely slow first paint is never
         mistaken for a dead service. */
      timer = setTimeout(() => {
        if (cancelled) return;
        /* Backgrounded while we waited: this run proves nothing. Discard it
           and let visibilitychange start a fresh one. */
        if (document.visibilityState !== "visible") return;
        if (!frameTicked || !observerFired) {
          document.documentElement.classList.add(FORCED);
        }
        io?.disconnect();
      }, 600);
    };

    probe();
    document.addEventListener("visibilitychange", probe);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", probe);
      teardown();
    };
  }, []);

  return null;
}
