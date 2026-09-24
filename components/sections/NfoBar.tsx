import { activeNfos, navLastUpdated, upcomingNfos } from "@/lib/data";

import { NfoTicker, type TickerNfo } from "./NfoTicker";

/**
 * Section 0 — the live NFO ticker. SERVER component; the strip itself is
 * <NfoTicker>.
 *
 * It lives in the root layout, so whatever it imports ships on every page.
 * That is why it is split: this half reads `@/lib/data` on the server and
 * hands the client half only the few fields it renders, instead of the client
 * half importing the data layer and dragging the full NAV history into the
 * chunk every route loads.
 *
 * The ticker gets two kinds of offer: the ones open at build time, and the
 * announced ones that state a full window — the only kind that can open
 * before the next deploy. It decides which are open on the reader's own
 * clock; an announced offer with no dates can never become open without a
 * rebuild, so it is not sent.
 */
export function NfoBar() {
  const candidates = [
    ...activeNfos,
    ...upcomingNfos.filter((n) => n.opensOn && n.closesOn),
  ];

  // Nothing that could be open before the next build: ship no client strip.
  if (candidates.length === 0) return null;

  const nfos: TickerNfo[] = candidates.map(({ id, title, active, opensOn, closesOn }) => ({
    id,
    title,
    active,
    opensOn,
    closesOn,
  }));

  return <NfoTicker nfos={nfos} builtOn={navLastUpdated} />;
}
