import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsultCta } from "@/components/ConsultCta";
import { sifDetail } from "@/components/sif/detail";
import { SifHeader } from "@/components/sif/SifHeader";
import { SifPerformance } from "@/components/sif/SifPerformance";
import {
  SifCosts,
  SifDocuments,
  SifFund,
  SifPager,
  SifRisk,
  SifTerms,
} from "@/components/sif/sections";
import { strategies } from "@/lib/data";
import { SITE } from "@/lib/site";

/* ============================================================
   The Individual SIF page — one per scheme, built at compile time.

   Screener: filter → sort → shortlist. Compare: side by side. This
   page: research one SIF in depth. Server-rendered throughout; the
   only client island is the NAV chart's period switch, which is
   handed this scheme's own points and nothing else.
   ============================================================ */

export const dynamicParams = false;

export function generateStaticParams() {
  return strategies.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = sifDetail(id);
  if (!detail) return { title: "Scheme not found" };

  const { row } = detail;
  const title = `${row.shortName} — ${row.brand}`;
  const description = `${row.name} by ${row.amcName}: ${row.strategyLabel} SIF. Returns, NAV history, risk band, costs, redemption terms and scheme documents, with the source of every figure.`;
  const path = `/sif/${row.id}`;

  /* `openGraph` restates siteName/locale/type/images because Next merges
     metadata shallowly — declaring the key replaces the root layout's block. */
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      images: "/opengraph-image",
      siteName: SITE.name,
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function SifPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = sifDetail(id);
  if (!detail) notFound();
  const { row, amc } = detail;

  /* Home › AMCs › {AMC} › {SIF}. The current page carries no `item`, per
     Google's guidance that the trail ends on the page itself. */
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.origin}/` },
      { "@type": "ListItem", position: 2, name: "AMCs", item: `${SITE.origin}/amc` },
      {
        "@type": "ListItem",
        position: 3,
        name: amc?.sifName ?? row.brand,
        item: `${SITE.origin}/amc/${row.amcId}`,
      },
      { "@type": "ListItem", position: 4, name: row.shortName },
    ],
  };

  return (
    <>
      {/* dangerouslySetInnerHTML, not a text child: React escapes text and an
          escaped quote is a JSON parse error. `<` is re-escaped so no scheme
          name can close the script element. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c"),
        }}
      />

      <SifHeader detail={detail} />
      <SifPerformance detail={detail} />
      <SifRisk detail={detail} />
      <SifCosts detail={detail} />
      <SifTerms detail={detail} />
      <SifFund detail={detail} />
      <SifDocuments detail={detail} />
      <SifPager detail={detail} />

      <ConsultCta
        eyebrow={null}
        lines={["Researching", `${row.shortName}?`]}
        body="Tell us your goals and risk comfort. We will take you through this scheme's documents, how its strategy differs from others, and what is on file — the decision stays yours."
      />
    </>
  );
}
