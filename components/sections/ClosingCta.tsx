import { Fragment } from "react";
import { DrawnPath } from "@/components/motion/DrawnPath";
import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rise, Rule } from "@/components/motion/Reveal";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Section, Shell } from "@/components/primitives";

/**
 * The loop-closer.
 *
 * The hero's headline returns verbatim — the repetition is what makes the
 * page read as authored rather than assembled, and it is the SECOND AND
 * FINAL appearance of the serif-italic swap. It must appear nowhere else.
 *
 * Copy is distributor-safe throughout: discover, map, show the disclosures.
 * No advice, no return promise, no urgency device.
 */

/* Hand-split so the break lands before "in full view" — the serif word must
   sit at the head of its own line, exactly as it does in the hero. */
const HEADLINE = [
  // Typographic apostrophe, matching the hero exactly — the repetition is
  // the point, so the two strings must be identical character for character.
  <Fragment key="l1">India’s SIF market,</Fragment>,
  <Fragment key="l2">
    in <em className="swap">full</em> view.
  </Fragment>,
];

export function ClosingCta() {
  return (
    <Section id="consult">
      <Shell>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          {/* The tinted plate is the ground, so it does not itself animate —
              a large panel fading up is the exact inertia we removed. */}
          <div className="border border-hairline bg-accent-wash p-8 sm:p-14 lg:w-[712px] lg:shrink-0">
            <LineReveal
              as="h2"
              lines={HEADLINE}
              className="text-[clamp(32px,3.9vw,48px)] font-medium leading-[1.24] text-ink"
            />

            <Rise delay={0.14}>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[30px] text-body">
                Tell us your goals and risk comfort. We will map them to the
                SIFs that fit — and show you the disclosures behind each one.
              </p>
            </Rise>

            <Rule className="mt-10" delay={0.24} />

            <Rise delay={0.3} className="relative isolate mt-10 inline-block">
              <GlassField />
              {/* inline-block so the magnetic shell wraps the pill exactly. */}
              <Magnetic className="inline-block">
                <Button href="mailto:info@sifinsight.com" variant="primary">
                  Book a consultation
                </Button>
              </Magnetic>
            </Rise>

            <Rise delay={0.38}>
              <p className="mt-6 text-[14px] leading-[20px] text-muted">
                Or reach us directly —{" "}
                <a
                  href="mailto:info@sifinsight.com"
                  className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                >
                  info@sifinsight.com
                </a>{" "}
                ·{" "}
                <a
                  href="tel:+919205523100"
                  className="tabular text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                >
                  +91 92055 23100
                </a>
              </p>
            </Rise>
          </div>

          <ArcTile />
        </div>
      </Shell>
    </Section>
  );
}

/**
 * The page's only other mega-arc besides the hero bento — one corner, the
 * other three square. Line art only: no fill, no blur, no gradient. Each arc
 * draws itself with <DrawnPath> (eased tween, never a spring), so the tile
 * plots rather than appears.
 */
const ARC_RADII = [80, 130, 180, 230, 280, 330];

function ArcTile() {
  return (
    <div
      aria-hidden="true"
      className="h-[280px] w-full overflow-hidden border border-hairline bg-surface lg:h-[380px] lg:flex-1"
      style={{ borderRadius: "400px 0 0 0" }}
    >
      <svg
        viewBox="0 0 480 380"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {/* The axes the arcs rise from — drawn first, so there is a frame
            before there is a trajectory. */}
        <DrawnPath d="M 40 330 H 460" duration={0.7} className="text-hairline" />
        <DrawnPath
          d="M 40 330 V 20"
          duration={0.7}
          delay={0.06}
          className="text-hairline"
        />

        {/* Concentric quarter-arcs radiating from a fixed origin. */}
        {ARC_RADII.map((r, i) => (
          <DrawnPath
            key={r}
            d={`M ${40 + r} 330 A ${r} ${r} 0 0 0 40 ${330 - r}`}
            duration={0.95}
            delay={0.28 + i * 0.09}
            className={i >= 4 ? "text-accent-dim" : "text-hairline"}
          />
        ))}
      </svg>
    </div>
  );
}
