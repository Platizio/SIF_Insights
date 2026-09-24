import type { Expert } from "@/lib/content";
import { TextLink } from "./TextLink";

/**
 * One expert conversation: Expert Name | Organisation / Role | Topic | link
 * (PRD p.65). The link is printed only when the conversation is actually on
 * the channel — an entry without a video says so rather than linking nowhere.
 */
export function ExpertCard({ expert }: { expert: Expert }) {
  const role = [expert.role, expert.organisation].filter(Boolean).join(", ");

  return (
    <article className="flex h-full flex-col justify-between gap-10 border border-hairline bg-surface p-7 sm:p-8">
      <div>
        <h3 className="text-[22px] font-medium leading-[30px] text-ink">
          {expert.name}
        </h3>
        {role ? (
          <p className="mt-2 text-[14px] leading-[20px] text-muted">{role}</p>
        ) : null}
        {expert.topic ? (
          <p className="mt-6 text-[17px] leading-[28px] text-body">
            {expert.topic}
          </p>
        ) : null}
      </div>
      <div className="border-t border-hairline pt-5">
        {expert.videoId ? (
          <TextLink
            href={`https://www.youtube.com/watch?v=${expert.videoId}`}
            external
            srSuffix={`conversation with ${expert.name}`}
          >
            Watch the conversation
          </TextLink>
        ) : (
          <p className="text-[14px] leading-[20px] text-muted">
            Recording not yet published.
          </p>
        )}
      </div>
    </article>
  );
}
