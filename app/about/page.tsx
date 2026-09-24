import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookIcon,
  ChartIcon,
  CompareIcon,
  LayersIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise, Rule, Wipe } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { stats } from "@/lib/data";
import { PRIMARY_CTA } from "@/lib/nav";
import { SITE, mailtoHref, whatsappHref } from "@/lib/site";

/**
 * /about — PRD pp.69–74, in the PRD's own order:
 * About SIF Insight → Why We Built SIF Insight → Our Vision → Our Mission →
 * What We Do → Meet Our Founder (#founder) → Why SIF Insight? →
 * SIF Insight by Platizio → Have Questions About SIFs? (#connect).
 *
 * Copy is the PRD's, verbatim, except where the guardrails require a word to
 * change (noted inline). Founder facts are only the ones this page already
 * published — nothing added. No team roster, no testimonials, no "real-time
 * chat", no "personalised recommendations": none of those exist.
 */

const STANDFIRST =
  "SIF Insight is a dedicated platform focused on India’s Specialised Investment Fund ecosystem — bringing together research, data, expert insights and educational content to help investors better understand, track and compare SIFs.";

const DESCRIPTION =
  "SIF Insight, by Platizio Services LLP, brings together research, data, expert insights and education on India’s Specialised Investment Funds.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  /* Next merges metadata shallowly: declaring `openGraph` replaces the root
     layout's block, so siteName/locale/type/images are restated. */
  openGraph: {
    title: "About SIF Insight",
    description: DESCRIPTION,
    url: "/about",
    images: "/opengraph-image",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

/** The founder photo is a 400×400 asset; dimensions are explicit for CLS. */
const FOUNDER_PHOTO = { width: 400, height: 400 } as const;

type IconCard = { icon: ReactNode; title: string; body: string };

/* PRD p.70–71. Card 2 has no heading in the PRD — only its body — so it takes
   the name of the tools it describes. */
const WHAT_WE_DO: IconCard[] = [
  {
    icon: <ChartIcon size={20} />,
    title: "Research, Track and Understand SIF",
    body: "Track SIFs, NFOs, NAVs, performance, AUM and developments across the market.",
  },
  {
    icon: <CompareIcon size={20} />,
    title: "Screen & Compare",
    body: "Use data-led tools to filter SIFs and compare shortlisted strategies across relevant investment parameters.",
  },
  {
    icon: <BookIcon size={20} />,
    title: "Learn",
    body: "Understand SIFs through videos, articles, explainers and FAQs.",
  },
  {
    icon: <UsersIcon size={20} />,
    title: "Expert Insights",
    body: "Access conversations and perspectives from fund managers, AMCs and industry experts.",
  },
  {
    icon: <ShieldIcon size={20} />,
    title: "Investor Guidance",
    body: "Connect with the SIF Insight team when you need help understanding available SIF options and the investment process.",
  },
];

/* PRD p.72. */
const WHY: IconCard[] = [
  {
    icon: <SearchIcon size={20} />,
    title: "Focused on SIFs",
    body: "A platform built specifically around India’s developing Specialised Investment Fund ecosystem.",
  },
  {
    icon: <ChartIcon size={20} />,
    title: "Data & Research",
    body: "Track and evaluate SIFs through structured market data and research tools.",
  },
  {
    icon: <UsersIcon size={20} />,
    title: "Expert Guidance",
    body: "Access expert perspectives and support when understanding different SIF strategies and options.",
  },
  {
    icon: <BookIcon size={20} />,
    title: "Education",
    body: "Learn through videos, articles, expert conversations and easy-to-understand explainers.",
  },
  {
    icon: <LayersIcon size={20} />,
    title: "One SIF Ecosystem",
    body: "Bringing together AMCs, fund managers, experts and investors on one platform.",
  },
];

/* The credentials this page already carried — unchanged. */
const CREDENTIALS = [
  { term: "CFP®", detail: "Certified Financial Planner" },
  { term: "MBA", detail: "Master of Business Administration" },
  { term: "Over 25 years", detail: "Across financial services and international business" },
];

const H2 = "mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink";

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Us"
        lines={["About", "SIF Insight"]}
        standfirst={STANDFIRST}
        meta={[
          SITE.legalEntity,
          SITE.arnLine,
          <>
            <span className="tabular">{stats.strategyCount}</span> SIFs tracked
            across <span className="tabular">{stats.amcCount}</span> AMCs
          </>,
        ]}
      />

      <Story />
      <VisionMission />
      <CardSection
        eyebrow="What We Do"
        lines={["What We Do"]}
        intro="The different ways SIF Insight helps you find your way around the SIF market."
        cards={WHAT_WE_DO}
      />
      <Founder />
      <CardSection
        eyebrow="Why SIF Insight"
        lines={["Why SIF Insight?"]}
        cards={WHY}
      />
      <Platizio />
      <Connect />
    </>
  );
}

/* ============================================================
   1 — Our Story
   ============================================================ */

function Story() {
  return (
    <Section>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>Our Story</Eyebrow>
            </Rise>
            <LineReveal as="h2" lines={["Why We Built", "SIF Insight"]} className={H2} />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[58ch] text-[17px] leading-[30px] text-body">
              Specialised Investment Funds are creating a new investment
              category in India, but understanding the different strategies,
              products, risks and opportunities can be complex.
            </p>
            <p className="mt-5 max-w-[58ch] text-[17px] leading-[30px] text-body">
              SIF Insight was created to bring this information together on
              one platform and make the SIF ecosystem easier to understand and
              navigate.
            </p>
          </Rise>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   2 + 3 — Vision and Mission, side by side
   ============================================================ */

function VisionMission() {
  const items = [
    {
      eyebrow: "Our Vision",
      body: "To become a trusted destination for understanding and researching Specialised Investment Funds in India, bringing greater clarity, transparency and accessibility to the SIF ecosystem.",
    },
    {
      eyebrow: "Our Mission",
      body: "To bring SIF data, research, education and expert perspectives together on one platform, helping investors understand different strategies, evaluate available options and make more informed investment decisions.",
    },
  ];

  return (
    <Section>
      <Shell>
        <Group className="grid gap-x-16 md:grid-cols-2">
          {items.map((item) => (
            <GroupItem key={item.eyebrow} className="border-t border-hairline py-10">
              <h2 className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-accent">
                {item.eyebrow}
              </h2>
              <p className="mt-6 max-w-[40ch] text-[clamp(22px,2.2vw,28px)] font-medium leading-[1.36] text-ink">
                {item.body}
              </p>
            </GroupItem>
          ))}
        </Group>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Icon card grid — What We Do (4) and Why SIF Insight? (5)
   ============================================================ */

function CardSection({
  eyebrow,
  lines,
  intro,
  cards,
}: {
  eyebrow: string;
  lines: string[];
  intro?: string;
  cards: IconCard[];
}) {
  return (
    <Section>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Rise>
            <LineReveal as="h2" lines={lines} className={H2} />
          </div>
          {intro ? (
            <Rise delay={0.12} className="lg:self-end">
              <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">{intro}</p>
            </Rise>
          ) : null}
        </div>

        <Group className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <GroupItem key={card.title} className="h-full">
              <Card className="flex h-full flex-col p-7">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center border border-hairline text-accent"
                >
                  {card.icon}
                </span>
                <h3 className="mt-8 text-[20px] font-medium leading-[28px] text-ink">
                  {card.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[26px] text-body">{card.body}</p>
              </Card>
            </GroupItem>
          ))}
        </Group>
      </Shell>
    </Section>
  );
}

/* ============================================================
   5 — Meet Our Founder (#founder)
   ============================================================ */

function Founder() {
  return (
    <Section id="founder">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[400px_1fr] lg:gap-20">
          <Wipe className="border border-hairline bg-surface-2 lg:self-start">
            <Image
              src="/founder.png"
              alt="Mr. Vividh Chaturvedi, Founder and CEO of SIF Insight"
              width={FOUNDER_PHOTO.width}
              height={FOUNDER_PHOTO.height}
              className="block h-auto w-full"
            />
          </Wipe>

          <div>
            <Rise>
              <Eyebrow>Meet Our Founder</Eyebrow>
            </Rise>
            <LineReveal as="h2" lines={["Mr. Vividh Chaturvedi"]} className={H2} />

            <Rise delay={0.1}>
              <p className="mt-4 text-[17px] leading-[30px] text-muted">
                {SITE.founder.title}
              </p>
              <p className="mt-6 max-w-[58ch] text-[17px] leading-[30px] text-body">
                Vividh is a Certified Financial Planner (CFP®) and an MBA, with
                over 25 years spent across financial services and international
                business.
              </p>
              <p className="mt-5 max-w-[58ch] text-[17px] leading-[30px] text-body">
                His working knowledge of Indian markets spans equities, bonds
                and commodities, with an active interest in equity derivatives
                and algorithmic trading — the machinery a long-short SIF is
                built from.
              </p>
              <p className="mt-5 max-w-[58ch] text-[17px] leading-[30px] text-body">
                He started SIF Insight to bring the new SIF category’s
                strategies, products and risks together on one platform, so
                investors can understand and navigate it more easily.
              </p>
            </Rise>

            <Group className="mt-12 grid gap-x-10 sm:grid-cols-3">
              {CREDENTIALS.map((item) => (
                <GroupItem key={item.term} className="border-t border-hairline py-6">
                  <p className="text-[17px] font-medium leading-[26px] text-ink">{item.term}</p>
                  <p className="mt-2 text-[14px] leading-[20px] text-muted">{item.detail}</p>
                </GroupItem>
              ))}
            </Group>

            {SITE.socials.linkedin ? (
              <Rise delay={0.1} className="mt-8">
                <a
                  href={SITE.socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[15px] font-medium text-accent underline decoration-hairline underline-offset-4 hover:decoration-current"
                >
                  View profile on LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Rise>
            ) : null}
          </div>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   7 — SIF Insight by Platizio
   ============================================================ */

function Platizio() {
  return (
    <Section>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>{SITE.legalEntity}</Eyebrow>
            </Rise>
            <LineReveal as="h2" lines={["SIF Insight", "by Platizio"]} className={H2} />
          </div>
          <div className="lg:self-end">
            <Rise delay={0.12}>
              <p className="max-w-[58ch] text-[17px] leading-[30px] text-body">
                SIF Insight is an initiative of Platizio Services LLP, created
                to build a dedicated research, education and discovery platform
                for India’s Specialised Investment Fund ecosystem.
              </p>
            </Rise>
            <Rule className="mt-10" delay={0.18} />
            <Rise delay={0.22}>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[14px] leading-[20px] text-muted">Registration</dt>
                  <dd className="mt-1 text-[15px] leading-[24px] text-ink">{SITE.arnLine}</dd>
                </div>
                <div>
                  <dt className="text-[14px] leading-[20px] text-muted">Our role</dt>
                  <dd className="mt-1 text-[15px] leading-[24px] text-ink">
                    Distributor, not an investment adviser.{" "}
                    <Link
                      href="/regulatory-disclosures"
                      className="text-accent underline decoration-hairline underline-offset-4 hover:decoration-current"
                    >
                      Regulatory disclosures
                    </Link>
                  </dd>
                </div>
              </dl>
            </Rise>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

/* ============================================================
   8 — Have Questions About SIFs? (#connect)
   A simple closing section, ConsultCta-shaped, with three plain actions.
   ============================================================ */

/* Same pill as <Button> (primitives BUTTON_BASE + glass), written out for the
   two actions that leave the site — <Button> is a next/link. */
const PILL =
  "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] glass glass-ghost text-ink";

function Connect() {
  return (
    <Section id="connect">
      <Shell>
        <div className="border border-hairline bg-accent-wash p-8 sm:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
            <div>
              <Rise>
                <Eyebrow>Connect With Us</Eyebrow>
              </Rise>
              <LineReveal
                as="h2"
                lines={["Have Questions", "About SIFs?"]}
                className="mt-6 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.22] text-ink"
              />
              <Rise delay={0.14}>
                <p className="mt-6 max-w-[52ch] text-[17px] leading-[30px] text-body">
                  Connect with the SIF Insight team to understand the SIF
                  ecosystem, explore available options or learn more about the
                  platform.
                </p>
              </Rise>
            </div>

            <Rise delay={0.22}>
              <ul className="flex list-none flex-col items-start gap-3 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch">
                <li>
                  <Button href={PRIMARY_CTA.href} className="w-full justify-between">
                    {PRIMARY_CTA.label}
                  </Button>
                </li>
                <li>
                  <a
                    href={whatsappHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${PILL} w-full justify-between`}
                  >
                    <span>WhatsApp Us</span>
                    <WhatsAppIcon size={16} />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
                <li>
                  <a href={mailtoHref} className={`${PILL} w-full justify-between`}>
                    <span>Email Us</span>
                    <MailIcon size={16} />
                  </a>
                </li>
              </ul>
            </Rise>
          </div>

          <Rise delay={0.28}>
            <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-6 text-[14px] leading-[20px] text-muted">
              <span className="inline-flex items-center gap-2">
                <PhoneIcon size={14} />
                <span className="tabular">{SITE.phoneDisplay}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <MailIcon size={14} />
                {SITE.email}
              </span>
            </p>
          </Rise>
        </div>
      </Shell>
    </Section>
  );
}
