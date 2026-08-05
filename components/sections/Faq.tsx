"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Fragment } from "react";
import { Magnetic } from "@/components/motion/Magnetic";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { faqs } from "@/lib/data";
import { EASE, EXIT } from "@/lib/motion";

/**
 * Open/close is driven by Radix's own presence machinery, NOT Motion's
 * AnimatePresence. `@radix-ui/react-collapsible` renders `children: isOpen &&
 * children`, so an exit animation would need `forceMount` — which pins isOpen
 * permanently true and leaves all five answers mounted behind `height: 0`,
 * exposed to screen readers. Radix's own `--radix-accordion-content-height`
 * keyframes unmount correctly. Do not swap this.
 *
 * The keyframes live here rather than in globals.css, which this file does not
 * own. Reduced motion collapses them globally.
 */
const CURVE = `cubic-bezier(${EASE.outQuart.join(",")})`;

/** Enter 300ms, exit 150ms. Exits are always faster than entrances. */
const ACCORDION_CSS = `
@keyframes sif-faq-open{from{height:0}to{height:var(--radix-accordion-content-height)}}
@keyframes sif-faq-close{from{height:var(--radix-accordion-content-height)}to{height:0}}
.sif-faq-answer{overflow:hidden}
.sif-faq-answer[data-state=open]{animation:sif-faq-open 300ms ${CURVE}}
.sif-faq-answer[data-state=closed]{animation:sif-faq-close ${EXIT * 1000}ms ${CURVE}}
`;

/**
 * Cascade interval, matched to the `stagger` token `<Group>` propagates to its
 * `<GroupItem>` children, so each drawn hairline leads its own row by a
 * constant beat. Capped at 10 — five FAQs today, but the cap is the contract.
 */
const STEP = 0.06;
const CASCADE_CAP = 10;
const stepDelay = (i: number) => Math.min(i, CASCADE_CAP - 1) * STEP;

/** 32px plus that becomes a minus by rotating its vertical stroke. */
function PlusMinus() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="mt-1 shrink-0 text-muted transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-ink group-data-[state=open]:text-accent"
    >
      <path d="M5 16h22" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path
        d="M16 5v22"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        style={{ transformBox: "view-box", transformOrigin: "center" }}
        className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[state=open]:[transform:rotate(90deg)]"
      />
    </svg>
  );
}

export function Faq() {
  // No section background here — the <GlassField> behind the CTA gives that
  // one button its backdrop without texturing the whole section.
  return (
    <Section id="faq" className="relative isolate">
      <style href="sif-faq-motion" precedence="default">
        {ACCORDION_CSS}
      </style>
      <Shell>
        {/* 460 / 120 / 660. The 120px gutter is what makes this editorial
            rather than a support page — do not reduce it. */}
        <div className="grid gap-14 xl:grid-cols-[460px_660px] xl:gap-x-[120px]">
          {/* Sticky sits on a plain div so no transformed motion ancestor
              can break the stick. */}
          <div className="xl:sticky xl:top-32 xl:self-start">
            <Rise>
              <Eyebrow>Questions</Eyebrow>
            </Rise>

            <LineReveal
              lines={["Before you", "invest."]}
              className="mt-6 text-[clamp(38px,4vw,54px)] font-medium leading-[1.12] text-ink"
            />

            <Rise delay={0.1}>
              <p className="mt-6 text-[17px] leading-[30px] text-body">
                The category is new. These are the questions we are asked most often.
              </p>
            </Rise>

            <Rise delay={0.18} className="relative isolate mt-10 inline-block">
              <GlassField />
              <Magnetic className="inline-block">
                <Button href="#consult" variant="ghost">
                  Talk to us
                </Button>
              </Magnetic>
            </Rise>
          </div>

          {/* All five collapsed by default — the section stays short and
              scannable. The rules draw first; the questions land into them. */}
          <Group>
            <Rule />
            <Accordion.Root type="single" collapsible>
              {faqs.map((faq, i) => (
                <Fragment key={faq.id}>
                  <GroupItem>
                    <Accordion.Item value={String(faq.id)}>
                      <Accordion.Header className="text-[24px] font-medium leading-[32px]">
                        <Accordion.Trigger className="group flex w-full cursor-pointer items-start justify-between gap-10 py-10 text-left text-ink">
                          <span>{faq.question}</span>
                          <PlusMinus />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="sif-faq-answer">
                        <p className="max-w-[58ch] pb-10 text-[17px] leading-[30px] text-body">
                          {faq.answer}
                        </p>
                      </Accordion.Content>
                    </Accordion.Item>
                  </GroupItem>
                  {/* Sibling of the item, not a child of it: inside <GroupItem>
                      the rule would inherit that wrapper's opacity and could
                      never lead its own row. */}
                  <Rule delay={stepDelay(i)} />
                </Fragment>
              ))}
            </Accordion.Root>
          </Group>
        </div>
      </Shell>
    </Section>
  );
}
