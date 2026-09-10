import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Group, GroupItem, Rule } from "@/components/motion/Reveal";
import { Shell } from "@/components/primitives";
import { stats } from "@/lib/data";

/**
 * The sign-off. Server Component — the year is computed at render.
 *
 * Entries without an `href` are pages that have not been published yet. They
 * render as plain text with a `title` rather than as links to `#`, so the
 * footer never ships a dead link. Give them an `href` the day the page exists.
 */

type FooterLink = {
  label: string;
  href?: string;
  external?: boolean;
  /** Shown as a tooltip when the destination is not live yet. */
  pendingNote?: string;
};

type FooterColumn = { heading: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    heading: "Explore",
    links: [
      { label: "What is a SIF", href: "/what-is-sif" },
      { label: "SIF Tracker", href: "/sif-tracker" },
      { label: "NAV Tracker", href: "/nav-tracker" },
      { label: "AMCs", href: "/amc" },
    ],
  },
  {
    heading: "Strategies",
    links: [
      { label: `Equity (${stats.equityCount})`, href: "/strategies/equity" },
      { label: `Hybrid (${stats.hybridCount})`, href: "/strategies/hybrid" },
      // The page exists and says so honestly; the category is genuinely empty.
      { label: "Debt — soon", href: "/strategies/debt" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Media", href: "/media" },
      { label: "Downloads", href: "/downloads" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Regulatory",
    links: [
      {
        label: "SEBI SIF Circular",
        href: "https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html",
        external: true,
      },
      {
        label: "AMFI SIF Portal",
        href: "https://www.amfiindia.com/sif",
        external: true,
      },
    ],
  },
];

/* The "still awaited" clause is DERIVED, never asserted.

   Asserted, it shipped on all 30 routes claiming AMC documents were awaited
   while the pages above it named the information documents those very fields
   were read from — a contradiction a reader could spot from one screen.
   Counted here, the sentence retires itself the day the gap closes and comes
   back the day a scheme arrives with no document behind it.

   `disclosedCount`, not the stricter `fullyDisclosedCount`: the clause is
   about whether a DOCUMENT is still awaited, and disclosedCount is exactly
   "we have read one". Four schemes hold a document that simply does not state
   one of the four headline fields; calling their documents awaited would swap
   one false claim for another. The "not captured" sentence covers those. */
const undisclosedSchemes = stats.strategyCount - stats.disclosedCount;

/* `inline-block py-[5px]` is for the thumb, not the eye. The bare line box
   measured 21px tall on a phone, under the 24px minimum in WCAG 2.5.8, in
   the densest stack of links on the site. 5px top and bottom takes each row
   to 31px and, with the list's existing gap, leaves adjacent targets clearly
   separated.

   Stated in pixels, not `py-1`, for the same reason the header's hamburger
   is: app/globals.css sets the root to `clamp(15px, 1.1111vw, 19px)`, so a
   rem-based utility resolves SMALLER exactly where the target matters most —
   `py-1` is 3.75px at phone widths, not 4px. A tap target that shrinks on
   phones is the wrong way round.

   The underline wipe is positioned against the inner span, so padding on the
   anchor does not drag the rule away from the text. */
const LINK_CLASS =
  "group inline-block py-[5px] text-[16px] leading-[24px] text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

/* The sign-off row under the disclaimer sets its own 14px, so a link in it
   cannot borrow LINK_CLASS — 16px there would out-shout the copyright line
   beside it. Same colour, same hover, same underline wipe; its own size. */
const SIGNOFF_LINK_CLASS =
  "group text-[14px] leading-[20px] text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-ground pt-[100px] pb-12">
      <Shell>
        <Group className="flex flex-col items-start gap-14 lg:flex-row lg:justify-between">
          <div className="grid w-full grid-cols-2 gap-x-12 gap-y-12 sm:grid-cols-4 lg:w-auto lg:gap-x-16">
            {COLUMNS.map((column) => (
              <GroupItem key={column.heading}>
                <h2 className="mb-7 text-[17px] font-medium leading-[24px] text-ink">
                  {column.heading}
                </h2>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterEntry link={link} />
                    </li>
                  ))}
                </ul>
              </GroupItem>
            ))}
          </div>

          <GroupItem className="flex flex-col items-start gap-6 lg:shrink-0">
            {/* No plate behind the logo — it sits natively on warm paper.

                A link, not a bare <span>: a site logo is the one element a
                visitor will click expecting to be taken home, and the header
                mark already behaves that way. This one used to be inert, so
                the affordance answered in one place and not the other.

                `sizes` for the same reason as the header mark — h-11 against
                a 1024x313 PNG is 144px of rendered width, not 2048. */}
            <Link
              href="/"
              className="inline-flex items-center transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-70"
            >
              <Image
                src="/sif-insight-logo.png"
                alt="SIF Insight"
                width={1024}
                height={313}
                sizes="144px"
                className="h-11 w-auto"
              />
            </Link>
            <p className="text-[14px] leading-[20px] text-muted">
              Powered by Platizio Services LLP
            </p>
            <div className="flex flex-col gap-2">
              <a href="mailto:info@sifinsight.com" className={LINK_CLASS}>
                <LinkLabel>info@sifinsight.com</LinkLabel>
              </a>
              <a href="tel:+919205523100" className={`tabular ${LINK_CLASS}`}>
                <LinkLabel>+91 92055 23100</LinkLabel>
              </a>
            </div>
          </GroupItem>
        </Group>

        <Rule className="mt-20" />

        <Group>
          <GroupItem className="mt-10">
            {/* Names the four headline fields on purpose, but claims only that
                where they appear they were READ — never that all thirty carry
                the full set. The sentence after it is what makes that safe, and
                is why this copy does not need `fullyDisclosedCount`. */}
            <p className="max-w-[900px] text-[14px] leading-[24px] text-muted">
              <strong className="font-medium text-body">Disclaimer:</strong> The
              scheme terms shown on this site — minimum, expense ratio, exit
              load, risk band and the rest — are read from each scheme&apos;s own
              information document, and net asset values come from AMFI&apos;s
              published SIF feed. Where a document does not state a field, it is
              marked not captured rather than filled in.
              {undisclosedSchemes > 0 ? (
                <>
                  {" "}
                  For <span className="tabular">
                    {undisclosedSchemes}
                  </span>{" "}
                  of the{" "}
                  <span className="tabular">{stats.strategyCount}</span> schemes
                  we hold no document yet, and nothing beyond AMFI&apos;s feed is
                  published for them.
                </>
              ) : null}{" "}
              News and commentary elsewhere on this site are drawn from public
              sources and are not communications of any Asset Management Company
              (AMC). Documents are amended and net asset values move: the
              AMC&apos;s own site and the current scheme information document
              remain the authority on any figure here. SIF Insight is a
              distributor of Mutual Funds and Specialised Investment Funds, not
              an investment adviser or an AMC, and nothing on this site is
              investment advice or a recommendation to buy or sell any scheme.
            </p>
          </GroupItem>

          <GroupItem className="mt-10 flex flex-col gap-4 text-[14px] leading-[20px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {currentYear} SIF Insight by Platizio Services LLP. All rights
              reserved.
            </p>
            {/* Both of these used to be plain text, because neither page had
                been written and the rule in `FooterEntry` is that the
                affordance has to match the behaviour.

                /privacy now exists, so Privacy Policy is a link — the
                condition was met, not overridden. Terms of Service stays as
                text for precisely the same rule: there is no /terms route,
                and a link that goes nowhere is the thing this footer was
                built to avoid. Give it an href the day the page ships. */}
            <p className="flex items-center gap-5">
              <Link href="/privacy" className={SIGNOFF_LINK_CLASS}>
                <LinkLabel>Privacy Policy</LinkLabel>
              </Link>
              <span className="text-muted" title="Pending publication">
                Terms of Service
              </span>
            </p>
          </GroupItem>
        </Group>
      </Shell>
    </footer>
  );
}

function FooterEntry({ link }: { link: FooterLink }) {
  // Unpublished destinations stay as titled text. No underline wipe either —
  // the affordance has to match the behaviour.
  if (!link.href) {
    return (
      <span className={`${LINK_CLASS} cursor-default`} title={link.pendingNote}>
        {link.label}
      </span>
    );
  }

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${LINK_CLASS} inline-flex items-center gap-1.5`}
      >
        <LinkLabel>{link.label}</LinkLabel>
        <ExternalGlyph />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={link.href} className={LINK_CLASS}>
      <LinkLabel>{link.label}</LinkLabel>
    </Link>
  );
}

/** The same hairline-wipe underline the header nav uses. Label only, so the
    external-link glyph never gets dragged under the rule. */
function LinkLabel({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <span
        aria-hidden="true"
        className="absolute -bottom-[3px] left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </span>
  );
}

function ExternalGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M4.75 1.5h5.75v5.75M10.5 1.5 5.25 6.75M9 7v3.5H1.5V3H5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
