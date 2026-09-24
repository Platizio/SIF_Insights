import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalIcon } from "@/components/icons";
import { Rise, RowGroup, RowItem, RowListItem } from "@/components/motion/Reveal";
import { Delta, Section, Shell } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { cn } from "@/lib/cn";
import {
  buildSifRows,
  formatNav,
  formatUpdated,
  navLastUpdated,
  navSourceUrl,
  type Cell,
  type SifRow,
} from "@/lib/data";

import { SectionHead } from "./SectionHead";

/* ============================================================
   5 · Latest SIF NAVs (PRD p.28)

   The reference board: every SIF's latest published NAV, its date,
   and the move since the previous published NAV and over a week.
   Ordered by NAME — never by NAV, which would rank schemes by face
   value (~₹10 vs ~₹1,000), and never by move, which would turn a
   reference index into a league table.

   "Latest NAV", not "live": AMFI publishes once a day, and the date
   beside every figure is the claim we can stand behind.
   ============================================================ */

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

const COLUMNS: { label: string; align: "left" | "right" }[] = [
  { label: "SIF Name", align: "left" },
  { label: "AMC", align: "left" },
  { label: "Strategy", align: "left" },
  { label: "Latest NAV", align: "right" },
  { label: "NAV Date", align: "right" },
  { label: "1 Day Change", align: "right" },
  { label: "1 Week Change", align: "right" },
];

export function LatestNavs() {
  const rows = [...buildSifRows()].sort(
    (a, b) => collator.compare(a.shortName, b.shortName) || a.code.localeCompare(b.code),
  );
  const asOf = formatUpdated(navLastUpdated);
  const late = rows.filter((r) => r.navAsOf && r.navAsOf !== navLastUpdated).length;

  return (
    <Section id="latest-navs">
      <Shell>
        <SectionHead
          eyebrow="Latest NAVs"
          lines={["Latest SIF NAVs"]}
          copy="The latest NAV AMFI has published for every SIF, with its date and the move since the previous published NAV and over the past week. Open any SIF for its full NAV history."
          aside={
            <p className="text-[13px] leading-[20px] text-muted">
              Source:{" "}
              <a
                href={navSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current"
              >
                AMFI
                <ExternalIcon size={11} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span aria-hidden="true"> | </span>
              <span className="asof">
                Data as of <time dateTime={navLastUpdated}>{asOf}</time>
              </span>
            </p>
          }
        />

        <Rise delay={0.05}>
          <div className="mt-12 border border-hairline bg-surface">
            <div
              role="region"
              aria-label="Latest SIF NAVs"
              tabIndex={0}
              className="relative hidden overflow-x-auto md:block"
            >
              <table className="w-full min-w-[960px] border-collapse text-left">
                <caption className="sr-only">
                  Latest published NAV for {rows.length} SIFs, ordered by name. Source: AMFI, data as of {asOf}.
                </caption>
                <thead>
                  <tr>
                    {COLUMNS.map((c, i) => (
                      <th
                        key={c.label}
                        scope="col"
                        className={cn(
                          "px-4 py-3 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted",
                          i === 0 && "pl-6",
                          i === COLUMNS.length - 1 && "pr-6",
                          c.align === "right" && "text-right",
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <RowGroup>
                  {rows.map((r, i) => (
                    <RowItem
                      key={r.id}
                      index={i}
                      className="border-t border-hairline transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-2"
                    >
                      <th scope="row" className="py-3.5 pl-6 pr-4 text-left align-top font-normal">
                        <SifLink row={r} />
                      </th>
                      <td className="px-4 py-3.5 align-top text-[13px] leading-[22px] text-body">{r.brand}</td>
                      <td className="px-4 py-3.5 align-top text-[13px] leading-[22px] text-body">
                        {r.strategyLabel}
                      </td>
                      <td className="tabular px-4 py-3.5 text-right align-top text-[15px] leading-[22px] text-ink">
                        <Nav row={r} />
                      </td>
                      <td
                        className={cn(
                          "tabular whitespace-nowrap px-4 py-3.5 text-right align-top text-[13px] leading-[22px]",
                          r.navAsOf === navLastUpdated ? "text-body" : "text-ink",
                        )}
                      >
                        <NavDate row={r} />
                      </td>
                      <td className="px-4 py-3.5 text-right align-top leading-[22px]">
                        <Change cell={r.returns["1D"]} />
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right align-top leading-[22px]">
                        <Change cell={r.returns["1W"]} />
                      </td>
                    </RowItem>
                  ))}
                </RowGroup>
              </table>
            </div>

            {/* Phones: the same rows, stacked. Seven columns will not fit. */}
            <ul className="md:hidden">
              {rows.map((r, i) => (
                <RowListItem key={r.id} index={i} className="border-b border-hairline px-5 py-5 last:border-b-0">
                  <SifLink row={r} />
                  <p className="mt-1 text-[13px] leading-[20px] text-muted">
                    {r.brand} · {r.strategyLabel}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                    <MobileFact label="Latest NAV">
                      <span className="tabular text-[15px] text-ink">
                        <Nav row={r} />
                      </span>
                    </MobileFact>
                    <MobileFact label="NAV Date">
                      <span className="tabular text-[13px] text-body">
                        <NavDate row={r} />
                      </span>
                    </MobileFact>
                    <MobileFact label="1 Day Change">
                      <Change cell={r.returns["1D"]} />
                    </MobileFact>
                    <MobileFact label="1 Week Change">
                      <Change cell={r.returns["1W"]} />
                    </MobileFact>
                  </dl>
                </RowListItem>
              ))}
            </ul>
          </div>
        </Rise>

        <Rise>
          <p className="mt-5 max-w-[80ch] text-[13px] leading-[20px] text-muted">
            NAV data fetched from AMFI. 1 Day Change is measured against each SIF&apos;s previous published
            NAV, which is not always the previous calendar day; 1 Week Change against the last NAV on or
            before seven days earlier.
            {late > 0
              ? ` ${late} SIF${late === 1 ? "" : "s"} last published a NAV before ${asOf}; each shows the date of its own latest NAV.`
              : null}
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

function SifLink({ row }: { row: SifRow }) {
  return (
    <Link
      href={`/sif/${row.id}`}
      className="text-[15px] leading-[22px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
    >
      {row.shortName}
    </Link>
  );
}

/** The scheme's own latest NAV — printed, never compared across rows. */
function Nav({ row }: { row: SifRow }) {
  return Number.isFinite(row.nav) ? <>{formatNav(row.nav)}</> : <NotCaptured />;
}

function NavDate({ row }: { row: SifRow }) {
  return row.navAsOf ? (
    <time dateTime={row.navAsOf}>{formatUpdated(row.navAsOf)}</time>
  ) : (
    <NotCaptured />
  );
}

function Change({ cell }: { cell: Cell<number> }) {
  if ("v" in cell) return <Delta pct={cell.v} />;
  return <NotCaptured reason={cell.absent} short />;
}

function MobileFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] uppercase leading-[14px] tracking-[0.06em] text-muted">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
