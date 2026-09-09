import type { Metadata } from "next";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule, Wipe } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * /media
 *
 * One library now: the video explainers. They live off-site, so every card is
 * an external link — no embedded player (an iframe per card would ship ~1MB
 * of YouTube JS above the fold for content most visitors will not play).
 *
 * REMOVED DELIBERATELY: the old site listed a sixth video, `dQw4w9WgXcQ`,
 * titled "Understanding SIF Returns". That id is the Rickroll. It was
 * placeholder junk that shipped to production on a financial-services site.
 * It is not in the list below and must never be re-added.
 *
 * Also removed: the newsletter form. It had no action and no handler, so it
 * collected an email address and dropped it. We do not run a mailing list;
 * the page points at /contact instead of pretending otherwise.
 *
 * REMOVED IN THIS PASS — the whole "Written notes" section and both entries
 * in it. Re-verified live before deleting them: the two article URLs and the
 * `/blogs-1` index above them all return 404 (301 → www, then 404 from the
 * origin). They were rendered with the full editorial apparatus — title,
 * date, read-time, category, excerpt — wrapped around a dead page, which is
 * the most confident possible way to present nothing.
 *
 * The paths made it worse rather than better. `metadataBase` in
 * app/layout.tsx is `https://sifinsight.com`, so `sifinsight.com/blogs-1/…`
 * is a path on THIS APP'S OWN future origin, inherited from the legacy CMS
 * this app replaces. After cutover those links become 404s that this very
 * application serves, since no `/blogs-1` route exists here.
 *
 * The section went rather than the two entries because removing the entries
 * left a heading, a standfirst and an empty list — a promise of a library
 * with nothing in it. The closing note that used to sit under that list was
 * NOT deleted with it: it is load-bearing (it is what replaced the fake
 * newsletter form) and now closes the video section instead, with a sentence
 * added that says the notes are gone and why. Nothing was invented to fill
 * the gap; if written notes come back they come back with real URLs.
 */

export const metadata: Metadata = {
  title: "Media",
  description:
    "Video explainers on India's Specialised Investment Funds — SIF basics, minimum investment, market analysis and how SIFs differ from mutual funds.",
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

const CHANNEL = "https://www.youtube.com/@sifinsight";

export default function MediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Media"
        lines={["Explainers and analysis,", "on camera."]}
        standfirst={
          <>
            Everything we have published about the SIF category, in one list.
            The videos run on the SIF Insight channel and each card opens
            there. All of it is educational — none of it is advice or a
            recommendation to buy a scheme.
          </>
        }
        meta={[`${VIDEOS.length} videos`, "YouTube @sifinsight"]}
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
        <ul className="mt-16 grid list-none gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {VIDEOS.map((video, i) => (
            <li key={video.id} className={cn(i === 0 && "lg:col-span-2")}>
              <Rise delay={Math.min(i, 10) * 0.06} className="h-full">
                <VideoCard video={video} lead={i === 0} />
              </Rise>
            </li>
          ))}
        </ul>

        {/* This block closed the written-notes list until that list was
            removed. It moved rather than went with it: the mailing-list
            sentence is what stands in for the fake newsletter form this page
            used to carry, and deleting it would quietly re-open the question
            it answers. The first sentence is new, and is the page saying
            what happened to itself. */}
        <Rule className="mt-16" delay={0.1} />
        <Rise delay={0.16}>
          <p className="mt-6 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            Two written notes were listed here until recently. Both pointed at
            a blog that no longer answers — the two articles and the index
            above them all return 404 — so they were removed rather than left
            as a title, a date and a read-time wrapped around a dead page.
            Nothing has been written to replace them. We do not run a mailing
            list either, so there is nothing to subscribe to. If you want a
            specific scheme or document walked through, reach us directly —
            the details are on the contact page.
          </p>
        </Rise>
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
          {/*
            `bg-surface-2` here is the FALLBACK, and the `after:` utilities on
            the image are what make it visible.

            These five stills are the only third-party asset on the site. When
            img.youtube.com is unreachable — a blocked network, an outage, a
            video taken down — the <img> fails. `aspect-video` already held the
            box open so nothing reflowed, which was the important half; what
            was left inside it was Chrome's own broken-image icon in the top
            corner, which is the exact thing this is supposed to stop looking
            like.

            A pseudo-element only gets a box on a BROKEN image: a loaded <img>
            is a replaced element and renders no ::after at all. Measured, not
            assumed — computed ::after width came back as the image's width
            when the request was aborted and `auto` (no box) when it loaded.
            So `after:inset-0 after:bg-surface-2` is a mask that exists only in
            the failure case: it covers the UA icon and leaves a flat tinted
            field, with the play mark below still sitting on top of it.

            The result reads as a video card that has no art rather than as a
            page that is broken, and it is the same surface tone the empty
            states elsewhere on the site use. It also costs nothing when the
            image loads normally.

            NO TEXT in the fallback, deliberately. A "thumbnail unavailable"
            label would flash during every ordinary lazy load and would be
            asserting something false for as long as it showed. A field that
            claims nothing is true in both states, which is the only way this
            stays a nicety instead of becoming a new defect.
          */}
          <div className="relative bg-surface-2">
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
              className="relative block aspect-video w-full object-cover grayscale-[0.55] transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/link:grayscale-0 after:absolute after:inset-0 after:bg-surface-2 after:content-['']"
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
