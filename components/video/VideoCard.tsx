"use client";

import { useRef, useState } from "react";
import { ArrowIcon, PlayIcon } from "@/components/icons";
import { Wipe } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { VideoDialog } from "@/components/video/VideoDialog";
import { cn } from "@/lib/cn";

/**
 * One video: thumbnail, title, optional duration, and TWO actions —
 * watch here (the on-site player, see VideoDialog) or on YouTube.
 *
 * The thumbnail IS the "Watch here" button, with the words printed on it,
 * so the big target and the explicit label are one control rather than two
 * tab stops doing the same thing. "Watch on YouTube" is a separate, real
 * link — the reader who would rather not load a player here, or who wants
 * the channel, gets there without one.
 *
 * Props are plain and serialisable ({ id, title, durationSec }) so a server
 * component can hand them straight over from lib/content.
 *
 * Visual language carried over from the /media card this replaces: the
 * Wipe reveal, the tilt frame, the grey-to-colour still and the dark chip
 * carrying the play mark — which now also carries the words.
 */

export type VideoCardProps = {
  id: string;
  title: string;
  /** Null until the duration has been read off YouTube; omitted from the card. */
  durationSec?: number | null;
  /** The lead card of a grid gets a larger title. */
  lead?: boolean;
  /** `sizes` for the thumbnail — pass the grid's real rendered widths. */
  sizes?: string;
};

/** 754 → "12:34", 3723 → "1:02:03". */
function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** ISO-8601 duration for <time dateTime>. */
function isoDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s}S`;
}

export function VideoCard({
  id,
  title,
  durationSec = null,
  lead = false,
  sizes = "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: VideoCardProps) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  /* A duration we do not hold is simply not printed — never "0:00". */
  const seconds =
    typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec > 0
      ? durationSec
      : null;

  return (
    <>
      <TiltCard className="flex h-full flex-col">
        <Wipe>
          {/* The focus ring is inset: <Wipe> clips its overflow, so an
              outline drawn outside this button would be cut off entirely. */}
          <button
            ref={opener}
            type="button"
            onClick={() => setOpen(true)}
            className="group/play relative block w-full cursor-pointer bg-surface-2 text-left focus-visible:outline-offset-[-4px]"
          >
            {/*
              `bg-surface-2` is the FALLBACK, and the `after:` utilities on the
              image are what make it visible. A pseudo-element only gets a box
              on a BROKEN image — a loaded <img> is a replaced element and
              renders no ::after — so when img.youtube.com is unreachable the
              UA's broken-image icon is masked by a flat tinted field, and
              when it loads the mask does not exist. No text in the fallback:
              a "thumbnail unavailable" label would flash on every ordinary
              lazy load and assert something false while it showed.

              A plain <img>, not next/image — the one sanctioned exception
              besides AmcMark's SVGs. The stills come from img.youtube.com,
              and `images.remotePatterns` is empty on purpose (next.config.ts:
              with no remote pattern, no attacker-chosen bytes ever reach the
              optimizer's sharp/libvips decode path). Explicit width/height
              reserve the box, so CLS is zero.

              The srcset ladder: mqdefault 320w (≈17KB) and hqdefault 480w
              (≈34KB) are the two stills YouTube guarantees for every video;
              maxresdefault 1280w (≈139KB) serves 2x screens. hqdefault is
              4:3 with the frame letterboxed inside, which `object-cover` in
              an `aspect-video` box crops away exactly.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube still; remotePatterns is deliberately empty (see comment above) */}
            <img
              src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
              srcSet={`https://img.youtube.com/vi/${id}/mqdefault.jpg 320w, https://img.youtube.com/vi/${id}/hqdefault.jpg 480w, https://img.youtube.com/vi/${id}/maxresdefault.jpg 1280w`}
              sizes={sizes}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="relative block aspect-video w-full object-cover grayscale-[0.55] transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/play:grayscale-0 group-focus-visible/play:grayscale-0 after:absolute after:inset-0 after:bg-surface-2 after:content-['']"
            />
            <span className="absolute bottom-5 left-5 inline-flex items-center gap-2.5 rounded-full bg-chip py-2 pl-2 pr-4 text-[14px] font-medium leading-[20px] text-ground">
              <span
                aria-hidden="true"
                className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-ground text-chip"
              >
                <PlayIcon size={12} />
              </span>
              Watch here
              <span className="sr-only">: {title}</span>
            </span>
          </button>
        </Wipe>

        <div className="flex flex-1 flex-col justify-between gap-8 p-7">
          <h3
            className={cn(
              "font-medium text-ink",
              lead
                ? "text-[clamp(22px,2.2vw,28px)] leading-[1.3]"
                : "text-[22px] leading-[30px]",
            )}
          >
            {title}
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/yt inline-flex items-center gap-2 text-[14px] leading-[20px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
            >
              Watch on YouTube
              <ArrowIcon
                size={14}
                className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/yt:translate-x-1"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {seconds !== null ? (
              <span className="tabular text-[14px] leading-[20px] text-muted">
                <span className="sr-only">Duration </span>
                <time dateTime={isoDuration(seconds)}>{clock(seconds)}</time>
              </span>
            ) : null}
          </div>
        </div>
      </TiltCard>

      <VideoDialog
        id={id}
        title={title}
        open={open}
        onClose={() => setOpen(false)}
        returnFocusRef={opener}
      />
    </>
  );
}
