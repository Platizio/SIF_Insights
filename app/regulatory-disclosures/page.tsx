import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import {
  A,
  LEGAL_UPDATED,
  LegalDocument,
  P,
  Terms,
  UL,
  type LegalClause,
} from "@/components/legal/LegalDocument";
import { RiskBand } from "@/components/primitives";
import { stats } from "@/lib/data";
import { formatInr } from "@/lib/format";
import { SITE, mailtoHref, telHref } from "@/lib/site";

/**
 * /regulatory-disclosures — PRD p.19: the distributor disclosures behind the
 * footer's regulatory line. A draft for compliance approval. Only facts held
 * in lib/site are stated; registration details the compliance team has not
 * supplied are NOT printed here as placeholders.
 */

const DESCRIPTION =
  "Regulatory disclosures for SIF Insight by Platizio Services LLP — AMFI registration, distributor role, commissions, SIF eligibility, KYC, risk bands and grievance redressal.";

export const metadata: Metadata = {
  title: "Regulatory Disclosures",
  description: DESCRIPTION,
  alternates: { canonical: "/regulatory-disclosures" },
  openGraph: {
    title: "Regulatory Disclosures — SIF Insight",
    description: DESCRIPTION,
    url: "/regulatory-disclosures",
    images: "/opengraph-image",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

const MIN = formatInr(stats.minInvestment);
const ARN_NUMBER = SITE.arn.replace(/^ARN-/, "");

const CLAUSES: LegalClause[] = [
  {
    id: "entity",
    heading: "Entity and registration",
    body: (
      <>
        <Terms
          rows={[
            { term: "Platform", detail: SITE.byline },
            { term: "Operated by", detail: SITE.legalEntity },
            { term: "Registration", detail: "AMFI Registered Mutual Fund Distributor" },
            { term: "ARN", detail: <span className="tabular">{ARN_NUMBER}</span> },
            {
              term: "Registered office",
              detail: SITE.address.lines.join(", "),
            },
          ]}
        />
        <P>
          The ARN (AMFI Registration Number) is issued by the Association of
          Mutual Funds in India to distributors registered with it. You can
          verify a distributor’s ARN on the{" "}
          <A href="https://www.amfiindia.com">AMFI website</A>.
        </P>
      </>
    ),
  },
  {
    id: "distributor-role",
    heading: "Our role as a distributor",
    body: (
      <>
        <P>
          {SITE.legalEntity} distributes mutual fund and Specialised Investment
          Fund schemes. In that capacity we provide information about schemes,
          help investors understand the options available and assist with the
          investment process.
        </P>
        <UL>
          <li>We are not a SEBI-registered investment adviser and do not provide investment advice.</li>
          <li>We are not an asset management company and do not manage any scheme.</li>
          <li>Comparisons, screens and data on this website are information, not recommendations.</li>
        </UL>
      </>
    ),
  },
  {
    id: "commissions",
    heading: "Commission disclosure",
    body: (
      <>
        <P>
          As a distributor we receive commission from the asset management
          companies whose schemes are invested in through us. Commission may be
          trail-based and can differ between schemes, plans and asset
          management companies. It is paid by the asset management company out
          of the scheme’s expense ratio and is not charged to you separately.
        </P>
        <P>
          Details of the commission we receive for any scheme are available on
          request — write to <A href={mailtoHref}>{SITE.email}</A> — and the
          expense structure is set out in the scheme documents. Investments
          made through the Regular plan carry a higher expense ratio than the
          Direct plan, which includes no distribution commission.
        </P>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "SIF investor eligibility and minimum investment",
    body: (
      <>
        <P>
          Under SEBI’s framework for Specialised Investment Funds, an investor
          must invest a minimum of <span className="tabular">{MIN}</span> across
          all the SIF strategies of an asset management company, measured at
          the level of the investor’s PAN. Accredited investors are exempt from
          the minimum, as the framework provides.
        </P>
        <P>
          Each scheme’s own eligibility conditions, subscription and redemption
          terms are set out in its ISID and SID. Where a scheme’s terms differ
          from anything on this website, the scheme documents prevail. See the{" "}
          <A href={SITE.sebiSifCircularUrl}>SEBI circular on SIFs</A> and the{" "}
          <A href={SITE.amfiSifUrl}>AMFI SIF portal</A>.
        </P>
      </>
    ),
  },
  {
    id: "kyc",
    heading: "KYC",
    body: (
      <P>
        Investing in any mutual fund or SIF scheme requires you to be
        KYC-compliant under the Prevention of Money Laundering Act, 2002 and
        SEBI’s KYC requirements, through a KYC Registration Agency. KYC is
        completed once and applies across schemes and asset management
        companies. We will never ask you to share a password or one-time
        password.
      </P>
    ),
  },
  {
    id: "risk-bands",
    heading: "Risk bands",
    body: (
      <>
        <P>
          Each SIF strategy carries a risk band assigned by its asset management
          company under the SEBI framework, on a scale from Band 1 (lowest
          risk) to Band 5 (highest risk). A band describes the risk of the
          strategy as assessed by the asset management company; it is not a
          rating by SIF Insight, and it may change over time.
        </P>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          {[1, 2, 3, 4, 5].map((band) => (
            <RiskBand key={band} band={band} />
          ))}
        </div>
        <P className="mt-5">
          We show the band stated in the scheme’s latest official document we
          hold. Where it has not been captured, we say “Not captured” rather
          than infer one. Always check the current band in the scheme’s ISID
          and the asset management company’s latest disclosures.
        </P>
      </>
    ),
  },
  {
    id: "grievances",
    heading: "Grievance redressal",
    body: (
      <>
        <P>If you have a complaint about our services, contact us first:</P>
        <Terms
          rows={[
            { term: "Email", detail: <A href={mailtoHref}>{SITE.email}</A> },
            { term: "Phone", detail: <A href={telHref}>{SITE.phoneDisplay}</A> },
            { term: "Address", detail: SITE.address.lines.join(", ") },
          ]}
        />
        <P>
          For a complaint about a scheme — its units, statements, redemptions
          or disclosures — you may also contact the investor service desk of
          the asset management company concerned, whose details are in the
          scheme documents.
        </P>
        <P>If your complaint is not resolved to your satisfaction, you may escalate it to:</P>
        <UL>
          <li>
            SEBI Complaints Redress System (SCORES):{" "}
            <A href="https://scores.sebi.gov.in">scores.sebi.gov.in</A>
          </li>
          <li>
            Online Dispute Resolution through the SMART ODR portal:{" "}
            <A href="https://smartodr.in">smartodr.in</A>
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "additional",
    heading: "Additional disclosures",
    body: (
      <P>
        Any additional mandatory regulatory or distributor disclosures will be
        published on this page as advised by compliance.
      </P>
    ),
  },
];

export default function RegulatoryDisclosuresPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        lines={["Regulatory", "Disclosures"]}
        standfirst={DESCRIPTION}
        meta={[SITE.legalEntity, SITE.arnLine]}
      />
      <LegalDocument clauses={CLAUSES} updated={LEGAL_UPDATED} />
    </>
  );
}
