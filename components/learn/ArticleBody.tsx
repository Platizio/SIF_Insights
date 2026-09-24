import type { ArticleBlock } from "@/lib/content";

/**
 * An article's body blocks, at reading measure. Plain server markup — the
 * text is the content, so nothing here waits on JS to become visible.
 */
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="max-w-[68ch]">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={i}
                className="mt-14 text-[26px] font-medium leading-[34px] text-ink first:mt-0"
              >
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="mt-8 border-l border-accent pl-6 text-[20px] leading-[32px] text-ink first:mt-0"
              >
                {block.text}
              </blockquote>
            );
          case "ul":
            return (
              <ul
                key={i}
                className="mt-6 list-disc space-y-2 pl-6 text-[17px] leading-[30px] text-body marker:text-muted first:mt-0"
              >
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          default:
            return (
              <p
                key={i}
                className="mt-6 text-[17px] leading-[30px] text-body first:mt-0"
              >
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}
