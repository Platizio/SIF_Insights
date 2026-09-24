import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { CompareView } from "@/components/compare/CompareView";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Button, Eyebrow, Section, Shell } from "@/components/primitives";
import { buildSifRows, formatUpdated, navLastUpdated, sifRow, stats, type SifRow } from "@/lib/data";
import { parseCompareIds } from "@/lib/screener/url";
import { CompareClient, type PickerOption } from "./CompareClient";

/* ============================================================
   /compare?ids=SIF-3,SIF-93 — up to four SIFs side by side.

   DYNAMIC: the selection lives in the URL, so the server reads
   `ids` and renders the whole comparison into the first HTML. A
   comparison is therefore a link — shareable, bookmarkable, and
   complete with JavaScript off. The client island only edits the
   URL (router.replace), and the server renders the new selection.

   Codes are matched case-insensitively, de-duplicated, capped at
   four and kept in the order given; unknown codes are dropped, and
   the page says which.
   ============================================================ */

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

const DESCRIPTION =
  "Compare shortlisted SIFs side-by-side across strategy, performance, risk, costs, portfolio characteristics and key investment terms to understand the differences clearly.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { ids } = await searchParams;
  const hasIds = ids !== undefined && (Array.isArray(ids) ? ids.length > 0 : ids.length > 0);
  return {
    title: "Compare SIFs",
    description: DESCRIPTION,
    /* Every selection is its own URL, and none of them is a page a search
       engine should index as a separate document — the canonical is the
       bare tool. */
    alternates: { canonical: "/compare" },
    ...(hasIds ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: "Compare SIFs side by side",
      description: DESCRIPTION,
      url: "/compare",
      /* Declaring openGraph drops the root image convention; restated. */
      images: "/opengraph-image",
      siteName: "SIF Insight",
      locale: "en_IN",
      type: "website",
    },
  };
}

function pickerOption(r: SifRow): PickerOption {
  return {
    code: r.code,
    name: r.name,
    shortName: r.shortName,
    amcId: r.amcId,
    amcName: r.amcName,
    brand: r.brand,
    logo: r.logo,
    category: r.category,
    strategy: r.strategy,
    strategyLabel: r.strategyLabel,
  };
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const all = buildSifRows();
  const known = all.map((r) => r.code);

  const codes = parseCompareIds(ids, known);
  const rows = codes.map((c) => sifRow(c)).filter((r): r is SifRow => r !== undefined);
  /* What the link asked for that is not a SIF we track — said, not silently
     lost. Read off the raw tokens, so a malformed code is reported too. */
  const knownSet = new Set(known);
  const tokens = (Array.isArray(ids) ? ids.join(",") : (ids ?? ""))
    .split(/,|%2C/i)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const dropped = [...new Set(tokens.filter((t) => !knownSet.has(t)))];
  const overCap = new Set(tokens.filter((t) => knownSet.has(t))).size > codes.length;

  const options = [...all]
    .sort((a, b) => a.shortName.localeCompare(b.shortName))
    .map(pickerOption);

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        lines={["Compare SIFs"]}
        standfirst={DESCRIPTION}
        meta={[
          <Fragment key="max">Up to four SIFs at a time</Fragment>,
          <Fragment key="universe">
            <span className="tabular">{stats.strategyCount}</span> SIFs to choose from
          </Fragment>,
          <Fragment key="asof">NAV data as of {formatUpdated(navLastUpdated)}</Fragment>,
        ]}
      />

      <Section id="select" className="pt-0">
        <Shell>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-end lg:gap-16">
            <div>
              <Rise>
                <Eyebrow>Select</Eyebrow>
              </Rise>
              <LineReveal
                as="h2"
                lines={["Select SIFs to Compare"]}
                className="mt-4 text-[clamp(28px,3vw,40px)] font-medium leading-[1.16] tracking-[-0.01em] text-ink"
              />
            </div>
            <Rise delay={0.08}>
              <p className="max-w-[62ch] text-[15px] leading-[26px] text-body lg:pb-1">
                Choose up to four. Search by SIF name or AMC, or narrow by category and strategy;
                SIFs shortlisted in the{" "}
                <Link
                  href="/sif-screener"
                  className="text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
                >
                  SIF Screener
                </Link>{" "}
                arrive here already selected.
              </p>
            </Rise>
          </div>

          <div className="mt-10">
            <CompareClient options={options} selected={rows.map((r) => r.code)} />
          </div>

          {/* With JavaScript off the slots cannot open their picker, so the same
              selection is offered as a plain GET form: it submits ?ids=… and the
              server renders the comparison exactly as it does for a link. */}
          <noscript>
            <form action="/compare" method="get" className="mt-8 border border-hairline bg-surface p-6">
              <label htmlFor="compare-ids-fallback" className="block text-[13px] leading-[20px] text-muted">
                Choose two to four SIFs (hold Ctrl or ⌘ to select several)
              </label>
              <select
                id="compare-ids-fallback"
                name="ids"
                multiple
                size={8}
                defaultValue={rows.map((r) => r.code)}
                className="mt-3 w-full rounded-[4px] border border-hairline bg-surface px-3 py-2 text-[16px] leading-[24px] text-ink"
              >
                {options.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.shortName} — {o.amcName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="mt-4 inline-flex items-center rounded-full border border-hairline px-5 py-2.5 text-[15px] text-ink"
              >
                Compare
              </button>
            </form>
          </noscript>

          {dropped.length > 0 ? (
            <p role="status" className="mt-6 text-[13px] leading-[20px] text-muted">
              Not recognised and left out of this comparison:{" "}
              <span className="tabular">
                {dropped.slice(0, 4).map((t) => (t.length > 24 ? `${t.slice(0, 24)}…` : t)).join(", ")}
                {dropped.length > 4 ? ` and ${dropped.length - 4} more` : ""}
              </span>
              .
            </p>
          ) : null}

          {overCap ? (
            <p role="status" className="mt-6 text-[13px] leading-[20px] text-muted">
              The link named more than four SIFs; a comparison holds four, so the first four are
              shown.
            </p>
          ) : null}

          {rows.length < 2 ? (
            <Rise>
              <div className="mt-12 grid gap-8 border border-hairline bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
                <div>
                  <h3 className="text-[22px] font-medium leading-[30px] text-ink">
                    {rows.length === 0
                      ? "Pick at least two SIFs to generate the comparison."
                      : `${rows[0].shortName} is selected. Add at least one more SIF to compare.`}
                  </h3>
                  <p className="mt-4 max-w-[62ch] text-[15px] leading-[26px] text-body">
                    Once two are selected, this page lines them up across strategy, performance,
                    risk, fund size, costs, liquidity, portfolio, benchmark, key terms and
                    documents. You can compare SIFs from different categories and strategies; the
                    page will note where their objectives differ.
                  </p>
                </div>
                <Button href="/sif-screener" variant="ghost">
                  Shortlist in the Screener
                </Button>
              </div>
            </Rise>
          ) : null}
        </Shell>
      </Section>

      {rows.length >= 2 ? (
        <Section id="comparison" className="pt-0">
          <Shell>
            <CompareView rows={rows} />
          </Shell>
        </Section>
      ) : null}
    </>
  );
}
