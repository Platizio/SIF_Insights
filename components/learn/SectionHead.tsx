import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/primitives";

/**
 * The asymmetric section opening shared by the Learn hub and the article
 * page: eyebrow + masked heading on the left, a short standfirst (and an
 * optional action) bottom-aligned on the right. The same 460 / 1fr split
 * /about and /privacy use, so the interior pages stay siblings.
 */
export function SectionHead({
  eyebrow,
  lines,
  intro,
  action,
  as = "h2",
}: {
  eyebrow: string;
  lines: ReactNode[];
  intro?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
      <div>
        <Rise>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Rise>
        <LineReveal
          as={as}
          lines={lines}
          className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
        />
      </div>
      {intro || action ? (
        <Rise delay={0.12} className="lg:self-end">
          {intro ? (
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              {intro}
            </p>
          ) : null}
          {action ? <div className={intro ? "mt-6" : undefined}>{action}</div> : null}
        </Rise>
      ) : null}
    </div>
  );
}
