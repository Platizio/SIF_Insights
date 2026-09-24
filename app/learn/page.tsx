import type { Metadata } from "next";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { ArticleCard } from "@/components/learn/ArticleCard";
import { EmptyNote } from "@/components/learn/EmptyNote";
import { ExpertCard } from "@/components/learn/ExpertCard";
import { LearnSubNav } from "@/components/learn/LearnSubNav";
import { SectionHead } from "@/components/learn/SectionHead";
import { TextLink } from "@/components/learn/TextLink";
import { Group, GroupItem } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { Faq } from "@/components/sections/Faq";
import { VideoCard } from "@/components/video/VideoCard";
import { articles, channel, experts, videos } from "@/lib/content";
import { faqs } from "@/lib/data";

/**
 * /learn — the Knowledge Hub (PRD pp.64–67).
 *
 * Flow, per the PRD: heading → Video Library → Expert Conversations →
 * Articles & Insights → FAQs. The four section ids are the contract the
 * header's Learn dropdown links to (spec §4), so every section renders in
 * every state: a section with nothing published yet says so in one line and
 * points somewhere real, rather than disappearing and leaving the header
 * link pointing at nothing.
 *
 * Only signed-off editorial content reaches this page: `lib/content` exports
 * approved experts and articles only, and `faqs` excludes unapproved answers.
 */

const DESCRIPTION =
  "Explore videos, expert conversations, articles and FAQs designed to help you better understand SIFs, strategies and the evolving SIF market.";

export const metadata: Metadata = {
  title: "Learn",
  description: DESCRIPTION,
  alternates: { canonical: "/learn" },
  /* `openGraph` repeats siteName/locale/type/images because Next merges
     metadata shallowly: declaring the key replaces the root layout's block. */
  openGraph: {
    title: "Learn with SIF Insight",
    description: DESCRIPTION,
    url: "/learn",
    images: "/opengraph-image.png",
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default function LearnPage() {
  return (
    <>
      <PageHeader
        eyebrow="Learn"
        lines={["Learn with", "SIF Insight"]}
        standfirst={DESCRIPTION}
        meta={[
          plural(videos.length, "video", "videos"),
          plural(articles.length, "article", "articles"),
          plural(faqs.length, "answered question", "answered questions"),
        ]}
        aside={<LearnSubNav />}
      />

      <VideoLibrary />
      <ExpertConversations />
      <ArticlesInsights />

      {faqs.length > 0 ? (
        <Faq
          items={faqs}
          id="faqs"
          eyebrow="FAQs"
          lines={["Frequently Asked", "Questions"]}
          intro="Quick answers to the questions investors ask us most often about SIFs."
          cta={{ label: "Book a Consultation", href: "/contact" }}
        />
      ) : (
        <Section id="faqs">
          <Shell>
            <SectionHead eyebrow="FAQs" lines={["Frequently Asked", "Questions"]} />
            <EmptyNote
              action={<TextLink href="/what-is-sif">What is a SIF</TextLink>}
            >
              Answers to common investor questions will appear here once they
              have been reviewed.
            </EmptyNote>
          </Shell>
        </Section>
      )}

      <ConsultCta lines={["Still have questions", "about SIFs?"]} />
    </>
  );
}

/* ============================================================
   1 — Video Library
   ============================================================ */

function VideoLibrary() {
  const channelLink = (
    <TextLink href={channel.url} external>
      View all on YouTube
    </TextLink>
  );

  return (
    <Section id="videos">
      <Shell>
        <SectionHead
          eyebrow="Video Library"
          lines={["SIF Insight", "Video Library"]}
          intro="Explainers, factsheet walk-throughs and strategy breakdowns from the SIF Insight channel. Watch here, or on YouTube."
          action={channelLink}
        />

        {videos.length > 0 ? (
          <ul className="mt-16 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {videos.map((video) => (
              <li key={video.id} className="h-full">
                <VideoCard
                  id={video.id}
                  title={video.title}
                  durationSec={video.durationSec}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote action={channelLink}>
            Videos from the SIF Insight channel will appear here as they are
            published.
          </EmptyNote>
        )}
      </Shell>
    </Section>
  );
}

/* ============================================================
   2 — Expert Conversations
   ============================================================ */

function ExpertConversations() {
  return (
    <Section id="experts">
      <Shell>
        <SectionHead
          eyebrow="Expert Conversations"
          lines={["Expert", "Conversations"]}
          intro="Interviews and discussions with fund managers, AMC representatives and other industry experts on how SIF strategies are built and run."
        />

        {experts.length > 0 ? (
          <Group className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {experts.map((expert) => (
              <GroupItem key={expert.id} className="h-full">
                <ExpertCard expert={expert} />
              </GroupItem>
            ))}
          </Group>
        ) : (
          <EmptyNote
            action={
              <TextLink href={channel.url} external>
                Visit the channel
              </TextLink>
            }
          >
            Conversations with fund managers and industry experts will appear
            here as they are published.
          </EmptyNote>
        )}
      </Shell>
    </Section>
  );
}

/* ============================================================
   3 — Articles & Insights
   ============================================================ */

function ArticlesInsights() {
  return (
    <Section id="articles">
      <Shell>
        <SectionHead
          eyebrow="Articles & Insights"
          lines={["Articles &", "Insights"]}
          intro="Written explainers on SIF basics, strategies, fund developments and investor education."
        />

        {articles.length > 0 ? (
          <Group className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <GroupItem key={article.slug} className="h-full">
                <ArticleCard article={article} />
              </GroupItem>
            ))}
          </Group>
        ) : (
          <EmptyNote
            action={<TextLink href="/what-is-sif">What is a SIF</TextLink>}
          >
            Articles are being reviewed before they are published. In the
            meantime, our explainer covers what a SIF is and how the category
            works.
          </EmptyNote>
        )}
      </Shell>
    </Section>
  );
}
