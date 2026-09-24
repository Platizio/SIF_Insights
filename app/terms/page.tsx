import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import {
  A,
  LEGAL_UPDATED,
  LegalDocument,
  P,
  UL,
  type LegalClause,
} from "@/components/legal/LegalDocument";
import { stats } from "@/lib/data";
import { formatInr } from "@/lib/format";
import { SITE, mailtoHref, telHref } from "@/lib/site";

/**
 * /terms — Terms & Conditions. A complete draft for compliance sign-off
 * (PRD p.19: "Legal & Policies"). Entity, ARN and contact details come from
 * lib/site; the SEBI minimum from `stats`.
 */

const DESCRIPTION =
  "The terms on which SIF Insight, operated by Platizio Services LLP, provides information about Specialised Investment Funds.";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms & Conditions — SIF Insight",
    description: DESCRIPTION,
    url: "/terms",
    images: "/opengraph-image.png",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

const MIN = formatInr(stats.minInvestment);

const CLAUSES: LegalClause[] = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: (
      <>
        <P>
          These Terms &amp; Conditions govern your access to and use of the SIF
          Insight website at {SITE.origin.replace("https://", "")} and any
          related pages, tools and communications (together, the “Website”).
          By accessing or using the Website you agree to be bound by these
          terms. If you do not agree, please do not use the Website.
        </P>
        <P>
          These terms should be read together with our{" "}
          <A href="/privacy">Privacy Policy</A>, <A href="/disclaimer">Disclaimer</A>{" "}
          and <A href="/regulatory-disclosures">Regulatory Disclosures</A>, which
          form part of them.
        </P>
      </>
    ),
  },
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <>
        <P>
          The Website is owned and operated by {SITE.legalEntity} (“Platizio”,
          “we”, “us”, “our”) under the name {SITE.name}. Platizio is an{" "}
          {SITE.arnLine}.
        </P>
        <P>
          We act as a mutual fund and SIF distributor. We are not an asset
          management company, a portfolio manager, a stock broker or a
          SEBI-registered investment adviser, and we do not provide investment
          advice within the meaning of the SEBI (Investment Advisers)
          Regulations, 2013.
        </P>
      </>
    ),
  },
  {
    id: "use-of-site",
    heading: "Use of the Website",
    body: (
      <>
        <P>
          The Website is provided for general information and investor
          education about Specialised Investment Funds (“SIFs”) offered in
          India. Nothing on the Website is, or should be read as:
        </P>
        <UL>
          <li>investment, tax, legal or accounting advice;</li>
          <li>a recommendation to buy, sell or hold any scheme or security; or</li>
          <li>an offer or solicitation to invest in any scheme in any jurisdiction where it would be unlawful.</li>
        </UL>
        <P>
          SIFs are subject to eligibility conditions set by SEBI, including a
          minimum investment of <span className="tabular">{MIN}</span> per
          investor across the SIFs of an asset management company (subject to
          the exceptions in the SEBI framework). Whether a SIF is available and
          suitable for you is determined under the scheme’s Scheme Information
          Document (SID) / Investment Strategy Information Document (ISID) and
          by the asset management company. You are responsible for assessing
          suitability, if necessary with an independent professional adviser.
        </P>
        <P>
          You agree to use the Website lawfully and not to copy, scrape,
          frame, reverse-engineer, overload or interfere with it, or to use it
          to transmit any unlawful, misleading or harmful material.
        </P>
      </>
    ),
  },
  {
    id: "data-accuracy",
    heading: "Data and accuracy",
    body: (
      <>
        <P>
          NAVs are taken from the files published by the Association of Mutual
          Funds in India (AMFI). Scheme terms — risk band, expense ratio, exit
          load, minimum investment, liquidity and similar — are read from the
          documents published by each asset management company, such as its
          ISID, factsheets and expense ratio disclosures. Every figure is shown
          with its as-of date. How we calculate derived figures is set out on
          our <A href="/methodology">Methodology</A> page.
        </P>
        <P>
          Where a value has not been sourced from an official document we show
          “Not captured” rather than an estimate. While we take reasonable care,
          data may be delayed, incomplete or contain errors made by us or our
          sources, and we do not guarantee its accuracy, completeness or
          timeliness. The scheme documents of the asset management company
          prevail over anything shown on the Website.
        </P>
      </>
    ),
  },
  {
    id: "intellectual-property",
    heading: "Intellectual property",
    body: (
      <>
        <P>
          The Website’s design, text, compilations, calculations and software
          are the property of Platizio or its licensors. You may view and print
          pages for your personal, non-commercial use. Any other reproduction
          or distribution requires our prior written consent.
        </P>
        <P>
          Names, logos and trademarks of asset management companies, schemes
          and other third parties belong to their respective owners. They are
          used on the Website only to identify the schemes we track and cover,
          and their use does not imply any endorsement, sponsorship or
          affiliation.
        </P>
      </>
    ),
  },
  {
    id: "third-party-links",
    heading: "Links to third-party websites",
    body: (
      <P>
        The Website links to third-party websites, including those of AMFI,
        SEBI, asset management companies and YouTube. We do not control those
        websites and are not responsible for their content, availability or
        privacy practices. A link is provided for convenience and is not an
        endorsement.
      </P>
    ),
  },
  {
    id: "communications",
    heading: "Communications and consent",
    body: (
      <>
        <P>
          When you submit an enquiry, book a consultation or otherwise share
          your contact details with us, you consent to Platizio contacting you
          by telephone, SMS, WhatsApp or email about your enquiry and about SIFs
          and mutual funds, even if your number is registered on the National
          Customer Preference Register. You may withdraw this consent at any
          time by writing to <A href={mailtoHref}>{SITE.email}</A>.
        </P>
        <P>
          Conversations with our team are for information and for helping you
          understand the schemes available and the investment process. Any
          investment is made by you on the basis of the scheme documents and
          through the asset management company’s own process. How we handle
          personal data is described in our <A href="/privacy">Privacy Policy</A>.
        </P>
      </>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <>
        <P>
          The Website is provided on an “as is” and “as available” basis. To
          the fullest extent permitted by law, Platizio, its partners,
          employees and agents are not liable for any direct, indirect,
          incidental or consequential loss or damage — including any
          investment loss or loss of profit — arising from your use of, or
          reliance on, the Website or its content, or from any interruption,
          error or unavailability of the Website.
        </P>
        <P>
          Investments in SIFs are subject to market risks, and any decision to
          invest is yours alone.
        </P>
      </>
    ),
  },
  {
    id: "indemnity",
    heading: "Indemnity",
    body: (
      <P>
        You agree to indemnify and hold harmless Platizio, its partners,
        employees and agents against any claim, loss, liability or expense
        (including reasonable legal fees) arising from your breach of these
        terms or your misuse of the Website.
      </P>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law and jurisdiction",
    body: (
      <P>
        These terms are governed by the laws of India. Subject to any
        grievance-redressal mechanism available to you under SEBI or AMFI
        regulations (see <A href="/regulatory-disclosures#grievances">Regulatory Disclosures</A>),
        the courts at Noida, Gautam Buddh Nagar, Uttar Pradesh shall have
        exclusive jurisdiction over any dispute arising from them.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <P>
        We may update these terms from time to time. The “Last updated” date
        on this page shows when they were last revised. Continued use of the
        Website after a change means you accept the revised terms.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <>
        <P>Questions about these terms can be sent to:</P>
        <P>
          {SITE.legalEntity}
          <br />
          {SITE.address.lines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
          Email: <A href={mailtoHref}>{SITE.email}</A>
          <br />
          Phone: <A href={telHref}>{SITE.phoneDisplay}</A>
        </P>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        lines={["Terms &", "Conditions"]}
        standfirst={DESCRIPTION}
        meta={[SITE.legalEntity, SITE.arnLine]}
      />
      <LegalDocument clauses={CLAUSES} updated={LEGAL_UPDATED} />
    </>
  );
}
