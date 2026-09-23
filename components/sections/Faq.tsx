import { faqs } from "@/lib/data";

import { FaqClient } from "./FaqClient";

/**
 * The FAQ section. SERVER wrapper: it reads the questions from `@/lib/data`
 * and passes them to the client island as plain objects, so the island's
 * bundle carries no data layer. See FaqClient.tsx for the section itself.
 */
export function Faq() {
  return <FaqClient faqs={faqs} />;
}
