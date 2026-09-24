import { ExternalIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * "Source: AMFI · Scheme ISID" — where a figure came from, at the point
 * of use.
 *
 * Every figure on the site traces to a named publisher (README, rule one),
 * and saying so beside the figure is what lets a reader check it without
 * trusting us. An entry with an `href` links out to the document itself;
 * one without is plain text — never a link to `#`, and never a link to a
 * search page standing in for a document we did not find.
 *
 * No hooks and no directive: renders on the server or inside an island.
 */

export type SourceRefLite = { label: string; href?: string };

export function SourceNote({
  sources,
  label,
  note,
  className,
}: {
  sources: readonly SourceRefLite[];
  /** Defaults to "Source" / "Sources" by count. */
  label?: string;
  /** Trailing qualifier, e.g. "month-end, Regular plan". */
  note?: string;
  className?: string;
}) {
  if (sources.length === 0) return null;
  const heading = label ?? (sources.length > 1 ? "Sources" : "Source");

  return (
    <p className={cn("text-[13px] leading-[20px] text-muted", className)}>
      <span>{heading}: </span>
      {sources.map((source, i) => (
        <span key={`${source.label}-${i}`}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          {source.href ? (
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current"
            >
              {source.label}
              <ExternalIcon size={11} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <span className="text-body">{source.label}</span>
          )}
        </span>
      ))}
      {note ? <span> — {note}</span> : null}
    </p>
  );
}
