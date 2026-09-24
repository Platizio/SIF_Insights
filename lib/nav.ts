/* ============================================================
   The site's navigation tree — header, mobile panel and footer all read
   it from here, so a route renamed once is renamed everywhere.

   Order and labels are the PRD's (p.8): Home · SIF Tracker ▾ · SIF
   Screener · Compare · AMCs · Learn ▾ · About Us, with "Book a
   Consultation" as the persistent CTA.

   Hash children are a contract with the pages that own the anchors
   (/sif-tracker and /learn render these ids). Renaming an `id` there
   without changing it here breaks the dropdown silently — the link still
   lands on the page, just at the top.

   Client-safe: plain literals only.
   ============================================================ */

export type NavChild = { label: string; href: string; description?: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };
export type NavLink = { label: string; href: string };

export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "SIF Tracker",
    href: "/sif-tracker",
    children: [
      { label: "Market snapshot", href: "/sif-tracker#snapshot" },
      { label: "Live NFOs", href: "/sif-tracker#live-nfos" },
      { label: "Upcoming SIFs", href: "/sif-tracker#upcoming" },
      { label: "Performance", href: "/sif-tracker#performance" },
      { label: "Latest NAVs", href: "/sif-tracker#latest-navs" },
    ],
  },
  { label: "SIF Screener", href: "/sif-screener" },
  { label: "Compare", href: "/compare" },
  { label: "AMCs", href: "/amc" },
  {
    label: "Learn",
    href: "/learn",
    children: [
      { label: "Video Library", href: "/learn#videos" },
      /* Kept even while the list is empty: /learn always renders #experts,
         with an honest line when there are no entries yet. */
      { label: "Expert Conversations", href: "/learn#experts" },
      { label: "Articles & Insights", href: "/learn#articles" },
      { label: "FAQs", href: "/learn#faqs" },
      { label: "What is a SIF", href: "/what-is-sif" },
      { label: "SIF Strategies", href: "/strategies" },
      { label: "Downloads", href: "/downloads" },
    ],
  },
  { label: "About Us", href: "/about" },
];

export const PRIMARY_CTA = { label: "Book a Consultation", href: "/contact" } as const;

export const FOOTER_QUICK_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "SIF Tracker", href: "/sif-tracker" },
  { label: "SIF Screener", href: "/sif-screener" },
  { label: "Compare SIFs", href: "/compare" },
  { label: "AMCs", href: "/amc" },
  { label: "Learn", href: "/learn" },
  { label: "About Us", href: "/about" },
  { label: PRIMARY_CTA.label, href: PRIMARY_CTA.href },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Regulatory Disclosures", href: "/regulatory-disclosures" },
];

/** The path part of an href — `/learn#videos` → `/learn`. */
export function hrefPath(href: string): string {
  const cut = href.search(/[?#]/);
  return cut === -1 ? href : href.slice(0, cut);
}

/**
 * Is `href` the current section?
 *
 * Section-aware: /strategies/equity still lights "SIF Strategies", and a
 * dropdown's hub lights when the reader is on any of its children's pages
 * (see `isNavItemActive`). "/" matches only itself, or it would light on
 * every route.
 */
export function isPathActive(pathname: string, href: string): boolean {
  const path = hrefPath(href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return (
    isPathActive(pathname, item.href) ||
    (item.children ?? []).some((child) => isPathActive(pathname, child.href))
  );
}
