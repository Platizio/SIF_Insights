import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { RevealGuard } from "@/components/motion/RevealGuard";
import { NfoBar } from "@/components/sections/NfoBar";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { stats } from "@/lib/data";
import { SITE, activeSocials } from "@/lib/site";
import "./globals.css";

/* The canonical host is `www`, and the `www` is load-bearing rather than a
   stylistic preference: the apex answers 307 to it, so an apex origin would
   name a redirect in every canonical, og:url and sitemap entry. The value
   and the full reasoning live in lib/site.ts (`SITE.origin`), which is now
   the ONE place it is written — this file, app/sitemap.ts, app/robots.ts and
   app/amc/[id]/page.tsx used to declare four separate `ORIGIN` constants
   that had to be moved together by hand. */
const ORIGIN = SITE.origin;

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Italic only — it exists to carry exactly one word per display headline. */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

/* ============================================================
   Site-wide metadata.

   Both counts are interpolated, never typed. The two strings below were
   the last place on the site that asserted "17 asset managers" as a
   literal — and because Next merges metadata SHALLOWLY, the `openGraph`
   block here is the share card for EVERY route that does not define its
   own. An eighteenth house filing would have left "17" on all thirty
   share cards with nothing turning red.

   The same shallow merge is why every page in this app declares its own
   `openGraph` with `siteName`, `locale` and `type` repeated: a page that
   sets `openGraph` REPLACES this object wholesale rather than merging
   into it, so anything it omits is simply absent from its card. The
   repetition cannot be hoisted into a shared export from this file —
   Next 16 type-checks page and layout modules against a fixed set of
   allowed exports (see node_modules/next/dist/build/webpack/plugins/
   next-types-plugin), and any extra named export fails `next build`.

   `description` is the homepage meta description AND the fallback for
   every route that does not write its own, so it is kept inside the ~155
   characters Google renders before truncating. Measure the RESOLVED text,
   not the template: React escapes every apostrophe to `&#x27;`, so the
   served attribute always runs longer than this source reads.

   `alternates` is deliberately NOT set here. It would be inherited by
   every route that does not override it, which would point canonicals
   at the homepage — the one metadata field where a wrong value is worse
   than none. Every route declares its own instead, app/page.tsx included:
   that file, not this one, is where "/" gets its canonical and og:url.
   ============================================================ */
/* The brand line, once, for the default <title> and the share card. It
   replaced "India's SIF market, in full view", the old tagline the client's
   review retired along with the data-first framing it stood for. */
const SITE_TITLE = "SIF Insight — Understand, track and compare India's SIFs";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: {
    default: SITE_TITLE,
    template: "%s | SIF Insight",
  },
  description: `Understand, track and compare India's ${stats.strategyCount} Specialised Investment Funds from ${stats.amcCount} AMCs — latest NAVs, returns, scheme disclosures and expert guidance.`,
  /* Restated in full, not partially: see the shallow-merge note above.
     No `url` and no `images` — a `url` here would be inherited as og:url
     by every route that does not set its own, and the image comes from the
     app/opengraph-image.tsx file convention. */
  openGraph: {
    title: SITE_TITLE,
    description: `Research, track and compare every Specialised Investment Fund in India: ${stats.strategyCount} schemes from ${stats.amcCount} AMCs, with latest NAVs and disclosures as filed.`,
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

/**
 * Organization, once, for the whole site.
 *
 * Every field below is already rendered to a human in the footer or on
 * /about — legal name, email, phone, address, socials, logo, founder.
 * Nothing here is a claim the site does not otherwise make, which is the
 * only test that matters for structured data: it is a machine-readable
 * restatement of the page, not a second set of facts. All of it comes from
 * lib/site.ts, the same object the footer renders, so the two cannot
 * disagree — they did, once, about the email address.
 *
 * `sameAs` lists only the profiles that have been supplied; a null social
 * is omitted, never guessed.
 */
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  legalName: SITE.legalEntity,
  url: ORIGIN,
  logo: `${ORIGIN}/sif-insight-logo.png`,
  email: SITE.email,
  telephone: SITE.phoneE164,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.streetAddress,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  sameAs: activeSocials().map((social) => social.href),
  founder: {
    "@type": "Person",
    name: SITE.founder.name,
    jobTitle: SITE.founder.title,
  },
};

/* Both values track --color-ground (warm off-white paper). They were left
   at the revision-1 dark values, which told the browser to paint the canvas,
   scrollbars and form controls dark under a light design. */
export const viewport: Viewport = {
  themeColor: "#f9f6f1",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}
    >
      <body>
        {/* Motion serialises the `hidden` variant into the server render, so
            every <Reveal> ships as opacity:0. Without this the page is blank
            with JS disabled — the precise failure mode of the site we replaced. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              "<style>[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}</style>",
          }}
        />
        {/* The other half of the same problem: scripting ON, but the frame
            loop or the observer is dead, so Motion never leaves `hidden`. */}
        <RevealGuard />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[2000] focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-ground"
        >
          Skip to content
        </a>
        <SmoothScroll />
        {/* Chrome lives here, not in each page, so every route gets the
            ticker, nav and sign-off without repeating itself. */}
        <NfoBar />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* After the footer in the source, so it is the last stop in tab
            order rather than the first thing a keyboard user meets on
            every page. It is fixed-position, so where it sits in the DOM
            does not change where it paints. */}
        <WhatsAppButton />
        {/* dangerouslySetInnerHTML, not a `{JSON.stringify(...)}` child:
            React HTML-escapes text children, and an escaped quote inside
            a ld+json block is a parse error, not a rendering nit. `<` is
            re-escaped so no future value can close the script element. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_LD).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
