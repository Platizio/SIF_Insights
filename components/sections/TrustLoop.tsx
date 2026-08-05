"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * Rescued from a flat PNG.
 *
 * On the old site this entire process lived inside a 1920×1080 image — zero
 * accessibility, zero SEO, zero reflow. Keeping it as a real <ol> of real
 * <li> panels is the whole point of the section; the motion is secondary.
 *
 * The only scroll-linked motion on the page: a connecting hairline draws
 * across the four steps and each numeral lifts from muted to accent as the
 * line reaches it.
 */

type Step = { n: string; title: string; body: string };

const STEPS: Step[] = [
  {
    n: "01",
    title: "Assess customer requirements",
    body: "We understand your profile, goals and risk comfort.",
  },
  {
    n: "02",
    title: "Curated SIFs",
    body: "Personalised access to the right SIFs.",
  },
  {
    n: "03",
    title: "Capitalise on market opportunities",
    body: "We actively look for opportunities to increase returns across multiple SIFs.",
  },
  {
    n: "04",
    title: "Achieve financial goals",
    body: "Our focus remains on achieving risk-managed, consistent outcomes even in changing markets.",
  },
];

/** Where each step's numeral sits along the rail — column start + the 32px panel inset. */
const NODE_AT = [0.02, 0.27, 0.52, 0.77];

export function TrustLoop() {
  const track = useRef<HTMLDivElement>(null);

  /* The one place a per-component reduced-motion guard is genuinely required.
     The global CSS media query kills transitions and animations, but the rail
     is a JS-set inline transform driven by a scroll MotionValue — CSS cannot
     reach it. Without this the rail would sit at scaleX(0) forever and the
     numerals would never light, so the section would silently lose meaning. */
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start 0.8", "end 0.65"],
  });

  const [reached, setReached] = useState(-1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setReached(NODE_AT.filter((t) => v >= t).length - 1);
  });

  const drawn = reduced ? 1 : scrollYProgress;
  const lastLit = reduced ? STEPS.length - 1 : reached;

  return (
    <Section>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[640px_1fr] lg:gap-16">
          <div>
            <Rise>
              <Eyebrow>How we work</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["From first conversation", "to funded."]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="text-[17px] leading-[30px] text-body">
              A certified distributor for your financial goals.
            </p>
          </Rise>
        </div>

        <div ref={track} className="relative mt-16">
          {/* Desktop: the rail runs across the top of the row. The base
              hairline draws itself once; the accent overlay is scrubbed. */}
          <div aria-hidden="true" className="relative mb-10 hidden lg:block">
            <Rule />
            <motion.div
              style={{ scaleX: drawn }}
              className="absolute inset-x-0 top-0 h-px origin-left bg-accent"
            />
            <div className="absolute inset-x-0 top-0 grid grid-cols-4 gap-4">
              {STEPS.map((s, i) => (
                <span
                  key={s.n}
                  className={cn(
                    "ml-8 block h-[10px] w-px -translate-y-1/2",
                    "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    i <= lastLit ? "bg-accent" : "bg-hairline",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Mobile: the same rail, turned on its side, running down the stack. */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 top-0 w-px bg-hairline lg:hidden"
          >
            <motion.div
              style={{ scaleY: drawn }}
              className="h-full w-full origin-top bg-accent"
            />
          </div>

          <ol className="grid list-none gap-4 pl-8 lg:grid-cols-4 lg:pl-0">
            {STEPS.map((step, i) => (
              <li key={step.n} className="flex">
                <Rise
                  delay={i * 0.08}
                  className="flex min-h-[300px] w-full flex-col justify-between border border-hairline bg-surface p-8"
                >
                  {/* A label, not a quantity — so static tabular type, never
                      an odometer. Rolling "03" would imply it was measured. */}
                  <p
                    aria-hidden="true"
                    className={cn(
                      "tabular text-[40px] font-medium leading-none",
                      "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      i <= lastLit ? "text-accent" : "text-muted",
                    )}
                  >
                    {step.n}
                  </p>
                  <div>
                    <h3 className="text-[22px] font-medium leading-[30px] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-[17px] leading-[30px] text-body">
                      {step.body}
                    </p>
                  </div>
                </Rise>
              </li>
            ))}
          </ol>
        </div>
      </Shell>
    </Section>
  );
}
