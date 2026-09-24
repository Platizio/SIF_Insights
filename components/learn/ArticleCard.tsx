import type { Article } from "@/lib/content";
import { formatUpdated } from "@/lib/format";
import { TextLink } from "./TextLink";

/**
 * Article Title | Short Description | Published Date | Read More (PRD p.65).
 * The title is itself the link; "Read more" repeats it for the reader who
 * scans to the foot of the card, and carries the title for screen readers so
 * a list of them is not six identical "Read more" links.
 */
export function ArticleCard({ article }: { article: Article }) {
  const href = `/learn/articles/${article.slug}`;

  return (
    <article className="flex h-full flex-col justify-between gap-10 border border-hairline bg-surface p-7 sm:p-8">
      <div>
        <p className="tabular text-[14px] leading-[20px] text-muted">
          <time dateTime={article.publishedAt}>
            {formatUpdated(article.publishedAt)}
          </time>
          <span aria-hidden="true"> · </span>
          {article.readingMinutes} min read
        </p>
        <h3 className="mt-5 text-[22px] font-medium leading-[30px] text-ink">
          {article.title}
        </h3>
        <p className="mt-4 text-[17px] leading-[28px] text-body">
          {article.description}
        </p>
      </div>
      <div className="border-t border-hairline pt-5">
        <TextLink href={href} srSuffix={article.title}>
          Read more
        </TextLink>
      </div>
    </article>
  );
}
