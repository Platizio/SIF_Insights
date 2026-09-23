import type { ReactNode } from "react";
import { GlassField } from "@/components/motion/GlassField";
import { LineReveal } from "@/components/motion/LineReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rise } from "@/components/motion/Reveal";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { PRIMARY_CTA } from "@/lib/nav";

/**
 * The closing call to action, shared by every interior page.
 *
 * This is deliberately NOT `<ClosingCta />`. That one repeats the hero
 * headline with the serif-italic word, and `em.swap` appears exactly twice
 * site-wide — both on the homepage. This carries no swap.
 *
 * The layout is `1fr auto`: copy left, pill bottom-right. The eight inlined
 * copies this replaced used three different grid declarations
 * (`1fr_320px`, `560px_1fr`, `600px_1fr`) to express that same intent —
 * `auto` sizes the button to its content and needs no per-page number.
 */

/** Most pages say this. Override only when the page has a reason to.

    Distributor voice, deliberately. The old line promised to "map" a
    reader's goals "to the SIFs that fit", which is a suitability call —
    advice — and SIF Insight is a distributor. What we can stand behind is
    walking someone through what exists and what the documents say; the
    choice stays theirs, and the sentence says so. */
const DEFAULT_BODY =
  "Tell us what you are looking for. We will walk you through the SIFs available, how their strategies differ and the scheme documents behind each one — the decision stays yours.";

export function ConsultCta({
  id,
  eyebrow = "Next step",
  lines,
  body,
  label = PRIMARY_CTA.label,
  href = PRIMARY_CTA.href,
}: {
  /** Set `id="consult"` where something on the page links to `#consult`. */
  id?: string;
  /** Pass `null` to omit the eyebrow entirely. */
  eyebrow?: string | null;
  /** Hand-split, like every other headline — we choose where it breaks. */
  lines: ReactNode[];
  body?: ReactNode;
  label?: string;
  href?: string;
}) {
  return (
    <Section id={id}>
      <Shell>
        <div className="border border-hairline bg-accent-wash p-8 sm:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
            <div>
              {eyebrow ? (
                <Rise>
                  <Eyebrow>{eyebrow}</Eyebrow>
                </Rise>
              ) : null}

              <LineReveal
                as="h2"
                lines={lines}
                className="mt-6 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.22] text-ink"
              />

              <Rise delay={0.14}>
                <p className="mt-6 max-w-[52ch] text-[17px] leading-[30px] text-body">
                  {body ?? DEFAULT_BODY}
                </p>
              </Rise>
            </div>

            <Rise
              delay={0.24}
              className="relative isolate lg:justify-self-end lg:pb-2"
            >
              <GlassField />
              {/* inline-flex is load-bearing: transforms are ignored on inline
                  boxes, so a bare wrapper would silently kill the magnetic pull. */}
              <Magnetic className="inline-flex">
                <Button href={href} variant="primary">
                  {label}
                </Button>
              </Magnetic>
            </Rise>
          </div>
        </div>
      </Shell>
    </Section>
  );
}
