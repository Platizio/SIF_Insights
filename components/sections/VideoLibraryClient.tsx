"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { ArrowIcon } from "@/components/icons";
import { VideoCard } from "@/components/video/VideoCard";
import { cn } from "@/lib/cn";

/* ============================================================
   The home video carousel — BUTTON-driven.

   Previous / Next move one card at a time; the track translates, the
   page never scrolls sideways and the wheel is never captured (no
   scroll-hijack). A horizontal swipe on touch does the same as the
   buttons — `touch-action: pan-y` hands vertical scrolling back to the
   browser untouched, so a phone reader scrolling past is never trapped.

   Cards per view follow the breakpoint: 1 on phones, 2 from md, 3 from
   lg. The CSS widths do the layout; the matching count below only
   decides how far Next may go. Its server snapshot is 1, so the first
   paint and hydration agree and a wider screen widens after hydration.

   Cards outside the window are `inert` (and so hidden from assistive
   tech and the tab order) — a keyboard user can never focus a card
   the track has clipped away.
   ============================================================ */

export type CarouselVideo = { id: string; title: string; durationSec: number | null };

/** Minimum horizontal travel, px, before a swipe counts. */
const SWIPE_PX = 48;

const QUERIES = ["(min-width: 1024px)", "(min-width: 768px)"] as const;

function subscribe(onChange: () => void): () => void {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function perViewSnapshot(): number {
  if (window.matchMedia(QUERIES[0]).matches) return 3;
  if (window.matchMedia(QUERIES[1]).matches) return 2;
  return 1;
}

export function VideoCarousel({ videos }: { videos: CarouselVideo[] }) {
  const perView = useSyncExternalStore(subscribe, perViewSnapshot, () => 1);
  const [requested, setRequested] = useState(0);
  const swipeFrom = useRef<number | null>(null);

  const total = videos.length;
  const maxIndex = Math.max(0, total - perView);
  /* Clamped at render, not in an effect: a resize from 1-up to 3-up can
     leave the stored index past the new end. */
  const index = Math.min(requested, maxIndex);
  const needsControls = maxIndex > 0;

  const go = (next: number) => setRequested(Math.max(0, Math.min(maxIndex, next)));

  const first = index + 1;
  const last = Math.min(total, index + perView);
  const position =
    first === last ? `Video ${first} of ${total}` : `Videos ${first}–${last} of ${total}`;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipeFrom.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (from === null) return;
    const dx = e.clientX - from;
    if (Math.abs(dx) < SWIPE_PX) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured videos">
      <div
        className="overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        <ul
          className="-mx-2 flex transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          /* Percent of the track's own width, which equals the viewport's —
             each step is exactly one card's basis. */
          style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
        >
          {videos.map((v, i) => {
            const visible = i >= index && i < index + perView;
            return (
              <li
                key={v.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${total}`}
                inert={!visible}
                className="w-full shrink-0 px-2 md:w-1/2 lg:w-1/3"
              >
                <div className="h-full border border-hairline bg-ground">
                  <VideoCard
                    id={v.id}
                    title={v.title}
                    durationSec={v.durationSec}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={cn(
          "mt-8 flex items-center justify-between gap-6",
          !needsControls && "sr-only",
        )}
      >
        <p aria-live="polite" className="tabular text-[15px] leading-[22px] text-muted">
          {position}
        </p>
        {needsControls ? (
          <div className="flex items-center gap-3">
            <NavButton
              label="Previous videos"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              flip
            />
            <NavButton
              label="Next videos"
              disabled={index >= maxIndex}
              onClick={() => go(index + 1)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  flip = false,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent-dim hover:text-accent-dim disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-hairline"
    >
      <ArrowIcon size={16} className={flip ? "rotate-180" : undefined} />
    </button>
  );
}
