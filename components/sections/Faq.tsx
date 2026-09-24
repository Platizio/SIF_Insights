import { faqs as approvedFaqs } from "@/lib/data";
import type { Faq as FaqItem } from "@/lib/data/types";

import { FaqClient, type FaqCopy } from "./FaqClient";

/**
 * The FAQ section. SERVER wrapper: it reads the approved questions from
 * `@/lib/data` and passes them to the client island as plain objects, so the
 * island's bundle carries no data layer. See FaqClient.tsx for the section.
 *
 * Every prop is optional and defaults to the copy the home page has always
 * carried, so `<Faq />` with no props is unchanged. `/learn` passes its own
 * id (`#faqs`, the nav contract) and the PRD's heading.
 *
 * The CTA goes to `/contact`. It used to be `#consult`, which only resolved
 * on pages that happened to render a `<ConsultCta id="consult">` below it.
 */
export function Faq({
  items = approvedFaqs,
  id = "faq",
  eyebrow = "Questions",
  lines = ["Before you", "invest."],
  intro = "The category is new. These are the questions we are asked most often.",
  cta = { label: "Talk to us", href: "/contact" },
}: {
  items?: FaqItem[];
  id?: string;
  eyebrow?: string;
  lines?: string[];
  intro?: string;
  cta?: { label: string; href: string };
} = {}) {
  if (items.length === 0) return null;
  const copy: FaqCopy = { id, eyebrow, lines, intro, cta };
  return <FaqClient faqs={items} copy={copy} />;
}
