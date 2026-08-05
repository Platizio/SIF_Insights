import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { RevealGuard } from "@/components/motion/RevealGuard";
import { NfoBar } from "@/components/sections/NfoBar";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { SiteFooter } from "@/components/sections/SiteFooter";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://sifinsight.com"),
  title: {
    default: "SIF Insight — India's SIF market, in full view",
    template: "%s | SIF Insight",
  },
  description:
    "Independent coverage of India's Specialised Investment Funds. Track every SIF strategy, NAV and disclosure across 17 asset managers — SEBI's fund category introduced in 2025.",
  openGraph: {
    title: "SIF Insight — India's SIF market, in full view",
    description:
      "Independent coverage of India's Specialised Investment Funds. Every scheme, NAV and disclosure across 17 asset managers.",
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
  robots: { index: true, follow: true },
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
      </body>
    </html>
  );
}
