import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { RevealGuard } from "@/components/motion/RevealGuard";
import { NfoBar } from "@/components/sections/NfoBar";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { stats } from "@/lib/data";
import "./globals.css";

/** Matches `ORIGIN` in app/robots.ts and app/sitemap.ts. If the domain
    moves, all three change together. */
const ORIGIN = "https://sifinsight.com";

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

   `alternates` is deliberately NOT set here. It would be inherited by
   every route that does not override it, which would point canonicals
   at the homepage — the one metadata field where a wrong value is worse
   than none.
   ============================================================ */
export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: {
    default: "SIF Insight — India's SIF market, in full view",
    template: "%s | SIF Insight",
  },
  description: `Independent coverage of India's ${stats.strategyCount} Specialised Investment Fund schemes — every NAV and disclosure from all ${stats.amcCount} asset managers, SEBI's 2025 fund category.`,
  openGraph: {
    title: "SIF Insight — India's SIF market, in full view",
    description: `Every Specialised Investment Fund in India, independently tracked: ${stats.strategyCount} schemes, ${stats.amcCount} asset managers, NAVs and disclosures as filed.`,
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

/**
 * Organization, once, for the whole site.
 *
 * Every field below is already rendered to a human in the footer or on
 * /about — legal name, email, phone, logo, founder. Nothing here is a
 * claim the site does not otherwise make, which is the only test that
 * matters for structured data: it is a machine-readable restatement of
 * the page, not a second set of facts.
 */
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SIF Insight",
  legalName: "Platizio Services LLP",
  url: ORIGIN,
  logo: `${ORIGIN}/sif-insight-logo.png`,
  email: "info@sifinsight.com",
  telephone: "+91 92055 23100",
  founder: { "@type": "Person", name: "Vividh Chaturvedi" },
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
