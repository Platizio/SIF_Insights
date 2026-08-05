import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * Interior page header.
 *
 * The site this replaces opened NINE pages with a byte-identical dark
 * gradient banner. This is the opposite bet: one consistent *structure*
 * (eyebrow → masked title → standfirst → optional meta), but the title
 * line-break, the meta row and the aside are set per page, so pages stay
 * recognisably siblings without being interchangeable.
 *
 * `lines` are hand-split for the same reason as the hero — we choose where
 * the headline breaks rather than letting a resize choose for us.
 */
export function PageHeader({
  eyebrow,
  lines,
  standfirst,
  meta,
  aside,
  className,
}: {
  eyebrow: string;
  lines: ReactNode[];
  standfirst?: ReactNode;
  /** Small factual row under the standfirst — counts, dates, sources. */
  meta?: ReactNode[];
  /** Optional right-hand column: a stat, a CTA, a disclosure. */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <Section className={cn("pt-16 pb-[72px]", className)}>
      <Shell>
        <div
          className={cn(
            "grid gap-12",
            aside && "xl:grid-cols-[1fr_360px] xl:items-end xl:gap-16",
          )}
        >
          <div className="max-w-[760px]">
            <Rise>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Rise>

            <LineReveal
              as="h1"
              className="mt-6 text-[clamp(36px,4.6vw,64px)] leading-[1.12] font-medium text-ink"
              lines={lines}
            />

            {standfirst ? (
              <Rise delay={0.12}>
                <p className="mt-7 max-w-[58ch] text-[17px] leading-[30px] text-body">
                  {standfirst}
                </p>
              </Rise>
            ) : null}

            {meta?.length ? (
              <Rise delay={0.2}>
                <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] leading-[20px] text-muted">
                  {meta.map((item, i) => (
                    <li key={i} className="flex items-center gap-5">
                      {i > 0 ? (
                        <span aria-hidden="true" className="h-3.5 w-px bg-hairline" />
                      ) : null}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Rise>
            ) : null}
          </div>

          {aside ? <Rise delay={0.26}>{aside}</Rise> : null}
        </div>
      </Shell>

      {/* The rule closes the header and opens the page body. */}
      <Shell className="mt-14">
        <Rule />
      </Shell>
    </Section>
  );
}
