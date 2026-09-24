import Link from "next/link";
import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/primitives";
import { cn } from "@/lib/cn";

/* ============================================================
   One block of the comparison: eyebrow → masked heading → a short
   framing line → the evidence → where it came from.

   The comparison is one long document inside ONE <Section> (the
   100px rhythm is the page's; twelve stacked Sections would put
   2,400px of air between a reader and the table they are reading).
   Blocks are separated by a drawn hairline instead.

   Four type sizes: the heading ramp, 15px (framing and values),
   13px (labels, sources) and 12px (eyebrow, markers).
   ============================================================ */

export type SectionSources = {
  /** Publishers behind the figures in this block, e.g. ["AMFI", "Scheme document"]. */
  sources: readonly string[];
  /** Anchor on /methodology for calculated figures. */
  methodology?: `#${string}`;
};

export function CompareSection({
  id,
  eyebrow,
  title,
  intro,
  footer,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  /** Hand-split lines, like every other heading on the site. */
  title: ReactNode[];
  intro?: ReactNode;
  footer?: SectionSources;
  children: ReactNode;
  className?: string;
}) {
  const label = title.filter((t): t is string => typeof t === "string").join(" ");

  return (
    <section id={id} aria-label={label || undefined} className={cn("scroll-mt-24 pt-20", className)}>
      <Rule />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <div>
          <Rise>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Rise>
          <LineReveal
            as="h2"
            lines={title}
            className="mt-4 text-[clamp(28px,3vw,40px)] font-medium leading-[1.16] tracking-[-0.01em] text-ink"
          />
        </div>
        {intro ? (
          <Rise delay={0.08}>
            <p className="max-w-[62ch] text-[15px] leading-[26px] text-body lg:pb-1">{intro}</p>
          </Rise>
        ) : null}
      </div>

      <div className="mt-10">{children}</div>

      {footer && (footer.sources.length > 0 || footer.methodology) ? (
        <p className="mt-5 text-[13px] leading-[20px] text-muted">
          {footer.sources.length > 0 ? (
            <>
              {footer.sources.length > 1 ? "Sources" : "Source"}: {footer.sources.join(" · ")}
            </>
          ) : null}
          {footer.methodology ? (
            <>
              {footer.sources.length > 0 ? <span aria-hidden="true"> · </span> : null}
              <Link
                href={`/methodology${footer.methodology}`}
                className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current"
              >
                View calculation methodology
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
