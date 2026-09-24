import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const BASE =
  "group/tl inline-flex items-center gap-2 text-[15px] font-medium leading-[22px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim";

/**
 * A text link with a trailing arrow — "View all on YouTube →", "Read more →".
 * `external` opens a new tab and says so to assistive tech, like every other
 * `target="_blank"` link on the site.
 */
export function TextLink({
  href,
  children,
  external = false,
  className,
  srSuffix,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
  /** Extra accessible context, e.g. the article title after "Read more". */
  srSuffix?: string;
}) {
  const arrow = (
    <ArrowIcon
      size={14}
      className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/tl:translate-x-1"
    />
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(BASE, className)}
      >
        {children}
        {srSuffix ? <span className="sr-only">: {srSuffix}</span> : null}
        <ExternalIcon size={12} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={cn(BASE, className)}>
      {children}
      {srSuffix ? <span className="sr-only">: {srSuffix}</span> : null}
      {arrow}
    </Link>
  );
}
