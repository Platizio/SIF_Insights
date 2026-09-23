import Link from "next/link";
import { Group, GroupItem, Rise } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Eyebrow, Section, Shell } from "@/components/primitives";

/**
 * 404.
 *
 * Without this file Next renders its own built-in "404: This page could
 * not be found." inside the full site chrome — a black-on-white system
 * page bolted under the ticker, the nav and the footer — and ships the
 * response with TWO <title> tags, its own and the root layout's.
 *
 * There is no SEO to win here: an unmatched URL already returns HTTP 404
 * with `noindex`, which Next injects for any 404 response. What this page
 * is for is the person who mistyped a scheme slug or followed a stale
 * link from a WhatsApp forward, and the four routes below are the ones
 * worth landing on instead — the front door and the three hubs every
 * journey through the site starts from.
 *
 * No `metadata` export: Next documents that only `global-not-found.js`
 * takes one (node_modules/next/dist/docs/.../not-found.md). The title
 * falls through to the root layout's default, which is exactly the fix —
 * one <title> instead of two.
 */

const DESTINATIONS = [
  {
    href: "/",
    label: "Home",
    blurb: "What SIF Insight covers, and where to start.",
  },
  {
    href: "/sif-tracker",
    label: "SIF Tracker",
    blurb: "The whole market: NFOs, performance and the latest NAVs.",
  },
  {
    href: "/sif-screener",
    label: "SIF Screener",
    blurb: "Filter every SIF by strategy, AMC, risk, cost and returns.",
  },
  {
    href: "/learn",
    label: "Learn",
    blurb: "Videos, articles and FAQs on how SIFs work.",
  },
];

export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        lines={["Nothing is filed", "at this address."]}
        standfirst="The page you asked for does not exist — a mistyped scheme slug, or a link that pointed somewhere we no longer publish. Everything we do hold is one of these."
      />

      <Section className="pt-0">
        <Shell>
          <Rise>
            <Eyebrow>Where to instead</Eyebrow>
          </Rise>

          <Group className="mt-8 border-t border-hairline">
            {DESTINATIONS.map((d) => (
              <GroupItem key={d.href}>
                <Link
                  href={d.href}
                  className="group flex flex-col gap-2 border-b border-hairline py-6 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-accent-wash sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <span className="text-[20px] leading-[28px] font-medium text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
                    {d.label}
                  </span>
                  <span className="text-[15px] leading-[22px] text-body sm:max-w-[42ch] sm:text-right">
                    {d.blurb}
                  </span>
                </Link>
              </GroupItem>
            ))}
          </Group>
        </Shell>
      </Section>
    </>
  );
}
