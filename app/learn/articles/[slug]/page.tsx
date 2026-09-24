import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { ArticleBody } from "@/components/learn/ArticleBody";
import { TextLink } from "@/components/learn/TextLink";
import { Rise, Rule } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { articleBySlug, articles } from "@/lib/content";
import { FOOTER_DISCLAIMER_SHORT } from "@/lib/compliance";
import { formatUpdated } from "@/lib/format";

/**
 * /learn/articles/[slug] — one approved article.
 *
 * Every path is built at build time from the approved list; anything else is
 * a 404 (`dynamicParams = false`). An empty list is valid and builds no
 * article pages at all — the hub says so honestly in #articles.
 */

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return articles.map((a) => ({ slug: a.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  const url = `/learn/articles/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      images: "/opengraph-image.png",
      siteName: "SIF Insight",
      locale: "en_IN",
      type: "article",
      publishedTime: article.publishedAt,
      ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();

  return (
    <>
      <PageHeader
        eyebrow={article.category || "Articles & Insights"}
        lines={[article.title]}
        standfirst={article.description}
        meta={[
          <time key="p" dateTime={article.publishedAt} className="tabular">
            Published {formatUpdated(article.publishedAt)}
          </time>,
          ...(article.updatedAt
            ? [
                <time key="u" dateTime={article.updatedAt} className="tabular">
                  Updated {formatUpdated(article.updatedAt)}
                </time>,
              ]
            : []),
          <span key="r" className="tabular">
            {article.readingMinutes} min read
          </span>,
        ]}
      />

      <Section className="pt-0">
        <Shell>
          <div className="grid gap-12 lg:grid-cols-[1fr_280px] lg:gap-24">
            <article>
              <ArticleBody blocks={article.body} />
            </article>

            <aside className="lg:self-start">
              <Rise>
                <TextLink href="/learn#articles">All articles</TextLink>
              </Rise>
            </aside>
          </div>

          <Rule className="mt-16" />
          <Rise delay={0.1}>
            <div className="mt-6 grid max-w-[80ch] gap-3 text-[14px] leading-[24px] text-muted">
              <p>{article.provenance}</p>
              <p>
                This article is for information and education only. It is not
                investment advice or a recommendation to buy or sell any scheme.{" "}
                {FOOTER_DISCLAIMER_SHORT}
              </p>
            </div>
          </Rise>
          <Rise delay={0.16} className="mt-10">
            <TextLink href="/learn#articles">Back to Articles &amp; Insights</TextLink>
          </Rise>
        </Shell>
      </Section>

      <ConsultCta lines={["Questions about", "what you just read?"]} />
    </>
  );
}
