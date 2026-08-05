import type { Metadata } from "next";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, RowListItem, Rule, Wipe } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * /media
 *
 * Two libraries: the video explainers and the written notes. Both are real
 * and both live off-site, so every card is an external link — no embedded
 * player (an iframe per card would ship ~1MB of YouTube JS above the fold
 * for content most visitors will not play).
 *
 * REMOVED DELIBERATELY: the old site listed a sixth video, `dQw4w9WgXcQ`,
 * titled "Understanding SIF Returns". That id is the Rickroll. It was
 * placeholder junk that shipped to production on a financial-services site.
 * It is not in the list below and must never be re-added.
 *
 * Also removed: the newsletter form. It had no action and no handler, so it
 * collected an email address and dropped it. We do not run a mailing list;
 * the page points at /contact instead of pretending otherwise.
 */

export const metadata: Metadata = {
  title: "Media",
  description:
    "Video explainers and written notes on India's Specialised Investment Funds — SIF basics, minimum investment, market analysis and how SIFs differ from mutual funds.",
  alternates: { canonical: "/media" },
};

type Video = { id: string; title: string };

const VIDEOS: Video[] = [
  { id: "UVpPGY8GuPQ", title: "SIF vs Mutual Funds Strategies" },
  { id: "Y6wZcsjc17s", title: "Investment Insight & SIF Basics" },
  { id: "OfF8djLO9Rg", title: "SIF Market Analysis" },
  { id: "Ea2M4Ds7zmk", title: "Minimum Investment in SIFs Explained" },
  { id: "HQ4N1ZuZLNM", title: "Expert Investment Tips for SIFs" },
];

type Post = {
  title: string;
  /** Machine-readable date for <time>. */
  iso: string;
  /** Rendered label. Written out rather than parsed from `iso`, because
      `new Date("2025-01-15")` is UTC midnight and would render as the 14th
      on any server west of Greenwich. */
  date: string;
  readTime: string;
  category: string;
  excerpt: string;
  href: string;
};

const POSTS: Post[] = [
  {
    title:
      "What are Specialized Investment Funds (SIFs)? A Beginner’s Guide",
    iso: "2025-01-15",
    date: "15 Jan 2025",
    readTime: "5 min read",
    category: "SIF Basics",
    excerpt:
      "Learn everything you need to know about SIFs, India's newest SEBI-regulated investment category. Understand the basics, benefits, and how they differ from traditional mutual funds.",
    href: "https://sifinsight.com/blogs-1/f/what-are-specialized-investment-funds-sifs-a-beginner%E2%80%99s-guide",
  },
  {
    title: "Minimum Investment in SIFs: What Does ₹10 Lakh Get You?",
    iso: "2025-01-10",
    date: "10 Jan 2025",
    readTime: "4 min read",
    category: "Investment Guide",
    excerpt:
      "Understanding the value proposition of the Rs 10 lakh minimum investment in Specialised Investment Funds. Discover what returns and benefits you can expect.",
    href: "https://sifinsight.com/blogs-1/f/minimum-investment-in-sifs-what-does-%E2%82%B910-lakh-get-you",
  },
];

const CHANNEL = "https://www.youtube.com/@sifinsight";

export default function MediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        lines={["Explainers, analysis,", "and written notes."]}
        standfirst={
          <>
            Everything we have published about the SIF category, in one list.
            The videos run on the SIF Insight channel; the written notes sit on
            the SIF Insight blog. All of it is educational — none of it is
            advice or a recommendation to buy a scheme.
          </>
        }
        meta={[
          `${VIDEOS.length} videos`,
          `${POSTS.length} written notes`,
          "YouTube @sifinsight",
        ]}
        aside={
          <Card className="p-8">
            <p className="text-[14px] leading-[20px] text-muted">
              Watch the channel
            </p>
            <p className="mt-4 text-[17px] leading-[30px] text-body">
              New explainers are posted to YouTube first.
            </p>
            <a
              href={CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-2 text-[17px] leading-[26px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
            >
              youtube.com/@sifinsight
              <ArrowGlyph />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Card>
        }
      />

      <Videos />
      <Written />
      <ConsultCta lines={["Prefer a conversation", "to a video?"]} />
    </>
  );
}

function Videos() {
  return (
    <Section id="videos">
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>Video</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["The category,", "explained on camera."]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              Short sessions on what a SIF is, what the ₹10 lakh minimum buys,
              and where the category sits against mutual funds. Each opens on
              YouTube.
            </p>
          </Rise>
        </div>

        {/* The lead video takes two columns; the remaining four fill the
            3-up grid exactly. Asymmetric by construction — never a 50/50. */}
        <ul className="mt-16 grid list-none gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((video, i) => (
            <li key={video.id} className={cn(i === 0 && "lg:col-span-2")}>
              <Rise delay={Math.min(i, 10) * 0.06} className="h-full">
                <VideoCard video={video} lead={i === 0} />
              </Rise>
            </li>
          ))}
        </ul>
      </Shell>
    </Section>
  );
}

function VideoCard({ video, lead }: { video: Video; lead: boolean }) {
  return (
    <TiltCard className="h-full">
      <a
        href={`https://www.youtube.com/watch?v=${video.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group/link flex h-full flex-col"
      >
        <Wipe>
          <div className="relative">
            {/*
              A plain <img>, not next/image: the thumbnails come from
              img.youtube.com, and whitelisting a remote host means editing
              the shared next.config.ts, which this page does not own.
              Explicit width/height still reserve the box, so CLS is zero.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="block aspect-video w-full object-cover grayscale-[0.55] transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/link:grayscale-0"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-5 left-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-chip text-ground"
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <path d="M1 1.5 11 7 1 12.5V1.5Z" fill="currentColor" />
              </svg>
            </span>
          </div>
        </Wipe>

        <div className="flex flex-1 flex-col justify-between gap-8 p-7">
          <h3
            className={cn(
              "font-medium text-ink",
              lead
                ? "text-[clamp(22px,2.2vw,28px)] leading-[1.3]"
                : "text-[22px] leading-[30px]",
            )}
          >
            {video.title}
          </h3>
          <span className="inline-flex items-center gap-2 text-[14px] leading-[20px] text-accent">
            Watch on YouTube
            <ArrowGlyph />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
        </div>
      </a>
    </TiltCard>
  );
}

function Written() {
  return (
    <Section id="notes">
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>Written</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["Notes from", "the blog."]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              Longer-form pieces on the SIF framework. Excerpts are the
              articles’ own; each opens on sifinsight.com.
            </p>
          </Rise>
        </div>

        <ul className="mt-16 list-none border-b border-hairline">
          {POSTS.map((post, i) => (
            <RowListItem
              key={post.href}
              index={i}
              className="border-t border-hairline"
            >
              <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid gap-6 py-10 lg:grid-cols-[220px_1fr] lg:gap-16"
              >
                <div>
                  <time
                    dateTime={post.iso}
                    className="tabular block text-[14px] leading-[20px] text-muted"
                  >
                    {post.date}
                  </time>
                  <p className="mt-2 text-[14px] leading-[20px] text-muted">
                    {post.category} · {post.readTime}
                  </p>
                </div>

                <div>
                  <h3 className="text-[22px] font-medium leading-[30px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent-dim">
                    {post.title}
                  </h3>
                  <p className="mt-4 max-w-[68ch] text-[17px] leading-[30px] text-body">
                    {post.excerpt}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[14px] leading-[20px] text-accent">
                    Read on sifinsight.com
                    <ArrowGlyph />
                    <span className="sr-only">(opens in a new tab)</span>
                  </span>
                </div>
              </a>
            </RowListItem>
          ))}
        </ul>

        <Rule className="mt-16" delay={0.1} />
        <Rise delay={0.16}>
          <p className="mt-6 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            We do not run a mailing list, so there is nothing to subscribe to.
            If you want a specific scheme or document walked through, reach us
            directly — the details are on the contact page.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

/** Hover moves on X, matching every other link affordance on the site. */
function ArrowGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover/link:translate-x-1"
    >
      <path
        d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
