import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowIcon,
  BookIcon,
  ChartIcon,
  CompareIcon,
  FilterIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";

/* ============================================================
   WHY SIF INSIGHT? — home, PRD p.15.

   Six whole-card links, one per thing the platform helps a visitor
   do, each straight to its tool or section. Copy is the PRD's,
   verbatim; the voice is a distributor's (discover, track, compare,
   consult) and nothing here ranks or recommends a fund.

   Each card is ONE <a>: the title is its accessible name and the CTA
   text sits inside it, so there is a single tab stop per card and the
   focus outline wraps the whole card. Hover is a hairline shift and a
   4px arrow nudge — no lift, no shadow, no tilt.
   ============================================================ */

type Tool = { title: string; body: string; cta: string; href: string; icon: ReactNode };

const TOOLS: Tool[] = [
  {
    title: "Expert Guidance",
    body: "Connect with experts to better understand SIF strategies and available options.",
    cta: "Book a Consultation",
    href: "/contact",
    icon: <UsersIcon size={22} />,
  },
  {
    title: "SIF Tracker",
    body: "Track Live NFOs, upcoming SIFs, NAVs and performance across the market.",
    cta: "Open Tracker",
    href: "/sif-tracker",
    icon: <ChartIcon size={22} />,
  },
  {
    title: "SIF Screener",
    body: "Filter SIFs by strategy, AMC, risk, performance, cost, AUM and other parameters.",
    cta: "Open Screener",
    href: "/sif-screener",
    icon: <FilterIcon size={22} />,
  },
  {
    title: "Compare SIFs",
    body: "Compare shortlisted SIFs side-by-side across important investment parameters.",
    cta: "Compare",
    href: "/compare",
    icon: <CompareIcon size={22} />,
  },
  {
    title: "Explore SIFs & AMCs",
    body: "Discover SIF offerings across participating AMCs and understand their strategies.",
    cta: "Explore AMCs",
    href: "/amc",
    icon: <SearchIcon size={22} />,
  },
  {
    title: "Learn & Insights",
    body: "Learn through videos, articles, explainers and expert insights from SIF Insight.",
    cta: "Explore Knowledge Hub",
    href: "/learn",
    icon: <BookIcon size={22} />,
  },
];

export function WhyUs() {
  return (
    <Section id="why-sif-insight">
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-16">
          <div>
            <Rise>
              <Eyebrow>The platform</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              className="mt-5 text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.2] text-ink"
              lines={["Why SIF Insight?"]}
            />
          </div>
          <Rise delay={0.08}>
            <p className="max-w-[60ch] text-[17px] leading-[30px] text-body">
              SIF Insight helps you understand, research and compare SIFs,
              combining data, insights and expert guidance to help you explore
              options aligned with your investment needs.
            </p>
          </Rise>
        </div>

        <Group className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TOOLS.map((t) => (
            <GroupItem key={t.href} className="h-full">
              <Link
                href={t.href}
                className="group flex h-full min-h-[260px] flex-col border border-hairline bg-surface p-7 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent-dim focus-visible:rounded-none"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:border-accent-dim"
                >
                  {t.icon}
                </span>
                <h3 className="mt-8 text-[22px] font-medium leading-[30px] text-ink">
                  {t.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[26px] text-body">{t.body}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[15px] font-medium leading-[22px] text-accent-dim">
                  {t.cta}
                  <ArrowIcon
                    size={14}
                    className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </GroupItem>
          ))}
        </Group>
      </Shell>
    </Section>
  );
}
