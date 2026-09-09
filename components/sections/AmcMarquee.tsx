"use client";

import Link from "next/link";
import { AmcMark } from "@/components/AmcMark";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Rule } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { amcs } from "@/lib/data";

/* The two hairline rules do the framing here, so the section runs tighter
   than the 100px rhythm — this is a typographic rule element, not a panel.
   They draw themselves in, which is what keeps the strip from reading as a
   sponsor page bolted onto the layout. */

const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)";

/** Same speed discipline as the NFO ticker — slow enough to read a name. */
const SPEED = 32;

export function AmcMarquee() {
  /* WCAG 2.2.2 (Pause, Stop, Hide). Starts false so the server markup and
     the first client paint agree; the strip moves until the reader says
     otherwise. */
  const [paused, setPaused] = useState(false);
  const { trackRef, trackStyle } = useMarquee(paused);

  return (
    <Section id="amcs" className="py-14">
      <Shell>
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Funds we cover</Eyebrow>

          {/* PAUSE, not hide — the opposite call to <NfoBar>, on purpose.
              NfoBar carries time-boxed announcements, so "Dismiss" is the
              right escape: the reader is done with them. This strip is a
              standing index of the houses we cover and every logo is a live
              link into #strategies, so hiding it would delete 17 links from
              the page — a worse outcome for the keyboard user than the one
              we are fixing. What is hostile here is the MOTION, not the
              presence, so the control stops the motion and leaves the links.

              Placed before the strip in the DOM so it is the tab stop
              immediately ahead of those 17 links: a keyboard user reaches
              the brake before the thing that runs away from them.
              A native <button> answers Enter and Space for free — do not
              swap it for a div with a click handler.

              Kept OUTSIDE `.marquee-host` deliberately: inside it, the
              `:focus-within` rule would pin the track paused while the
              button held focus, so pressing Resume would appear to do
              nothing until focus moved away.

              Hidden under prefers-reduced-motion because the reduced-motion
              block in globals.css already sets `animation: none` on the
              track — a brake for a strip that never moves is noise, and one
              more tab stop for nothing. */}
          <button
            type="button"
            onClick={() => setPaused((wasPaused) => !wasPaused)}
            aria-label={
              paused
                ? "Resume the fund logo strip"
                : "Pause the fund logo strip"
            }
            className="rounded-full border border-hairline px-3 py-1 text-[12px] leading-[18px] text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent-dim hover:text-ink motion-reduce:hidden"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </Shell>

      <div className="mt-7">
        <Rule />

        <div
          className="marquee-host overflow-hidden py-6"
          style={{ maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
        >
          <div ref={trackRef} className="marquee-track" style={trackStyle}>
            {/* Duplicated exactly twice — the -50% keyframe depends on it. */}
            <MarqueeRow />
            <MarqueeRow duplicate />
          </div>
        </div>

        <Rule delay={0.08} />
      </div>
    </Section>
  );
}

function MarqueeRow({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={duplicate || undefined}>
      {amcs.map((amc) => (
        <li key={amc.id} className="shrink-0">
          <Link
            href="#strategies"
            tabIndex={duplicate ? -1 : undefined}
            className="group flex items-center gap-3.5 px-8 py-1"
          >
            {/* The alpha-channel trap and the nine markless houses are both
                handled inside <AmcMark>. `hover` needs the `group` above. */}
            <AmcMark amc={amc} size="md" hover />

            <span className="flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5">
              <span className="text-[14px] leading-[20px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-ink">
                {amc.sifName}
              </span>
              <span className="text-[12px] leading-[16px] text-muted">{amc.name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Drives the CSS marquee from the track's real width, so the strip runs at a
 * fixed px/s no matter how many AMCs are in the data. Also stops it when the
 * strip is off-screen or the tab is backgrounded.
 *
 * `requestedPause` is the reader's explicit choice from the control above.
 * It is a third reason to stop, never a reason to start — see trackStyle.
 */
function useMarquee(requestedPause: boolean) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [offscreen, setOffscreen] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Two copies in the track, so -50% travels one copy's width. Logos load
    // asynchronously, hence the ResizeObserver rather than a single measure.
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

  const trackStyle: CSSProperties = {
    // Pausing cannot disturb this. The duration comes from `scrollWidth`,
    // which is a layout measurement and is identical whether the animation
    // is running or paused, and the ResizeObserver above is what re-measures
    // — so the constant px/s survives any number of pause/resume presses.
    animationDuration: duration ? `${duration}s` : undefined,
    // Never written as "running": an inline value would outrank the
    // `.marquee-host:hover` and `:focus-within` pause rules in globals.css,
    // and a keyboard user's focus pause would silently stop working.
    animationPlayState:
      requestedPause || offscreen || backgrounded ? "paused" : undefined,
  };

  return { trackRef, trackStyle };
}
