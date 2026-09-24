import nfoRaw from "./raw/nfo-news.json";

import { nfoStatus } from "@/lib/format";

import { navLastUpdated } from "./core";
import type { Nfo } from "./types";

/* ============================================================
   New fund offers.

   Status is DERIVED from the dates by `nfoStatus` (lib/format.ts —
   it lives there so the client ticker can re-run it against the
   reader's clock), never stored. A stored "open" is what kept three
   January windows on screen until September.

   The build-time lists below are measured against `navLastUpdated`,
   the site's one notion of "today", so a build is reproducible from
   its inputs. That makes them at most a business day stale — the
   nightly NAV commit rebuilds the site — and every surface that
   asserts liveness to a reader re-checks on the client as well
   (see components/sections/NfoTicker.tsx and lib/use-today.ts).
   ============================================================ */

const isEntry = (e: unknown): e is Nfo =>
  typeof e === "object" &&
  e !== null &&
  typeof (e as Nfo).id === "number" &&
  typeof (e as Nfo).title === "string" &&
  typeof (e as Nfo).active === "boolean";

/** Every offer on file, in file order. Element 0 of the JSON is a comment and is not one. */
export const nfos: Nfo[] = (nfoRaw as unknown[]).filter(isEntry);

/** Open on `navLastUpdated`, closing soonest first. */
export const activeNfos: Nfo[] = nfos
  .filter((n) => nfoStatus(n, navLastUpdated) === "open")
  .sort((a, b) => (a.closesOn ?? "").localeCompare(b.closesOn ?? ""));

/** Announced but not yet open on `navLastUpdated`; dated ones first, soonest first. */
export const upcomingNfos: Nfo[] = nfos
  .filter((n) => nfoStatus(n, navLastUpdated) === "upcoming")
  .sort((a, b) => {
    if (!a.opensOn || !b.opensOn) return a.opensOn ? -1 : b.opensOn ? 1 : 0;
    return a.opensOn.localeCompare(b.opensOn);
  });
