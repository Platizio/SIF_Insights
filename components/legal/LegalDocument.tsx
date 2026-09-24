import Link from "next/link";
import type { ReactNode } from "react";
import { Rise } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/* ============================================================
   The shared body of the legal and reference pages — /terms,
   /disclaimer, /regulatory-disclosures and /methodology.

   Numbered clauses on the right at reading measure; on the left an
   anchor table of contents that sticks on wide screens and sits
   above the clauses on narrow ones, with the "Last updated" line
   under it. Every clause heading carries an id, so any clause can
   be linked to directly (the metric registry links into
   /methodology this way).

   Server markup throughout. The clauses rise in as they enter, via
   the sanctioned <Rise>; the table of contents does not animate at
   all — it is navigation, and it must be usable at first paint.
   ============================================================ */

export type LegalClause = {
  /** Anchor id — stable, lowercase, hyphenated. Other pages link to it. */
  id: string;
  heading: string;
  body: ReactNode;
  /** Extra anchor ids that should land on this clause (aliases). */
  aliases?: string[];
};

export function LegalDocument({
  clauses,
  updated,
  tocLabel = "Contents",
}: {
  clauses: LegalClause[];
  updated: { iso: string; label: string };
  tocLabel?: string;
}) {
  return (
    <Section className="pt-0">
      <Shell>
        <div className="grid gap-14 lg:grid-cols-[280px_1fr] lg:gap-24">
          {/* Sticky on a plain div: a transformed motion ancestor would
              break the stick. */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <nav aria-label={tocLabel}>
              <p className="text-[14px] leading-[20px] text-muted">{tocLabel}</p>
              <ol className="mt-4 list-none border-b border-hairline">
                {clauses.map((clause, i) => (
                  <li key={clause.id} className="border-t border-hairline">
                    <Link
                      href={`#${clause.id}`}
                      className="flex gap-3 py-2.5 text-[14px] leading-[20px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
                    >
                      <span aria-hidden="true" className="tabular w-6 shrink-0 text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{clause.heading}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
            <p className="mt-6 text-[14px] leading-[20px] text-muted">
              Last updated{" "}
              <time dateTime={updated.iso} className="tabular text-body">
                {updated.label}
              </time>
            </p>
          </div>

          <ol className="list-none border-b border-hairline">
            {clauses.map((clause, i) => (
              <li
                key={clause.id}
                id={clause.id}
                className="scroll-mt-28 border-t border-hairline"
              >
                {clause.aliases?.map((alias) => (
                  <span key={alias} id={alias} className="block scroll-mt-28" aria-hidden="true" />
                ))}
                <Rise delay={Math.min(i, 3) * 0.04} className="py-10">
                  <h2 className="flex gap-4 text-[22px] font-medium leading-[30px] text-ink">
                    <span aria-hidden="true" className="tabular shrink-0 text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{clause.heading}</span>
                  </h2>
                  <div className="mt-5 max-w-[68ch] sm:pl-10">{clause.body}</div>
                </Rise>
              </li>
            ))}
          </ol>
        </div>
      </Shell>
    </Section>
  );
}

/* ---- Prose helpers: one measure, one size, across all four pages ---- */

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-5 text-[17px] leading-[30px] text-body first:mt-0", className)}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-[30px] text-body marker:text-muted first:mt-0">
      {children}
    </ul>
  );
}

const INLINE =
  "text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent hover:decoration-current";

/** An inline link. External targets open a new tab and say so. */
export function A({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(INLINE, className)}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} className={cn(INLINE, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(INLINE, className)}>
      {children}
    </Link>
  );
}

/** A definition list row set — term on the left, detail on the right. */
export function Terms({ rows }: { rows: { term: ReactNode; detail: ReactNode }[] }) {
  return (
    <dl className="mt-5 border-b border-hairline first:mt-0">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-1 border-t border-hairline py-3 sm:grid-cols-[200px_1fr] sm:gap-6"
        >
          <dt className="text-[15px] font-medium leading-[26px] text-ink">{row.term}</dt>
          <dd className="text-[15px] leading-[26px] text-body">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The publication date every legal page carries. One place to change it. */
export const LEGAL_UPDATED = { iso: "2026-09-23", label: "23 September 2026" } as const;
