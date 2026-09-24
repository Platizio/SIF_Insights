import { HeroClient } from "./HeroClient";

/**
 * The homepage hero. The island takes no props: since the PRD rebuild the
 * hero prints no market figures (the AMC/strategy counts and the NAV date
 * were struck in review), only brand copy and the SITE trust line. Kept as
 * a server entry point so app/page.tsx never imports a client file directly
 * and a future data-fed element has a place to be derived.
 */
export function Hero() {
  return <HeroClient />;
}
