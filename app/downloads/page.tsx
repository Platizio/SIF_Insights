import type { Metadata } from "next";
import { LineReveal } from "@/components/motion/LineReveal";
import { Odometer } from "@/components/motion/Odometer";
import { Rise, RowListItem, Rule } from "@/components/motion/Reveal";
import { ConsultCta } from "@/components/ConsultCta";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";

/**
 * /downloads
 *
 * Six third-party documents hosted on Google Drive. Sizes and dates are
 * reproduced exactly as supplied — "236 KB" is not rounded to "0.2 MB" and
 * "Dec 3, 2025" is not restated as "03/12/25". A download list is a filing
 * index; the moment the figures drift from the file they describe, it stops
 * being one.
 *
 * Dates carry a machine-readable `dateTime` alongside the supplied label
 * rather than being parsed and re-formatted: `new Date("2025-11-17")` is UTC
 * midnight and renders as the 16th on any server west of Greenwich.
 */

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Factsheets, portfolio updates and presentation decks for Indian Specialised Investment Fund schemes. Third-party AMC material, opened from Google Drive.",
  alternates: { canonical: "/downloads" },
};

type Doc = {
  name: string;
  fileId: string;
  /** Exactly as supplied by the source. Never recomputed, never rounded. */
  size: string;
  /** Display label, exactly as supplied. */
  date: string;
  /** ISO form of the same date, for <time dateTime>. */
  iso: string;
};

const FACTSHEETS: Doc[] = [
  {
    name: "All Magnum SIF Schemes Factsheet - October 2025",
    fileId: "1SBCoU1X22jwTycBR09qZbgnf43ITYcS9",
    size: "3.5 MB",
    date: "Nov 17, 2025",
    iso: "2025-11-17",
  },
  {
    name: "Altiva Hybrid Long-Short Fund Portfolio Update - Oct 2025",
    fileId: "1iA6l7o_eh-prZ_LoVkZ6f5GFZZH-3hYD",
    size: "2.8 MB",
    date: "Nov 17, 2025",
    iso: "2025-11-17",
  },
];

const PRESENTATIONS: Doc[] = [
  {
    name: "An introduction to Specialized Investment Fund (SIF)",
    fileId: "1UiteJ9ZnmQVIpRciXsqaF1AaVJyPjJ7K",
    size: "236 KB",
    date: "Nov 26, 2025",
    iso: "2025-11-26",
  },
  {
    name: "Presentation of Magnum Hybrid Long Short Fund - Office Print",
    fileId: "1CYXnN7_CktzkKN6IWAhh_VjKgvTmM3dV",
    size: "3.2 MB",
    date: "Dec 3, 2025",
    iso: "2025-12-03",
  },
  {
    name: "QSIF Deck",
    fileId: "1eMR3iRhwCtIkT2PkZxjj9_lBLlNiru94",
    size: "12.4 MB",
    date: "Nov 26, 2025",
    iso: "2025-11-26",
  },
  {
    name: "Titanium Hybrid Long Short Fund - SIF - Final",
    fileId: "1t9GVXawJRbdmCDHJxfXY5oZsonoakBPI",
    size: "6.6 MB",
    date: "Nov 26, 2025",
    iso: "2025-11-26",
  },
];

const TOTAL_DOCS = FACTSHEETS.length + PRESENTATIONS.length;

/** Google Drive's direct-download endpoint. */
function driveUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export default function DownloadsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Downloads"
        lines={["Factsheets, decks,", "portfolio updates."]}
        standfirst={
          <>
            The SIF documents we hold, listed with their file size and the date
            they were published. Every one is third-party material issued by the
            asset manager — we file it, we do not write it and we do not endorse
            it.
          </>
        }
        meta={[
          `${TOTAL_DOCS} documents`,
          "Third-party AMC material",
          "Opens from Google Drive",
        ]}
        aside={
          <Card className="p-8">
            <Odometer
              value={TOTAL_DOCS}
              className="text-[clamp(40px,4.4vw,60px)] font-medium leading-[1.06] text-ink"
            />
            <p className="mt-4 text-[17px] leading-[26px] text-body">
              Documents on file
            </p>
            <Rule className="mt-7" delay={0.1} />
            <p className="tabular mt-5 text-[14px] leading-[20px] text-muted">
              {FACTSHEETS.length} factsheets · {PRESENTATIONS.length}{" "}
              presentations
            </p>
          </Card>
        }
      />

      <DocGroup
        id="factsheets"
        eyebrow="Factsheets"
        lines={["Scheme factsheets", "and portfolio updates."]}
        blurb="Download the latest factsheets for SIF schemes. Each one is the asset manager's own disclosure document for the period named in its title."
        docs={FACTSHEETS}
      />

      <DocGroup
        id="presentations"
        eyebrow="Presentations"
        lines={["Decks on the", "SIF category."]}
        blurb="Download presentations and decks about SIFs — one general introduction to the category, and three scheme decks published by the asset managers."
        docs={PRESENTATIONS}
      />

      <Provenance />
      <ConsultCta
        lines={["Want a document", "walked through?"]}
        body="Tell us which scheme you are looking at. We will go through the disclosures in the factsheet with you — risk band, exit load, expense ratio and minimum investment."
      />
    </>
  );
}

/**
 * One hairline-separated group. Rows use <RowListItem> — 8px travel, capped
 * cascade. A filing index should settle, not slide.
 */
function DocGroup({
  id,
  eyebrow,
  lines,
  blurb,
  docs,
}: {
  id: string;
  eyebrow: string;
  lines: string[];
  blurb: string;
  docs: Doc[];
}) {
  return (
    <Section id={id}>
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={lines}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              {blurb}
            </p>
          </Rise>
        </div>

        <ul className="mt-16 list-none border-b border-hairline">
          {docs.map((doc, i) => (
            <RowListItem
              key={doc.fileId}
              index={i}
              className="border-t border-hairline"
            >
              <a
                href={driveUrl(doc.fileId)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10"
              >
                <span className="block">
                  <span className="block text-[22px] font-medium leading-[30px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent-dim">
                    {doc.name}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] leading-[20px] text-muted">
                    <span className="tabular">{doc.size}</span>
                    <span aria-hidden="true" className="h-3 w-px bg-hairline" />
                    <time dateTime={doc.iso} className="tabular">
                      {doc.date}
                    </time>
                  </span>
                </span>

                {/* rounded-full because it is the interactive affordance;
                    the row itself stays square like every other content
                    surface on the site. */}
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline px-6 py-2.5 text-[14px] leading-[20px] font-medium text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:border-accent group-hover:bg-accent-wash">
                  Download
                  <ArrowGlyph />
                  <span className="sr-only">
                    {doc.name} — {doc.size} (opens in a new tab)
                  </span>
                </span>
              </a>
            </RowListItem>
          ))}
        </ul>
      </Shell>
    </Section>
  );
}

function Provenance() {
  return (
    <Section>
      <Shell>
        <div className="border border-hairline bg-surface p-8 sm:p-12">
          <Eyebrow>Before you open these</Eyebrow>
          <div className="mt-8 grid gap-x-16 gap-y-8 lg:grid-cols-[1fr_1fr]">
            <p className="max-w-[58ch] text-[17px] leading-[30px] text-body">
              Every file listed here is third-party material published by the
              asset manager. Links open the document from Google Drive in a new
              tab. We do not alter these documents, and listing one is not an
              endorsement of the scheme it describes.
            </p>
            <p className="max-w-[58ch] text-[17px] leading-[30px] text-body">
              File sizes and dates are reproduced exactly as supplied by the
              source. A factsheet describes the period named in its title, not
              the market today — read it alongside the scheme’s risk band, exit
              load, expense ratio and minimum investment before deciding
              anything.
            </p>
          </div>
          <Rule className="mt-10" delay={0.15} />
          <p className="mt-6 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            SIF Insight is a distributor, not an asset manager and not an
            investment adviser. Nothing on this page is advice or a
            recommendation to invest in any scheme.
          </p>
        </div>
      </Shell>
    </Section>
  );
}

/** Hover moves on X, matching every other link affordance on the site. */
function ArrowGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
    >
      <path
        d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
