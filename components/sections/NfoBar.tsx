"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Shell } from "@/components/primitives";
import { activeNfos } from "@/lib/data";
import { DUR, EASE } from "@/lib/motion";

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

export function NfoBar() {
  const [dismissed, setDismissed] = useState(false);
  const { trackRef, trackStyle, paused } = useMarquee();

  // No open NFOs is a real state, not an error — render nothing rather than
  // an empty strip.
  if (dismissed || activeNfos.length === 0) return null;

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
        <LiveMark paused={paused} />

        <span className="h-3.5 w-px shrink-0 bg-hairline" aria-hidden="true" />

        <div
          className="marquee-host relative min-w-0 flex-1 overflow-hidden"
          style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
        >
          <div ref={trackRef} className="marquee-track" style={trackStyle}>
            <TrackCopy />
            <TrackCopy duplicate />
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
 * The dot breathes, but the mark never depends on that breathing: the
 * keyframes start and end at full opacity, so with animation suppressed —
 * or with the strip off-screen — it settles as a solid accent dot beside
 * the word LIVE. The meaning is carried by the label, not the motion.
 */
function LiveMark({ paused }: { paused: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
        style={{ animationPlayState: paused ? "paused" : undefined }}
      />
      <span className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
        Live NFO
      </span>
    </span>
  );
}

/** One pass of the ticker. The divider trails every item so the seam is invisible. */
function TrackCopy({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
      {activeNfos.map((nfo) => (
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

  return { trackRef, trackStyle, paused };
}
