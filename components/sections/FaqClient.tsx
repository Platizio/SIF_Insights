"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Fragment } from "react";
import { Magnetic } from "@/components/motion/Magnetic";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise, Rule } from "@/components/motion/Reveal";
import { GlassField } from "@/components/motion/GlassField";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import type { Faq } from "@/lib/data/types";
import { EASE, EXIT } from "@/lib/motion";

/**
 * Every answer is MOUNTED at all times — `forceMount` on <Accordion.Content>.
 *
 * The default is the opposite: @radix-ui/react-collapsible@1.1.20 renders
 * `children: isOpen && children` (dist/index.mjs:137), so a closed answer does
 * not exist. `curl` of `/` returned all five questions and none of the five
 * answers. Two things follow from that, and both are worse than the problem
 * `forceMount` used to cause. With scripting off the trigger is inert, so five
 * paragraphs of substantive copy are permanently unreachable — in a codebase
 * that already ships a <noscript> reveal reset in app/layout.tsx precisely
 * because a blank page was "the precise failure mode of the site we replaced".
 * And no crawler ever sees them.
 *
 * `forceMount` alone would be the old trap: `isOpen = context.open || isPresent`
 * is then permanently true, so Radix never writes the `hidden` attribute and
 * five collapsed answers sit in the accessibility tree. The fix for THAT is the
 * `visibility` half of the CSS below, not unmounting.
 *
 * Why the height keyframes had to go with it. They read
 * `--radix-accordion-content-height`, which Radix measures in a layout effect
 * and publishes through a re-render triggered by its own `setIsPresent`. Under
 * `forceMount`, `present` is a constant `true`, that setState is a no-op, and
 * the measurement never reaches the DOM as a custom property — the open
 * keyframe would animate to an invalid value. The grid trick below needs no
 * measurement at all, so it cannot be broken by that.
 */
const CURVE = `cubic-bezier(${EASE.outQuart.join(",")})`;

/** Enter 300ms, exit 150ms. Exits are always faster than entrances. */
const ENTER_MS = 300;
const EXIT_MS = EXIT * 1000;

/**
 * Two elements, two jobs, and they must stay separate.
 *
 * `.sif-faq-fold` (a plain div INSIDE the content) carries the collapse:
 * `grid-template-rows` 1fr -> 0fr against a single child pinned to
 * `min-height:0; overflow:hidden`. It has to be a child rather than the
 * content node itself: on EVERY toggle Radix's layout effect writes
 * `style.transitionDuration = "0s"` onto the content node, forces a style
 * flush with `getBoundingClientRect()` and only then restores it — so any
 * transition declared on that node starts with a zero duration and snaps.
 * A child is out of reach of that inline write.
 *
 * `.sif-faq-clip` is that child, and it exists ONLY to be padding-free.
 * `0fr` is shorthand for `minmax(auto, 0fr)`, so the track never shrinks below
 * its item's minimum contribution — and `min-height: 0` zeroes an item's
 * CONTENT box, not its padding. With the answer's own `pb-10` on the grid item
 * the collapsed track measured 39.98px instead of 0, i.e. every closed answer
 * left a 40px ghost gap above its rule. The padding therefore lives one level
 * further in, on the <p>, where the clip's `overflow: hidden` disposes of it.
 *
 * The fold ALSO carries `visibility`, which is what actually takes a closed
 * answer out of the accessibility tree and out of the tab order — `height: 0`
 * alone does neither, and that is the half a `forceMount` without it would
 * get wrong. It is transitioned rather than toggled because `visibility` has
 * the one interpolation rule we want: with `visible` at either end the value
 * stays `visible` for the whole duration and flips only at the far endpoint.
 * So the answer is still painted while it collapses and is hidden the instant
 * it finishes, rather than blinking out at t=0 and leaving 150ms of empty box
 * to fold. It has to sit on the fold for the same reason the collapse does:
 * declared on the content node, Radix's `transitionDuration = "0s"` swallowed
 * it and the answer measured `visibility: hidden` 120ms into a 150ms close.
 *
 * The residue of that is a labelled-but-empty `role="region"` per collapsed
 * item. That is honest — the panel exists, is named by its question, and holds
 * nothing a reader can reach — and it is exactly what the trigger's
 * `aria-expanded="false"` already announces. Note also that CSS is what makes
 * the no-JS reset below possible at all: an `inert` attribute would hide these
 * answers from assistive tech with no way for a stylesheet to give them back.
 *
 * Durations are asymmetric for free: a transition uses the timing of the state
 * it is moving TO, so closing picks up the 150ms override and opening picks up
 * the 300ms base. The reduced-motion block in globals.css flattens both.
 *
 * These live here rather than in globals.css, which this file does not own.
 */
const ACCORDION_CSS = `
.sif-faq-fold{display:grid;grid-template-rows:1fr;visibility:visible;transition:grid-template-rows ${ENTER_MS}ms ${CURVE},visibility ${ENTER_MS}ms ${CURVE}}
.sif-faq-answer[data-state=closed] .sif-faq-fold{grid-template-rows:0fr;visibility:hidden;transition-duration:${EXIT_MS}ms}
.sif-faq-clip{min-height:0;overflow:hidden}
`;

/**
 * With scripting off the trigger cannot toggle anything, so every item is
 * frozen at `data-state="closed"` — collapsed and, thanks to the rule above,
 * invisible. Mounting the answers would have bought nothing.
 *
 * Same shape as the reveal reset in app/layout.tsx: a <style> smuggled through
 * <noscript> as raw HTML. It has to be raw HTML because with scripting ENABLED
 * the browser parses <noscript> content as text — React must not try to
 * reconcile it, and globals.css must never be given `noscript{display:contents}`
 * to "fix" that, which would print this source onto the page.
 *
 * Unlayered + !important so it beats the component styles above.
 */
const NO_JS_CSS =
  "<style>.sif-faq-fold{grid-template-rows:1fr!important;" +
  "visibility:visible!important}</style>";

/**
 * Cascade interval, matched to the `stagger` token `<Group>` propagates to its
 * `<GroupItem>` children, so each drawn hairline leads its own row by a
 * constant beat. Capped at 10 — five FAQs today, but the cap is the contract.
 */
const STEP = 0.06;
const CASCADE_CAP = 10;
const stepDelay = (i: number) => Math.min(i, CASCADE_CAP - 1) * STEP;

/**
 * 32px plus that becomes a minus by rotating its vertical stroke.
 *
 * Both transitions run at `duration-200` (= --duration-micro, DUR.micro's
 * neighbour on the sanctioned scale), not the 300ms they used to. 300ms is
 * not a value on that scale at all: the only 300 in this file is ENTER_MS,
 * which belongs to the FOLD, and borrowing it for the glyph tied a 32px
 * icon's hover to a whole panel's collapse. The glyph is UI feedback on a
 * pointer, so it takes the micro duration like every other hover on the site.
 */
function PlusMinus() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="mt-1 shrink-0 text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-ink group-data-[state=open]:text-accent"
    >
      <path d="M5 16h22" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path
        d="M16 5v22"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        style={{ transformBox: "view-box", transformOrigin: "center" }}
        className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-data-[state=open]:[transform:rotate(90deg)]"
      />
    </svg>
  );
}

/**
 * The questions arrive as PROPS from the server wrapper in Faq.tsx. Importing
 * `faqs` from `@/lib/data` here put the whole NAV history into the client
 * bundle of every page that shows the section.
 */
export function FaqClient({ faqs }: { faqs: Faq[] }) {
  // No section background here — the <GlassField> behind the CTA gives that
  // one button its backdrop without texturing the whole section.
  return (
    <Section id="faq" className="relative isolate">
      <style href="sif-faq-motion" precedence="default">
        {ACCORDION_CSS}
      </style>
      <noscript dangerouslySetInnerHTML={{ __html: NO_JS_CSS }} />
      <Shell>
        {/* 460 / 120 / 660. The 120px gutter is what makes this editorial
            rather than a support page — do not reduce it. Centred, not
            widened: the right column is question-and-answer prose at a fixed
            measure, so extra width would only pad it. */}
        <div className="grid gap-14 xl:grid-cols-[460px_660px] xl:justify-center xl:gap-x-[120px]">
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
                      {/* forceMount: the answer ships in the server HTML.
                          See the note at the top of this file for why that is
                          not the a11y regression it used to be — and do not
                          add `overflow:hidden` here, the fold's child clips. */}
                      <Accordion.Content forceMount className="sif-faq-answer">
                        <div className="sif-faq-fold">
                          <div className="sif-faq-clip">
                            <p className="max-w-[58ch] pb-10 text-[17px] leading-[30px] text-body">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
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
