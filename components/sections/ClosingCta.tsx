import { Fragment } from "react";
import { DrawnPath } from "@/components/motion/DrawnPath";
import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rise, Rule } from "@/components/motion/Reveal";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Section, Shell } from "@/components/primitives";

import { WhatsAppIcon } from "@/components/icons";
import { PRIMARY_CTA } from "@/lib/nav";
import { SITE, mailtoHref, telHref, whatsappHref } from "@/lib/site";

/**
 * The homepage's final consultation CTA (PRD p.16).
 *
 * It carries the SECOND AND FINAL serif-italic swap on the site (the first
 * is the hero H1). It must appear nowhere else — interior pages close on
 * <ConsultCta>, never on this.
 *
 * Distributor voice throughout: a conversation about the options, no
 * advice, no return promise, no urgency device. The consultation goes to
 * the /contact booking form; WhatsApp and email are the direct routes.
 */

/* Hand-split so the serif word opens its own line, as it does in the hero. */
const HEADLINE = [
  <Fragment key="l1">Have questions about SIFs?</Fragment>,
  <Fragment key="l2">
    <em className="swap">Speak</em> with our team.
  </Fragment>,
];

const LINK =
  "text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";

export function ClosingCta() {
  return (
    <Section id="consultation">
      <Shell>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          {/* The tinted plate is the ground, so it does not itself animate —
              a large panel fading up is the exact inertia we removed. */}
          <div className="border border-hairline bg-accent-wash p-8 sm:p-14 lg:w-[712px] lg:shrink-0">
            <LineReveal
              as="h2"
              lines={HEADLINE}
              className="text-[clamp(30px,3.9vw,48px)] font-medium leading-[1.24] text-ink"
            />

            <Rise delay={0.14}>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[30px] text-body">
                Talk to us about how SIFs work, the strategies on offer and the
                scheme documents behind each one — so you can explore the options
                that suit your investment needs.
              </p>
            </Rise>

            <Rule className="mt-10" delay={0.24} />

            <Rise delay={0.3} className="relative isolate mt-10 w-fit max-w-full">
              <GlassField />
              <div className="flex flex-wrap items-center gap-3">
                {/* inline-block so the magnetic shell wraps the pill exactly. */}
                <Magnetic className="inline-block">
                  <Button href={PRIMARY_CTA.href} variant="primary">
                    {PRIMARY_CTA.label}
                  </Button>
                </Magnetic>
                <a
                  href={whatsappHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3.5 text-[15px] font-medium text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent-dim hover:text-accent-dim"
                >
                  <WhatsAppIcon size={16} />
                  Chat on WhatsApp
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
            </Rise>

            <Rise delay={0.38}>
              <p className="mt-6 text-[15px] leading-[22px] text-muted">
                Or write to us at{" "}
                <a href={mailtoHref} className={LINK}>
                  {SITE.email}
                </a>{" "}
                · call{" "}
                <a href={telHref} className={`tabular ${LINK}`}>
                  {SITE.phoneDisplay}
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
