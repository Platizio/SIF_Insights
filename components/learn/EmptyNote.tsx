import type { ReactNode } from "react";
import { Rise } from "@/components/motion/Reveal";

/**
 * The honest empty state for a Learn section with nothing published yet.
 * The section and its anchor always exist (the header links to them); what
 * it holds is one plain sentence and somewhere real to go instead — never a
 * placeholder card or a "coming soon" tile dressed as content.
 */
export function EmptyNote({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Rise className="mt-14 border-t border-hairline pt-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-12">
        <p className="max-w-[60ch] text-[17px] leading-[30px] text-body">
          {children}
        </p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Rise>
  );
}
