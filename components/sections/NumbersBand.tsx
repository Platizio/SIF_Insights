import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Parallax, Rule } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";
import { PARALLAX } from "@/lib/motion";

/**
 * The page's one material event.
 *
 * After ~3000px of warm paper this is the rhythm break: a full-bleed DARK
 * plate. The inversion is the section — not decoration on top of it. The
 * texture is generated (feTurbulence displaced into broad tonal strata, then
 * a fine grain pass); no external asset is fetched, and only the substrate
 * parallaxes. The figures and the heading never move on scroll.
 */

/** ₹10,00,000 expressed in lakh — the unit the SEBI framework is quoted in. */
const MIN_LAKH = stats.minInvestment / 100_000;

export function NumbersBand() {
  return (
    <Section className="overflow-x-clip">
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-chip">
        {/* Substrate only, rate 0.06. Extended past both edges so the travel
            never exposes a seam. `[&>div]:h-full` reaches Motion's inner
            transform wrapper, which owns no class of its own. */}
        <Parallax
          rate={PARALLAX.substrate}
          className="pointer-events-none absolute inset-x-0 -top-[7vh] -bottom-[7vh] [&>div]:h-full"
        >
          <Texture />
        </Parallax>

        <Shell className="relative flex min-h-[465px] flex-col justify-center py-[72px]">
          <div className="flex flex-col gap-14 lg:flex-row-reverse lg:items-start lg:justify-between lg:gap-16">
            {/* DOM order puts the heading first; row-reverse sends it right. */}
            <LineReveal
              as="h2"
              lines={["The category, measured —", "not marketed."]}
              className="text-[clamp(30px,3.3vw,44px)] font-medium leading-[1.22] text-ground lg:max-w-[420px] lg:shrink-0 lg:text-right"
            />

            <Group className="flex flex-wrap gap-x-[80px] gap-y-12">
              <GroupItem className="max-w-[220px]">
                <Odometer
                  value={MIN_LAKH}
                  prefix="₹"
                  suffix=" L"
                  className={FIGURE}
                />
                <p className={LABEL}>Minimum investment</p>
              </GroupItem>

              <GroupItem className="max-w-[220px]">
                <Odometer value={stats.strategyCount} className={FIGURE} />
                <p className={LABEL}>Strategies tracked</p>
              </GroupItem>

              <GroupItem className="max-w-[220px]">
                <Odometer value={stats.amcCount} className={FIGURE} />
                <p className={LABEL}>Asset managers</p>
              </GroupItem>

              <GroupItem className="max-w-[220px]">
                <Odometer
                  value={stats.maxUnhedgedShortPct}
                  suffix="%"
                  className={FIGURE}
                />
                <p className={LABEL}>Max unhedged short exposure</p>
              </GroupItem>
            </Group>
          </div>

          {/* Odometers are always paired with an as-of line — a figure that
              animated once must still say when it was true. */}
          <Rule className="mt-16 bg-ground/15" delay={0.25} />
          <p className="mt-6 text-[14px] leading-[20px] text-ground/60">
            Coverage as of {formatUpdated(navLastUpdated)}. Minimum ticket and
            unhedged short limits are set by SEBI&apos;s SIF framework, not by us.
          </p>
        </Shell>
      </div>
    </Section>
  );
}

/* Two classes, used four times each — the figure row must be identical or
   the odometer columns stop aligning. */
const FIGURE =
  "text-[clamp(46px,5.4vw,72px)] font-medium leading-[1.06] text-ground";
const LABEL = "mt-3 text-[17px] leading-[26px] text-ground/75";

/**
 * Generated material, retuned for the dark plate.
 *
 * Two displaced solids make the tonal strata — flat fields with a geological
 * boundary, not a colour ramp. The grain rect is the surface. Both amplitudes
 * are held low: on a near-black ground, noise reads three times louder than
 * it does on paper, and this needs to feel like stock, not like static.
 */
function Texture() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 1440 620"
      preserveAspectRatio="none"
    >
      <defs>
        <filter
          id="nb-field"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.011"
            numOctaves="4"
            seed="17"
            result="field-noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="field-noise"
            scale="170"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="nb-grain"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          {/* Flatten alpha so the grain is an even veil rather than clumps. */}
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" intercept="0" />
          </feComponentTransfer>
        </filter>
      </defs>

      <g filter="url(#nb-field)">
        <rect
          x="-260"
          y="-220"
          width="1960"
          height="470"
          fill="var(--color-accent)"
          opacity="0.11"
        />
        <rect
          x="-260"
          y="320"
          width="1960"
          height="660"
          fill="var(--color-ground)"
          opacity="0.035"
        />
      </g>

      <rect width="1440" height="620" filter="url(#nb-grain)" opacity="0.055" />
    </svg>
  );
}
