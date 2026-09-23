import { navLastUpdated, stats } from "@/lib/data";

import { HeroClient } from "./HeroClient";

/**
 * The homepage hero. SERVER wrapper: it reads the three trust-cluster figures
 * from `@/lib/data` and passes them to the client island as plain numbers, so
 * the island's bundle carries no data layer. See HeroClient.tsx for the hero
 * itself.
 */
export function Hero() {
  return (
    <HeroClient
      figures={{
        amcCount: stats.amcCount,
        strategyCount: stats.strategyCount,
        navLastUpdated,
      }}
    />
  );
}
