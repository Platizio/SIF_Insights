import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ExternalIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/icons";
import { Group, GroupItem, Rule } from "@/components/motion/Reveal";
import { Shell } from "@/components/primitives";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS } from "@/lib/nav";
import {
  SITE,
  activeSocials,
  mailtoHref,
  telHref,
  whatsappHref,
  type SocialNetwork,
} from "@/lib/site";

/**
 * The sign-off, laid out as the PRD asks (pp.18–20): four columns — SIF
 * Insight · Quick Links · Contact Us · Legal & Policies — then the
 * regulatory information, the short disclaimer and the copyright bar.
 *
 * Server Component. Every contact detail, regulatory line and social URL
 * comes from lib/site.ts and every link from lib/nav.ts; nothing is typed
 * here, which is how the footer and the Organization JSON-LD stopped
 * disagreeing about the email address.
 *
 * THE DISCLAIMER IS SPLIT. The footer carries the PRD's short text,
 * verbatim, and links to /disclaimer for the complete one. The long,
 * partly DERIVED disclaimer this footer used to hold (the "we hold no
 * document yet" clause counted from `stats`) belongs on that page now, so
 * the footer no longer reads the dataset at all.
 *
 * Legal pages that are still being written get their real hrefs anyway:
 * they ship in the same release as this footer, so a titled-text
 * placeholder would outlive the gap it was covering.
 */

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

/* The sign-off row sets its own 14px, so a link in it cannot borrow
   LINK_CLASS — 16px there would out-shout the copyright line beside it.
   Same colour, same hover, same underline wipe; its own size. */
const SIGNOFF_LINK_CLASS =
  "group text-[14px] leading-[20px] text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

const HEADING_CLASS = "mb-7 text-[17px] font-medium leading-[24px] text-ink";

/** The first three legal links, in the PRD's bottom-bar order. */
const SIGNOFF_LINKS = LEGAL_LINKS.filter((link) =>
  ["/terms", "/privacy", "/disclaimer"].includes(link.href),
);

const SOCIAL: Record<SocialNetwork, { label: string; Icon: typeof YouTubeIcon }> = {
  youtube: { label: "YouTube", Icon: YouTubeIcon },
  linkedin: { label: "LinkedIn", Icon: LinkedInIcon },
  instagram: { label: "Instagram", Icon: InstagramIcon },
  x: { label: "X", Icon: XIcon },
  facebook: { label: "Facebook", Icon: FacebookIcon },
};

export function SiteFooter() {
  /* Evaluated when the page is rendered — for these statically prerendered
     routes, at build time. A Server Component, so there is no client pass
     to disagree with and no hydration mismatch at New Year. The year can
     only lag if nothing is rebuilt across 1 January; the weekday NAV
     commits redeploy the site, so that window is a few days at most. */
  const currentYear = new Date().getFullYear();
  const socials = activeSocials();

  return (
    /* pb-28, not 12: the floating WhatsApp button (56px, 20px up from the
       viewport edge) would otherwise sit on top of the right-aligned
       legal links in the bottom bar once the page is scrolled to its end. */
    <footer className="border-t border-hairline bg-ground pt-[100px] pb-28">
      <Shell>
        {/* Four columns at lg, deliberately unequal — the brand column
            carries the tagline and the icons, Contact carries the address.
            Two unequal columns below that, one on a phone. */}
        <Group className="grid gap-x-12 gap-y-14 sm:grid-cols-[1.25fr_1fr] lg:grid-cols-[1.3fr_0.8fr_1.15fr_0.9fr] lg:gap-x-16">
          <GroupItem className="flex flex-col items-start gap-6">
            {/* No plate behind the logo — it sits natively on warm paper.
                A link home, as the header mark is. `sizes` for the same
                reason as the header: h-11 against a 1024x313 PNG is 144px
                of rendered width, not 2048. */}
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
            <div>
              <p className="text-[17px] font-medium leading-[24px] text-ink">
                {SITE.byline}
              </p>
              <p className="mt-2 max-w-[40ch] text-[14px] leading-[22px] text-muted">
                {SITE.tagline}
              </p>
            </div>

            {socials.length > 0 ? (
              <div>
                <p className="text-[14px] leading-[20px] text-muted">
                  Follow SIF Insight
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {socials.map(({ network, href }) => {
                    const { label, Icon } = SOCIAL[network];
                    return (
                      <li key={network}>
                        {/* 44px, in px — icon-only targets get the full
                            touch minimum, not the 24px floor. */}
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`SIF Insight on ${label} (opens in a new tab)`}
                          className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-hairline text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:bg-accent-wash hover:text-ink"
                        >
                          <Icon size={18} />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </GroupItem>

          <GroupItem>
            <h2 className={HEADING_CLASS}>Quick Links</h2>
            <ul className="flex flex-col gap-1">
              {FOOTER_QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    <LinkLabel>{link.label}</LinkLabel>
                  </Link>
                </li>
              ))}
            </ul>
          </GroupItem>

          <GroupItem>
            <h2 className={HEADING_CLASS}>Contact Us</h2>
            <address className="flex flex-col gap-6 not-italic">
              <ContactRow label="Call / WhatsApp">
                <a href={telHref} className={`tabular inline-flex items-center gap-2.5 ${LINK_CLASS}`}>
                  <PhoneIcon size={16} />
                  <LinkLabel>{SITE.phoneDisplay}</LinkLabel>
                </a>
                <a
                  href={whatsappHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2.5 ${LINK_CLASS}`}
                >
                  <WhatsAppIcon size={16} />
                  <LinkLabel>Chat on WhatsApp</LinkLabel>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </ContactRow>

              <ContactRow label="Email">
                <a href={mailtoHref} className={`inline-flex items-center gap-2.5 ${LINK_CLASS}`}>
                  <MailIcon size={16} />
                  <LinkLabel>{SITE.email}</LinkLabel>
                </a>
              </ContactRow>

              <ContactRow label="Office Address">
                <p className="flex gap-2.5 py-[5px] text-[16px] leading-[24px] text-muted">
                  <MapPinIcon size={16} className="mt-1" />
                  <span>
                    <span className="block text-body">{SITE.address.locality}</span>
                    {SITE.address.lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                </p>
              </ContactRow>
            </address>
          </GroupItem>

          <GroupItem>
            <h2 className={HEADING_CLASS}>Legal &amp; Policies</h2>
            <ul className="flex flex-col gap-1">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    <LinkLabel>{link.label}</LinkLabel>
                  </Link>
                </li>
              ))}
            </ul>
          </GroupItem>
        </Group>

        <Rule className="mt-20" />

        <Group>
          <GroupItem className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
            <section aria-labelledby="footer-regulatory">
              <h2
                id="footer-regulatory"
                className="text-[14px] font-medium leading-[20px] text-ink"
              >
                Regulatory Information
              </h2>
              <p className="mt-3 text-[14px] leading-[22px] text-muted">
                {SITE.name} by {SITE.legalEntity}
                <br />
                {SITE.arnLine}
              </p>
              {/* Both required by the design contract (§5): the regulator's
                  framework and the industry body's SIF portal. */}
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                <li>
                  <ExternalLink href={SITE.sebiSifCircularUrl}>SEBI SIF Circular</ExternalLink>
                </li>
                <li>
                  <ExternalLink href={SITE.amfiSifUrl}>AMFI SIF Portal</ExternalLink>
                </li>
              </ul>
            </section>

            <p className="max-w-[900px] text-[14px] leading-[24px] text-muted">
              <strong className="font-medium text-body">Disclaimer:</strong>{" "}
              {SITE.disclaimerShort}{" "}
              {/* Underlined at rest, unlike the list links: it sits inside a
                  paragraph of the same colour, and a link in running text
                  must be told apart by more than colour (WCAG 1.4.1). */}
              <Link
                href="/disclaimer"
                className="text-body underline decoration-1 underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink"
              >
                Read the full disclaimer
              </Link>
            </p>
          </GroupItem>

          <GroupItem className="mt-10 flex flex-col gap-4 text-[14px] leading-[20px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © <span className="tabular">{currentYear}</span> {SITE.name} by{" "}
              {SITE.legalEntity}. All Rights Reserved.
            </p>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {SIGNOFF_LINKS.map((link, i) => (
                <li key={link.href} className="flex items-center gap-3">
                  {i > 0 ? (
                    <span aria-hidden="true" className="text-hairline">
                      |
                    </span>
                  ) : null}
                  <Link href={link.href} className={SIGNOFF_LINK_CLASS}>
                    <LinkLabel>{link.label}</LinkLabel>
                  </Link>
                </li>
              ))}
            </ul>
          </GroupItem>
        </Group>
      </Shell>
    </footer>
  );
}

function ContactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[14px] leading-[20px] text-muted">{label}</p>
      <div className="mt-1 flex flex-col items-start">{children}</div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${SIGNOFF_LINK_CLASS} inline-flex items-center gap-1.5 py-[2px]`}
    >
      <LinkLabel>{children}</LinkLabel>
      <ExternalIcon size={11} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** The same hairline-wipe underline the header nav uses. Label only, so a
    glyph beside it never gets dragged under the rule. */
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
