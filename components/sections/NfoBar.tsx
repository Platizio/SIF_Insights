"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Shell } from "@/components/primitives";
import { activeNfos, isOpenNfo, type Nfo } from "@/lib/data";
import { DUR, EASE } from "@/lib/motion";
import { useIsClient } from "@/lib/use-is-client";

/**
 * Section 0 — the live NFO ticker.
 *
 * Sits above the header, lands first on load, scrolls away with the page and
 * is dismissible. The marquee track is rendered twice so the global -50%
 * translate loops seamlessly.
 */

/** Edge fade so items enter and leave the strip instead of clipping at the gutter. */
const EDGE_FADE =
  "linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)";

/**
 * Ticker speed, px per second.
 *
 * This is the whole register of the component. Anything brisk reads as a
 * trading-floor stock photo; at ~32px/s an entry is actually legible as it
 * crosses, which is the only reason the strip exists.
 */
const SPEED = 32;

/**
 * How often the open set is re-checked against the reader's clock.
 *
 * The trade-off, honestly: `closesOn` has day granularity, so the only moment
 * the answer can change is a date rollover, and a single setTimeout aimed at
 * midnight would be the tidy version of this. It is also the fragile one —
 * background tabs clamp long timers, a sleeping laptop can fire one
 * arbitrarily late, and nothing self-corrects if the system clock moves.
 * Polling costs three string comparisons a minute, bounds the error at 60s,
 * and recovers on its own from all of those. `visibilitychange` closes the
 * last gap: a frozen tab may run no timers at all, so the check is redone the
 * moment the reader looks at it again rather than up to a minute later.
 */
const RECHECK_MS = 60_000;

/**
 * The offers that are open RIGHT NOW, on the reader's clock.
 *
 * `activeNfos` is filtered at build time, so it is only as fresh as the last
 * deploy — and a page left open across midnight would go on asserting a window
 * that shut while it sat there. This narrows that list again on the client.
 *
 * The set can only ever shrink: an expired offer cannot un-expire, so the
 * server's list is always a superset of the client's. That is what keeps the
 * hydration story simple. `useIsClient` is false during SSR and through the
 * first hydrating render, so pass one reproduces the server's markup exactly
 * and any expiry lands on the pass after, as an ordinary update rather than a
 * mismatch. Reading `new Date()` straight into render would instead make the
 * two passes disagree the moment the build list held a just-expired offer.
 */
function useOpenNfos(): Nfo[] {
  const isClient = useIsClient();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const recheck = () => setNow(new Date());
    const id = setInterval(recheck, RECHECK_MS);
    const onVisibility = () => {
      if (!document.hidden) recheck();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return useMemo(
    () => (isClient ? activeNfos.filter((nfo) => isOpenNfo(nfo, now)) : activeNfos),
    [isClient, now],
  );
}

export function NfoBar() {
  const [dismissed, setDismissed] = useState(false);
  const openNfos = useOpenNfos();
  const { trackRef, trackStyle } = useMarquee();

  // No open NFOs is a real state, not an error — render nothing rather than
  // an empty strip. This is also what handles the last offer expiring while
  // the page is open: the whole bar leaves, border and all, instead of
  // becoming an empty bordered rule above the header.
  if (dismissed || openNfos.length === 0) return null;

  return (
    <motion.div
      /* data-reveal so the noscript rule in layout.tsx can undo the
         serialised `initial` when scripting is off. */
      data-reveal=""
      initial={{ y: "-100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DUR.hero, ease: EASE.outQuart, delay: 0.05 }}
      className="border-b border-hairline bg-accent-wash"
    >
      <Shell className="flex h-11 items-center gap-4">
        <LiveMark />

        <span className="h-3.5 w-px shrink-0 bg-hairline" aria-hidden="true" />

        <div
          className="marquee-host relative min-w-0 flex-1 overflow-hidden"
          style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
        >
          <div ref={trackRef} className="marquee-track" style={trackStyle}>
            <TrackCopy items={openNfos} />
            <TrackCopy items={openNfos} duplicate />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcements"
          className="-mr-1.5 shrink-0 rounded-full p-1.5 text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="m1.5 1.5 9 9m0-9-9 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </Shell>
    </motion.div>
  );
}

/**
 * A STATIC accent dot beside the word LIVE.
 *
 * It used to breathe on Tailwind's `animate-pulse`, and the argument for that
 * was always about the dot's meaning rather than about the animation: the
 * keyframes started and ended at full opacity, so the mark never depended on
 * the motion. Which is the point — if the pull-out is that the label carries
 * the meaning, the perpetual animation was carrying nothing.
 *
 * It also cost two things it could not pay for. `animate-pulse` is
 * `2s cubic-bezier(0.4,0,0.6,1) infinite`: neither value exists on the
 * sanctioned scale (lib/motion DUR/EASE, --duration-micro/--ease-out-quint),
 * so it was a third easing curve on a site whose contract has one. And a
 * perpetually animating icon is on the contract's own banned list — it sits
 * above the header on every page, in the reader's periphery, forever.
 *
 * Removing it also removes the `paused` plumbing: `useMarquee` still computes
 * `paused` for the TRACK, which genuinely needs stopping off-screen, but a
 * dot that never moves needs no play-state.
 */
function LiveMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      <span className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
        Live NFO
      </span>
    </span>
  );
}

/**
 * One pass of the ticker. The divider trails every item so the seam is
 * invisible.
 *
 * Takes the list as a prop rather than reading `activeNfos` directly, so both
 * copies are guaranteed to render the same items as each other and as the
 * length check above — the marquee's whole -50% loop depends on the two copies
 * being identical.
 */
function TrackCopy({ items, duplicate = false }: { items: Nfo[]; duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
      {items.map((nfo) => (
        <span key={nfo.id} className="flex items-center">
          <span className="whitespace-nowrap text-[14px] leading-[20px] text-body">
            {nfo.title}
          </span>
          <span className="mx-7 h-3 w-px bg-hairline" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

/**
 * Drives the CSS marquee from the track's real width.
 *
 * A hard-coded duration means the speed changes every time the copy does,
 * which is how tickers end up either unreadable or asleep. Measuring gives
 * one constant px/s across both strips on the page.
 *
 * It also stops the animation when the strip is off-screen or the tab is
 * backgrounded — an invisible ticker is pure wasted compositing.
 */
function useMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [offscreen, setOffscreen] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // The track holds exactly two copies, so the -50% keyframe travels the
    // width of one copy.
    const measure = () => {
      const distance = track.scrollWidth / 2;
      if (distance > 0) setDuration(distance / SPEED);
    };
    measure();

    // This is also the re-measure path when an offer expires mid-session and
    // the item count drops: `.marquee-track` is `width: max-content`, so
    // losing an item shrinks the track's own box and the observer fires. The
    // two-copy invariant survives because both copies render the same list.
    const resize = new ResizeObserver(measure);
    resize.observe(track);

    const view = new IntersectionObserver(
      (entries) => setOffscreen(!entries[0].isIntersecting),
      { rootMargin: "100px" },
    );
    view.observe(track);

    const onVisibility = () => setBackgrounded(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      resize.disconnect();
      view.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const paused = offscreen || backgrounded;

  const trackStyle: CSSProperties = {
    animationDuration: duration ? `${duration}s` : undefined,
    // Only ever written when paused. Leaving it unset while running lets the
    // `.marquee-host:hover` rule in globals.css keep pausing on hover — an
    // inline "running" would outrank it.
    animationPlayState: paused ? "paused" : undefined,
  };

  // `paused` stays internal — it is the TRACK's concern. Nothing else on the
  // strip animates, so nothing else needs it.
  return { trackRef, trackStyle };
}
