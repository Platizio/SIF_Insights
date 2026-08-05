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
  const { trackRef, trackStyle } = useMarquee();

  return (
    <Section id="amcs" className="py-14">
      <Shell>
        <Eyebrow className="text-center">Funds we cover</Eyebrow>
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
 */
function useMarquee() {
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
    animationDuration: duration ? `${duration}s` : undefined,
    // Never written as "running": an inline value would outrank the
    // `.marquee-host:hover` pause rule in globals.css.
    animationPlayState: offscreen || backgrounded ? "paused" : undefined,
  };

  return { trackRef, trackStyle };
}
