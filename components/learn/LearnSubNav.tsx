import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { Card } from "@/components/primitives";
import { PRIMARY_NAV } from "@/lib/nav";

/**
 * "In Learn" — the hub's own index, read from the same `PRIMARY_NAV` entry
 * the header's Learn dropdown renders, so the two can never list different
 * destinations. In-page anchors first, then the three sibling pages.
 */
const LEARN_LINKS =
  PRIMARY_NAV.find((item) => item.href === "/learn")?.children ?? [];

export function LearnSubNav() {
  if (LEARN_LINKS.length === 0) return null;

  return (
    <Card className="p-6 sm:p-8">
      <nav aria-label="Learn sections">
        <p className="text-[14px] leading-[20px] text-muted">In Learn</p>
        <ul className="mt-4 list-none border-b border-hairline">
          {LEARN_LINKS.map((link) => (
            <li key={link.href} className="border-t border-hairline">
              <Link
                href={link.href}
                className="group flex items-center justify-between gap-4 py-3 text-[15px] leading-[22px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
              >
                <span>{link.label}</span>
                <ArrowIcon
                  size={14}
                  className="shrink-0 text-muted transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:text-accent"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Card>
  );
}
