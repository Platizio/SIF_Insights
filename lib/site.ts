/* ============================================================
   Site constants — the ONE place contact details, regulatory lines and
   the canonical origin are written down.

   Before this file the phone number, the email and the origin were each
   typed into several components, and they had already drifted: the footer
   and the Organization JSON-LD said info@sifinsight.com while the client's
   own brief says sifinsights@gmail.com, and four files declared their own
   `ORIGIN`. A contact detail that exists in two places is a contact detail
   that is wrong in one of them.

   Client-safe by construction: plain literals, no data imports, no
   server-only APIs. The header, the footer, the WhatsApp button and every
   client island may import it.

   Nothing here is derived from the NAV dataset. Counts live in `stats`
   (lib/data); this file holds only facts about the business itself.
   ============================================================ */

export const SITE = {
  /* `www` is load-bearing: the apex answers 307 to https://www.sifinsight.com/
     (measured against production), so an apex origin would make every
     canonical, og:url and sitemap entry name a redirect instead of a page.
     Change this only after checking what the apex actually answers. */
  origin: "https://www.sifinsight.com",
  name: "SIF Insight",
  byline: "SIF Insight by Platizio",
  tagline:
    "Helping investors understand, research and compare SIFs through data, insights and expert guidance.",

  legalEntity: "Platizio Services LLP",
  arn: "ARN-341407",
  arnLine: "AMFI Registered Mutual Fund Distributor — ARN 341407",
  /* PRD wording, pending compliance sign-off (tracked in the PR). */
  trustLine: ["AMFI Registered", "SEBI Compliant", "ARN-341407"] as const,

  email: "sifinsights@gmail.com",
  phoneE164: "+919205523100",
  phoneDisplay: "+91 92055 23100",
  /* Country code included. The old site's wa.me link dropped the 91 and
     opened a chat with a number that does not exist. */
  whatsappNumber: "919205523100",
  whatsappPrefill:
    "Hi, I’m interested in investing in SIFs and would like some guidance on choosing a suitable SIF. Could you please assist me?",

  address: {
    lines: [
      "Unit No. 415, Tower-B, KLJ Noida One",
      "Plot #B-8, Sector-62, Noida",
      "UP 201309, India",
    ],
    locality: "Noida (Delhi NCR)",
    /* The same address split the way schema.org PostalAddress wants it.
       Restated rather than sliced out of `lines`, because a string split
       breaks silently the first time a line is reworded. */
    streetAddress: "Unit No. 415, Tower-B, KLJ Noida One, Plot #B-8, Sector-62",
    city: "Noida",
    postalCode: "201309",
    region: "Uttar Pradesh",
    country: "IN",
  },

  /* `null` means "not supplied yet", and every consumer skips it — the
     footer renders no icon and the JSON-LD emits no sameAs entry. Never a
     placeholder URL: a social icon that opens the platform's home page is a
     dead link wearing a logo. */
  socials: {
    youtube: "https://www.youtube.com/@sifinsight",
    instagram: "https://www.instagram.com/sifinsight/",
    x: "https://x.com/sifinsight",
    linkedin: null,
    facebook: null,
  },

  founder: { name: "Vividh Chaturvedi", title: "Founder & CEO" },

  /* The two regulator links the design contract requires in the footer
     (DESIGN_CONTRACT.md §5). Both verified live when they were first added. */
  sebiSifCircularUrl:
    "https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html",
  amfiSifUrl: "https://www.amfiindia.com/sif",

  /* PRD p.20, verbatim. Final wording is for compliance to approve; the
     complete disclaimer lives on /disclaimer and the footer links to it. */
  disclaimerShort:
    "Investments in SIFs are subject to market risks. Please read all applicable scheme-related documents carefully before investing. Past performance may or may not be sustained in the future. SIF Insight does not guarantee investment returns or future performance.",
} as const;

export type SocialNetwork = keyof typeof SITE.socials;

/**
 * A wa.me deep link with the message pre-filled.
 *
 * `encodeURIComponent`, not URLSearchParams: the latter writes spaces as
 * `+`, which WhatsApp's web client renders literally on some platforms.
 */
export function whatsappHref(text: string = SITE.whatsappPrefill): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export const telHref: string = `tel:${SITE.phoneE164}`;
export const mailtoHref: string = `mailto:${SITE.email}`;

/** The socials that have actually been supplied, in display order. */
export function activeSocials(): { network: SocialNetwork; href: string }[] {
  return (Object.entries(SITE.socials) as [SocialNetwork, string | null][])
    .filter((entry): entry is [SocialNetwork, string] => entry[1] !== null)
    .map(([network, href]) => ({ network, href }));
}
