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

const LINK_CLASS =
  "group text-[16px] leading-[24px] text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

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
            {/* No plate behind the logo — it sits natively on warm paper. */}
            <span className="inline-flex items-center">
              <Image
                src="/sif-insight-logo.png"
                alt="SIF Insight"
                width={1024}
                height={313}
                className="h-11 w-auto"
              />
            </span>
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
            <p className="max-w-[900px] text-[14px] leading-[24px] text-muted">
              <strong className="font-medium text-body">Disclaimer:</strong> The
              content shared on this website is prepared using information
              currently available in the public domain, primarily through news
              reports and secondary sources. At present, the official documents
              and disclosures from Asset Management Companies (AMCs) regarding
              the particulars of Specialized Investment Funds (SIFs) are still
              awaited.
            </p>
          </GroupItem>

          <GroupItem className="mt-10 flex flex-col gap-4 text-[14px] leading-[20px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {currentYear} SIF Insight by Platizio Services LLP. All rights
              reserved.
            </p>
            {/* Privacy Policy and Terms of Service have not been written yet.
                Rendering them as text keeps the sign-off honest instead of
                pointing two links at `#`. */}
            <p className="flex items-center gap-5">
              <span className="text-muted" title="Pending publication">
                Privacy Policy
              </span>
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
