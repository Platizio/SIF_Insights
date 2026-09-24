import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { SourceNote } from "@/components/ui/SourceNote";
import { cn } from "@/lib/cn";
import type { SourceRef } from "@/lib/data/types";

/* ============================================================
   The building blocks every section of /sif/[id] shares.

   No hooks and no directive: they render on the server. Adapted
   from the NAV tracker's FundDetail / Disclosure / Provenance
   (app/nav-tracker/NavExplorer.tsx, retired in W3) so the scheme
   page reads the way the tracker's detail pane did — label, value,
   and where the value came from — without importing a file that
   is on its way out.
   ============================================================ */

/**
 * One scheme-page section: a hairline, then an asymmetric split —
 * the heading column left, the ledger right. Never 50/50.
 */
export function SifSection({
  id,
  head,
  children,
  wide = false,
}: {
  id: string;
  head: ReactNode;
  children: ReactNode;
  /** Stack the head above a full-width body (the performance block). */
  wide?: boolean;
}) {
  return (
    <Section id={id} className="pt-0">
      <Shell>
        <Rule />
        <div
          className={cn(
            "mt-12 grid gap-10",
            !wide && "lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]",
          )}
        >
          <div>{head}</div>
          <div className="min-w-0">{children}</div>
        </div>
      </Shell>
    </Section>
  );
}

/** Eyebrow → masked heading → optional standfirst → optional methodology link. */
export function SectionHead({
  eyebrow,
  lines,
  children,
  methodology,
}: {
  eyebrow: string;
  lines: ReactNode[];
  children?: ReactNode;
  /** Anchor on /methodology, e.g. "#volatility". */
  methodology?: `#${string}`;
}) {
  return (
    <div>
      <Rise>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Rise>
      <LineReveal
        as="h2"
        className="mt-4 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.2] text-ink"
        lines={lines}
      />
      {children ? (
        <Rise delay={0.1}>
          <div className="mt-5 max-w-[48ch] text-[15px] leading-[26px] text-body">
            {children}
          </div>
        </Rise>
      ) : null}
      {methodology ? (
        <Rise delay={0.14}>
          <MethodologyLink anchor={methodology} className="mt-5" />
        </Rise>
      ) : null}
    </div>
  );
}

export function MethodologyLink({
  anchor,
  children = "How this is calculated",
  className,
}: {
  anchor: `#${string}`;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={`/methodology${anchor}`}
      className={cn(
        "group inline-flex items-center gap-2 text-[13px] leading-[20px] text-accent underline decoration-transparent underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current",
        className,
      )}
    >
      {children}
      <ArrowIcon
        size={12}
        className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
      />
    </Link>
  );
}

/**
 * A fact row: label left, value right from md, stacked below it.
 *
 * The right column is wide on purpose — exit loads, redemption terms and
 * taxation are the scheme document's own sentences and are printed whole.
 * A missing value is passed in as `<NotCaptured>` by the caller, which knows
 * WHY it is missing; this row never invents a placeholder of its own.
 */
export function FactRow({
  label,
  children,
  note,
  source,
  tabular = false,
}: {
  label: ReactNode;
  children: ReactNode;
  /** A muted qualifier under the value — a basis, a date, a parse. */
  note?: ReactNode;
  source?: ReactNode;
  tabular?: boolean;
}) {
  return (
    <div className="grid gap-1.5 border-b border-hairline py-4 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
      <dt className="text-[13px] leading-[20px] text-muted md:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-[15px] leading-[24px] text-ink">
        <div className={cn(tabular && "tabular")}>{children}</div>
        {note ? (
          <div className="mt-1 max-w-[68ch] text-[13px] leading-[20px] text-muted">{note}</div>
        ) : null}
        {source ? <div className="mt-1.5">{source}</div> : null}
      </dd>
    </div>
  );
}

/** `<dl>` with the opening hairline the rows close. */
export function FactList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("border-t border-hairline", className)}>{children}</dl>;
}

/** "Source: Quant Mutual Fund · ISID ↗ — p.3 'Date of allotment'". */
export function FactSource({ source, locator }: { source: SourceRef; locator?: string }) {
  return (
    <SourceNote
      sources={[{ label: `${source.publisher} · ${docTypeLabel(source.docType)}`, href: source.url }]}
      note={locator || undefined}
    />
  );
}

const DOC_TYPE_LABEL: Record<SourceRef["docType"], string> = {
  ISID: "ISID",
  SID: "SID",
  KIM: "KIM",
  SAI: "SAI",
  factsheet: "Factsheet",
  portfolio: "Portfolio disclosure",
  addendum: "Addendum",
  "ter-disclosure": "TER disclosure",
  "press-release": "Press release",
  "amfi-data": "AMFI data",
  "sebi-filing": "SEBI filing",
};

export function docTypeLabel(kind: SourceRef["docType"]): string {
  return DOC_TYPE_LABEL[kind];
}

/**
 * Provenance row. Label left, value left — a source URL is long and a
 * right-aligned column would break it mid-path.
 */
export function Provenance({
  label,
  children,
  tabular,
}: {
  label: string;
  children: ReactNode;
  tabular?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-hairline py-2.5 text-[13px] leading-[20px] sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("min-w-0 break-words text-body", tabular && "tabular")}>{children}</dd>
    </div>
  );
}
