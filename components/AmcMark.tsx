import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Amc } from "@/lib/data";

/**
 * An AMC's mark. The single implementation — the marquee, the AMC index,
 * a house page and the tracker all render through this.
 *
 * TWO constraints drive every decision here, and both have caused visible
 * bugs when they were forgotten:
 *
 * 1. The eight PNGs we hold have **no alpha channel**. Each is a flat
 *    rectangle with a baked-in background, tones running from near-white
 *    (edelweiss ~239 luminance) to near-black (iti ~28). They therefore
 *    cannot be flattened to a single ink — a `brightness-0` filter turns
 *    every one into a solid black box, which is what made the marquee
 *    logos disappear. Native colour, white tile, `object-contain` because
 *    the aspect ratios run 1.0 → 1.96.
 *
 * 2. **A house may have no mark at all.** All seventeen have one today, so
 *    this branch is currently unreached — keep it anyway: it is what stops
 *    the next house arriving from the AMFI feed without artwork from
 *    punching a hole in a grid. Those render a text lockup in identical tile
 *    geometry, so a grid, a column or a marquee stays even. Never a gap;
 *    never a stand-in glyph implying a brand we do not have.
 *
 * `hover` turns on grayscale-at-rest → colour, and muted → ink for the
 * text lockup, so both kinds of tile behave identically under the pointer.
 * It reads `group-hover`, so the caller must be a `group`.
 *
 * Fixed tile + `fill` keeps CLS at zero without hard-coding eight
 * different intrinsic sizes.
 */

const SIZES = {
  sm: { box: "h-9 w-[64px]", pad: "p-1.5", text: "text-[10px]", sizes: "64px" },
  md: { box: "h-14 w-[124px]", pad: "p-2.5", text: "text-[13px]", sizes: "124px" },
  lg: { box: "h-16 w-[144px]", pad: "p-3", text: "text-[15px]", sizes: "144px" },
} as const;

export function AmcMark({
  amc,
  size = "sm",
  hover = false,
  className,
}: {
  amc: Amc | undefined;
  size?: keyof typeof SIZES;
  /** Requires the caller to be a `group`. */
  hover?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const tile = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-hairline bg-white",
    s.box,
    className,
  );

  if (!amc) return <span aria-hidden="true" className={tile} />;

  if (amc.logo === null) {
    return (
      <span className={cn(tile, "px-2")} aria-hidden="true">
        <span
          className={cn(
            "text-center font-medium leading-tight",
            s.text,
            hover
              ? "text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-ink"
              : "text-ground/80",
          )}
        >
          {amc.sifName}
        </span>
      </span>
    );
  }

  const art = cn(
    "object-contain",
    s.pad,
    hover &&
      "grayscale transition-[filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:grayscale-0",
  );

  /**
   * SVG marks go through a plain <img>, not next/image.
   *
   * next/image refuses SVG unless `images.dangerouslyAllowSVG` is set, and
   * turning that on for files fetched from third-party sites is the wrong
   * trade — an SVG can carry script. Rendered via <img> it cannot execute,
   * so this is the safe path rather than a workaround.
   */
  if (amc.logo.endsWith(".svg")) {
    return (
      <span className={tile}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={amc.logo}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(art, "absolute inset-0 h-full w-full")}
        />
      </span>
    );
  }

  return (
    <span className={tile}>
      <Image src={amc.logo} alt="" fill sizes={s.sizes} className={art} />
    </span>
  );
}
