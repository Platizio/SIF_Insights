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
import { FOOTER_DISCLAIMER_SHORT, PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import { navSourceUrl, stats } from "@/lib/data";
import { SITE } from "@/lib/site";

/**
 * /disclaimer — the full disclaimer the footer's short one points to
 * (PRD p.19–20). A draft for compliance approval. The one count it states —
 * schemes whose disclosures are not yet fully captured — is derived.
 */

const DESCRIPTION =
  "The full disclaimer for SIF Insight: market risk, scheme documents, past performance, data sources and our role as a distributor.";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: DESCRIPTION,
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: "Disclaimer — SIF Insight",
    description: DESCRIPTION,
    url: "/disclaimer",
    images: "/opengraph-image",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

const notFullyDisclosed = stats.strategyCount - stats.fullyDisclosedCount;

const CLAUSES: LegalClause[] = [
  {
    id: "market-risk",
    heading: "Market risk",
    body: (
      <>
        <P className="text-ink">{FOOTER_DISCLAIMER_SHORT}</P>
        <P>
          Specialised Investment Funds may use strategies — including long-short
          positions, derivatives and unhedged short exposure within the limits
          set by SEBI — that can increase both the risk and the volatility of a
          scheme. The value of your investment and any income from it can go
          down as well as up, and you may get back less than you invested.
        </P>
      </>
    ),
  },
  {
    id: "scheme-documents",
    heading: "Read the scheme documents",
    body: (
      <P>
        Before investing, read the Scheme Information Document (SID), the
        Investment Strategy Information Document (ISID), the Key Information
        Memorandum (KIM) and the Statement of Additional Information (SAI) of
        the scheme, published by its asset management company. Those documents
        are the authoritative source for a scheme’s objective, strategy,
        risks, costs, liquidity and terms. Where anything on this website
        differs from them, the scheme documents prevail.
      </P>
    ),
  },
  {
    id: "past-performance",
    heading: "Past performance",
    body: (
      <>
        <P>{PAST_PERFORMANCE_NOTE}</P>
        <P>
          Many SIFs have a short history. Returns over short periods can be
          unrepresentative, and where a scheme does not have enough history for
          a period we show “N/A — Insufficient history” rather than a figure.
          How returns, volatility and drawdown are calculated is set out on our{" "}
          <A href="/methodology#returns">Methodology</A> page.
        </P>
        <P>
          Different SIFs follow different strategies. Performance and risk
          figures should be read in the context of each scheme’s investment
          objective and benchmark, and a comparison of schemes on this website
          is not a ranking or a recommendation.
        </P>
      </>
    ),
  },
  {
    id: "data",
    heading: "Data sources and completeness",
    body: (
      <>
        <P>
          NAVs are taken from the file published by AMFI (
          <A href={navSourceUrl}>source</A>). Scheme terms are read from
          documents published by each asset management company. Every figure
          carries an as-of date, and a value that has not been sourced is shown
          as “Not captured” — never estimated.
        </P>
        {notFullyDisclosed > 0 ? (
          <P>
            Of the <span className="tabular">{stats.strategyCount}</span> schemes
            we track, <span className="tabular">{notFullyDisclosed}</span>{" "}
            {notFullyDisclosed === 1 ? "does" : "do"} not yet have every headline
            disclosure — risk band, expense ratio, exit load and minimum
            investment — captured from an official document. For those schemes,
            refer to the asset management company’s documents directly.
          </P>
        ) : (
          <P>
            The headline disclosures of every scheme we track have been captured
            from official documents; they may still change when the asset
            management company updates them.
          </P>
        )}
        <P>
          While we take reasonable care, data may be delayed, incomplete or
          contain errors, and we do not guarantee its accuracy, completeness or
          timeliness.
        </P>
      </>
    ),
  },
  {
    id: "no-endorsement",
    heading: "No endorsement by or for asset managers",
    body: (
      <P>
        We track and cover the SIFs of asset management companies; we do not
        represent them. The appearance of a scheme, an asset management
        company or its logo on this website does not mean that it endorses SIF
        Insight, or that we endorse or recommend it. Names and marks belong to
        their respective owners and are used only for identification.
      </P>
    ),
  },
  {
    id: "distributor",
    heading: "Distributor, not adviser",
    body: (
      <>
        <P>
          {SITE.legalEntity} is an {SITE.arnLine}. We are not a SEBI-registered
          investment adviser. Content on this website, and conversations with
          our team, are for information and education and are not investment,
          tax or legal advice, or a recommendation to buy, sell or hold any
          scheme.
        </P>
        <P>
          Please consult an independent financial, tax or legal adviser where
          you need advice on your own circumstances.
        </P>
      </>
    ),
  },
  {
    id: "commissions",
    heading: "Commissions",
    body: (
      <P>
        As a distributor, we may receive commission from asset management
        companies on investments made through us. The rate can differ between
        schemes and asset management companies. Details are available on
        request and in the scheme documents — see our{" "}
        <A href="/regulatory-disclosures#commissions">Regulatory Disclosures</A>.
      </P>
    ),
  },
  {
    id: "no-guarantee",
    heading: "No guarantee",
    body: (
      <UL>
        <li>SIF Insight does not guarantee investment returns or future performance.</li>
        <li>Neither SIF Insight nor any asset management company guarantees any scheme’s objective will be achieved.</li>
        <li>Risk bands and other figures shown are not assurances of safety or of returns.</li>
      </UL>
    ),
  },
  {
    id: "regulatory-framework",
    heading: "Regulatory framework",
    body: (
      <>
        <P>SIFs are governed by SEBI’s regulatory framework. For the primary sources:</P>
        <UL>
          <li>
            <A href={SITE.sebiSifCircularUrl}>SEBI circular — Regulatory framework for Specialized Investment Funds</A>
          </li>
          <li>
            <A href={SITE.amfiSifUrl}>AMFI SIF portal</A>
          </li>
        </UL>
      </>
    ),
  },
];

export default function DisclaimerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        lines={["Disclaimer"]}
        standfirst={DESCRIPTION}
        meta={[SITE.legalEntity, SITE.arnLine]}
      />
      <LegalDocument clauses={CLAUSES} updated={LEGAL_UPDATED} />
    </>
  );
}
