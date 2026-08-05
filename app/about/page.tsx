import type { Metadata } from "next";
import Image from "next/image";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Group, GroupItem, Rise, Rule, Wipe } from "@/components/motion/Reveal";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { formatUpdated, navLastUpdated, stats } from "@/lib/data";

/**
 * /about
 *
 * The page this replaces carried "Vision / Mission / Goal" copy lifted from a
 * social-network template — "connect with others who share their interests and
 * passions", "real-time chat". None of it described this business. It is gone.
 *
 * Everything below is either a verified fact about the firm and its founder or
 * a count derived from `@/lib/data`. No awards, no client numbers, no AUM, no
 * testimonials, no team roster, no offices — because none of those are known.
 */

export const metadata: Metadata = {
  title: "About",
  description:
    "SIF Insight is operated by Platizio Services LLP, a certified distributor of Mutual Funds and SIFs, founded by Vividh Chaturvedi, CFP®. We track every Specialised Investment Fund scheme in the Indian market.",
  alternates: { canonical: "/about" },
};

/** The founder photo is a 400×400 asset; dimensions are explicit for CLS. */
const FOUNDER_PHOTO = { width: 400, height: 400 } as const;

/** ₹10,00,000 expressed in lakh — the unit SEBI's framework is quoted in. */
const MIN_LAKH = stats.minInvestment / 100_000;

const WHAT_WE_DO = [
  {
    title: "Track every scheme",
    body: `All ${stats.strategyCount} SIF strategies from ${stats.amcCount} asset managers, held in one place rather than scattered across eight AMC sites.`,
  },
  {
    title: "Publish the NAVs",
    body: "Net asset values as they are filed with AMFI — and an honest blank where a scheme has not launched yet.",
  },
  {
    title: "Surface the disclosures",
    body: "Risk band, exit load, expense ratio and minimum investment on every scheme we cover. That is the material detail, not decoration.",
  },
  {
    title: "Help you shortlist",
    body: "We map your goals and risk comfort to the schemes that fit, then show you the disclosures behind each one.",
  },
];

const CREDENTIALS = [
  { term: "CFP®", detail: "Certified Financial Planner" },
  { term: "MBA", detail: "Master of Business Administration" },
  {
    term: "Over 25 years",
    detail: "Across financial services and international business",
  },
];

type Figure = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

const COVERAGE: Figure[] = [
  { value: stats.amcCount, label: "Asset managers covered" },
  { value: stats.strategyCount, label: "Strategies tracked" },
  {
    value: MIN_LAKH,
    prefix: "₹",
    suffix: " L",
    label: "Minimum investment, set by SEBI",
  },
  {
    value: stats.maxUnhedgedShortPct,
    suffix: "%",
    label: "Max unhedged short exposure",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        lines={["India’s independent", "record of the SIF market."]}
        standfirst={
          <>
            SIF Insight is operated by Platizio Services LLP, a certified
            distributor of Mutual Funds and SIFs. We follow every Specialised
            Investment Fund scheme in the market, publish the NAVs as AMFI files
            them, and put the disclosures where you can read them side by side.
          </>
        }
        meta={[
          "Platizio Services LLP",
          `${stats.strategyCount} schemes tracked`,
          `${stats.amcCount} asset managers`,
        ]}
        aside={
          <Card className="p-8">
            <p className="text-[14px] leading-[20px] text-muted">Our role</p>
            <p className="mt-4 text-[17px] leading-[30px] text-body">
              A certified distributor of Mutual Funds and SIFs. We are not an
              asset manager and not an investment adviser, and nothing here is
              advice or a recommendation to buy a scheme.
            </p>
          </Card>
        }
      />

      <Founder />
      <WhatWeDo />
      <Coverage />
      <ConsultCta lines={["Consult us before", "you commit."]} />
    </>
  );
}

/**
 * The founder block. The photo is the page's one piece of media, so it gets
 * the clip-path <Wipe> — the frame opens and the portrait settles, rather
 * than a fade, which is the technique this tier is built on.
 */
function Founder() {
  return (
    <Section>
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[400px_1fr] lg:gap-20">
          {/* self-start: the grid row is as tall as the bio beside it, and a
              stretched panel left ~90px of empty surface under the portrait. */}
          <Wipe className="border border-hairline bg-surface-2 lg:self-start">
            <Image
              src="/founder.png"
              alt="Vividh Chaturvedi, Founder and CEO of SIF Insight"
              width={FOUNDER_PHOTO.width}
              height={FOUNDER_PHOTO.height}
              className="block h-auto w-full"
            />
          </Wipe>

          <div>
            <Rise>
              <Eyebrow>Founder</Eyebrow>
            </Rise>

            <LineReveal
              as="h2"
              lines={["Vividh Chaturvedi"]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />

            <Rise delay={0.1}>
              <p className="mt-4 text-[17px] leading-[30px] text-body">
                Founder &amp; CEO
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
                actually built from.
              </p>
            </Rise>

            <Group className="mt-12 grid gap-x-10 gap-y-0 sm:grid-cols-3">
              {CREDENTIALS.map((item) => (
                <GroupItem
                  key={item.term}
                  className="border-t border-hairline py-6"
                >
                  <p className="text-[17px] font-medium leading-[26px] text-ink">
                    {item.term}
                  </p>
                  <p className="mt-2 text-[14px] leading-[20px] text-muted">
                    {item.detail}
                  </p>
                </GroupItem>
              ))}
            </Group>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

function WhatWeDo() {
  return (
    <Section>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>What we do</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Four jobs, and", "nothing else."]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              SIF Insight is a distributor. We do not run money and we do not
              rate schemes — we make the market legible, then help you choose
              inside it.
            </p>
          </Rise>
        </div>

        <ol className="mt-16 grid list-none gap-x-16 sm:grid-cols-2">
          {WHAT_WE_DO.map((item, i) => (
            <li key={item.title} className="border-t border-hairline">
              <Rise delay={i * 0.06} className="py-8">
                {/* A label, not a quantity — static tabular type, never an
                    odometer. Rolling "02" would imply it was measured. */}
                <p aria-hidden="true" className="tabular text-[14px] leading-[20px] text-muted">
                  0{i + 1}
                </p>
                <h3 className="mt-4 text-[22px] font-medium leading-[30px] text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-[17px] leading-[30px] text-body">
                  {item.body}
                </p>
              </Rise>
            </li>
          ))}
        </ol>

        <Rise delay={0.1}>
          <p className="mt-12 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            NAV data fetched from AMFI. Updated daily. Latest values as of{" "}
            {formatUpdated(navLastUpdated)} — see the{" "}
            <a
              href="https://www.amfiindia.com/sif"
              target="_blank"
              rel="noopener noreferrer"
              className="text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
            >
              AMFI SIF portal
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            . Coverage is prepared from information currently in the public
            domain; official AMC documentation for several SIFs is still
            awaited.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

/**
 * The coverage strip. Odometers fire once, land on the real value and stop —
 * a figure that keeps ticking implies live data, which for SIF disclosure is
 * a compliance problem. Hence the as-of line beneath.
 */
function Coverage() {
  return (
    <Section>
      <Shell>
        <Rise>
          <Eyebrow>Coverage</Eyebrow>
        </Rise>
        <LineReveal
          as="h2"
          lines={["The market we cover,", "counted."]}
          className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
        />

        <Group className="mt-16 grid gap-x-12 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {COVERAGE.map((item) => (
            <GroupItem
              key={item.label}
              className="border-t border-hairline pt-7 pb-2"
            >
              <Odometer
                value={item.value}
                prefix={item.prefix}
                suffix={item.suffix}
                className="text-[clamp(40px,4.4vw,60px)] font-medium leading-[1.06] text-ink"
              />
              <p className="mt-4 text-[17px] leading-[26px] text-body">
                {item.label}
              </p>
            </GroupItem>
          ))}
        </Group>

        <Rule className="mt-14" delay={0.2} />
        <Rise delay={0.26}>
          <p className="mt-6 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            Counts as of {formatUpdated(navLastUpdated)}, derived from the
            schemes we track. The ₹10 lakh minimum and the 25% cap on unhedged
            short exposure are set by SEBI’s SIF framework, not by us.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}
