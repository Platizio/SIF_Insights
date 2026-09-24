import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/primitives";

/**
 * The tracker's section opening: eyebrow, masked heading, one line of
 * supporting copy on the left; provenance (as-of, source) bottom-right.
 * The same structure as the NAV board's header, so the page reads as one
 * instrument rather than six widgets.
 *
 * Type: 12 (eyebrow), the heading clamp, 15 (copy), 13 (aside) — the four
 * sizes a section may use. Sections below keep to the same four.
 */
export function SectionHead({
  eyebrow,
  lines,
  copy,
  aside,
}: {
  eyebrow: string;
  lines: ReactNode[];
  copy?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
      <div className="max-w-[720px]">
        <Rise>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Rise>
        <LineReveal
          as="h2"
          className="mt-4 text-[clamp(32px,4.6vw,48px)] leading-[1.14] tracking-[-0.015em]"
          lines={lines}
        />
        {copy ? (
          <Rise delay={0.1}>
            <p className="mt-5 max-w-[58ch] text-[15px] leading-[26px] text-body">{copy}</p>
          </Rise>
        ) : null}
      </div>
      {aside ? (
        <Rise delay={0.15} className="md:max-w-[360px] md:pb-1 md:text-right">
          {aside}
        </Rise>
      ) : null}
    </header>
  );
}
