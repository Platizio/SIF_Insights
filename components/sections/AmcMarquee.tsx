import { amcs } from "@/lib/data";

import { AmcMarqueeClient } from "./AmcMarqueeClient";

/**
 * The AMC strip. SERVER wrapper: it reads the houses from `@/lib/data` and
 * passes them to the client island as plain objects, so the island's bundle
 * carries no data layer. See AmcMarqueeClient.tsx for the strip itself.
 */
export function AmcMarquee() {
  return <AmcMarqueeClient amcs={amcs} />;
}
