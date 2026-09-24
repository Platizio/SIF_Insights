import { Rise } from "@/components/motion/Reveal";
import { Section, Shell } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { HBar } from "@/components/ui/HBar";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { SourceNote, type SourceRefLite } from "@/components/ui/SourceNote";
import { cn } from "@/lib/cn";
import {
  SEBI_STRATEGIES,
  amcAum,
  amcs,
  aumByStrategy,
  buildSifRows,
  formatCr,
  formatMonth,
  industryAum,
  schemeAum,
  stats,
  type SourceRef,
  type StrategySlug,
} from "@/lib/data";

import { AmcAumTable, type AmcAumRow } from "./AmcAumTable";
import { SectionHead } from "./SectionHead";

/* ============================================================
   4 · SIF Market & AUM Intelligence — "Where SIF Money Sits"
   (PRD p.27)

   Every total comes from lib/data/aum.ts, which sums ONE month-end
   (the best-covered one) and says how many SIFs it counts. Bars are
   drawn only for strategies with AUM on file; a strategy with SIFs
   but no figure says "Not captured", and one nothing has launched in
   says so — neither gets a bar, because an empty track beside a
   strategy that HAS money would read as zero.

   With no AUM on file at all, the section says exactly that and
   draws nothing. Growth over time is a PRD "future addition" and is
   deliberately not shown.
   ============================================================ */

type StrategyBar = {
  key: string;
  label: string;
  /** SIFs of this strategy on file. */
  schemes: number;
  /** Of those, how many the month's total counts. */
  reporting: number;
  cr: number | null;
};

export function AumIntelligence() {
  const industry = industryAum();
  const rows = buildSifRows();
  const month = industry ? formatMonth(industry.asOf.slice(0, 7)) : null;

  const counts = new Map<StrategySlug | null, number>();
  for (const r of rows) counts.set(r.strategy, (counts.get(r.strategy) ?? 0) + 1);
  const reported = new Map(aumByStrategy().map((s) => [s.strategy, s]));

  const bars: StrategyBar[] = SEBI_STRATEGIES.map((s) => {
    const hit = reported.get(s.slug);
    return {
      key: s.slug,
      label: s.label,
      schemes: counts.get(s.slug) ?? 0,
      reporting: hit?.schemes ?? 0,
      cr: hit ? hit.cr : null,
    };
  });

  /* A mandate SEBI's list does not name still holds money. Its share is the
     exact remainder of the same month's total, never a separate estimate. */
  const unmapped = counts.get(null) ?? 0;
  if (unmapped > 0) {
    const mappedCr = bars.reduce((sum, b) => sum + (b.cr ?? 0), 0);
    const mappedCount = bars.reduce((sum, b) => sum + b.reporting, 0);
    const reporting = industry ? industry.counted - mappedCount : 0;
    bars.push({
      key: "other",
      label: "Other strategy types",
      schemes: unmapped,
      reporting,
      cr: industry && reporting > 0 ? industry.cr - mappedCr : null,
    });
  }

  const rank = (b: StrategyBar) => (b.cr !== null ? 0 : b.schemes > 0 ? 1 : 2);
  bars.sort((a, b) => rank(a) - rank(b) || (b.cr ?? 0) - (a.cr ?? 0));
  const max = Math.max(0, ...bars.map((b) => b.cr ?? 0));

  return (
    <Section id="aum">
      <Shell>
        <SectionHead
          eyebrow="SIF market & AUM"
          lines={["Where SIF", "Money Sits"]}
          copy="Assets under management across the SEBI strategy types, and the asset managers holding the most SIF money — month-end figures as the AMCs publish them."
          aside={
            industry && month ? (
              <AsOf date={`${month} month-end`} iso={industry.asOf} />
            ) : (
              <p className="asof">Month-end AUM not yet on file</p>
            )
          }
        />

        {industry ? (
          <>
            <div className="mt-14 grid gap-14 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-20">
              <Rise>
                <h3 className="text-[15px] leading-[22px] text-ink">AUM by Strategy</h3>
                <ul className="mt-4 border-t border-hairline">
                  {bars.map((b, i) => (
                    <StrategyBarRow key={b.key} bar={b} max={max} total={industry.cr} month={month} index={i} />
                  ))}
                </ul>
              </Rise>

              <Rise delay={0.08}>
                <h3 className="text-[15px] leading-[22px] text-ink">Top Asset Managers by SIF AUM</h3>
                <div className="mt-4">
                  <AmcAumTable rows={amcRows(rows, industry.asOf)} />
                </div>
              </Rise>
            </div>

            <Rise>
              <div className="mt-12 max-w-[80ch] space-y-2 border-t border-hairline pt-6 text-[13px] leading-[20px] text-muted">
                <p>
                  AUM captured for <span className="tabular">{industry.counted}</span> of{" "}
                  <span className="tabular">{industry.total}</span> SIFs, summed over the {month} month-end
                  {industry.complete
                    ? "."
                    : " only. SIFs without a figure for that month are not captured, so totals and shares cover the SIFs counted."}{" "}
                  An asset manager totalled over a different month says which.
                </p>
                <SourceNote sources={aumSources()} note="month-end AUM" />
              </div>
            </Rise>
          </>
        ) : (
          <NotYetCaptured bars={bars} />
        )}
      </Shell>
    </Section>
  );
}

function StrategyBarRow({
  bar,
  max,
  total,
  month,
  index,
}: {
  bar: StrategyBar;
  max: number;
  total: number;
  month: string | null;
  index: number;
}) {
  const inert = bar.cr === null;
  const share = bar.cr !== null && total > 0 ? (bar.cr / total) * 100 : null;

  return (
    <li className="border-b border-hairline py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className={cn("text-[15px] leading-[22px]", inert ? "text-muted" : "text-ink")}>{bar.label}</span>
        {bar.cr !== null ? (
          <span className="tabular shrink-0 text-[15px] leading-[22px] text-ink">{formatCr(bar.cr)}</span>
        ) : (
          <NotCaptured reason={bar.schemes === 0 ? "not-applicable" : "not-captured"} className="shrink-0" />
        )}
      </div>
      {bar.cr !== null ? <HBar value={bar.cr} max={max} delay={Math.min(index, 6) * 0.05} className="mt-3" /> : null}
      <p className="mt-2 text-[13px] leading-[20px] text-muted">
        {bar.schemes === 0 ? (
          "No SIF filed under this strategy yet"
        ) : (
          <>
            {bar.reporting > 0 && bar.reporting < bar.schemes ? (
              <>
                <span className="tabular">{bar.reporting}</span> of{" "}
              </>
            ) : null}
            <span className="tabular">{bar.schemes}</span> SIF{bar.schemes === 1 ? "" : "s"}
            {bar.cr === null && month ? ` · none reported for ${month}` : null}
            {share !== null ? (
              <>
                {" · "}
                <span className="tabular">{share.toFixed(1)}%</span> of the total
              </>
            ) : null}
          </>
        )}
      </p>
    </li>
  );
}

/** Houses by captured SIF AUM, largest first; houses with none on file last. */
function amcRows(rows: ReturnType<typeof buildSifRows>, industryAsOf: string): AmcAumRow[] {
  return amcs
    .map((a) => {
      const t = amcAum(a.id);
      return {
        amc: { id: a.id, name: a.name, sifName: a.sifName, logo: a.logo },
        cr: t ? t.cr : null,
        otherMonth: t && t.asOf !== industryAsOf ? formatMonth(t.asOf.slice(0, 7)) : null,
        counted: t ? t.counted : 0,
        schemes: rows.filter((r) => r.amcId === a.id).length,
      };
    })
    .filter((r) => r.schemes > 0)
    .sort(
      (x, y) =>
        (x.cr === null ? 1 : 0) - (y.cr === null ? 1 : 0) ||
        (y.cr ?? 0) - (x.cr ?? 0) ||
        x.amc.sifName.localeCompare(y.amc.sifName),
    );
}

/** The documents the month-end figures were read from — listed when few, counted when many. */
function aumSources(): SourceRefLite[] {
  const seen = new Map<string, SourceRef>();
  for (const r of buildSifRows()) {
    const a = schemeAum(r.code);
    if (a) seen.set(a.source.id, a.source);
  }
  const all = [...seen.values()];
  if (all.length <= 4) {
    return all.map((s) => ({ label: `${s.publisher} ${s.docType}`, href: s.url }));
  }
  const publishers = new Set(all.map((s) => s.publisher));
  return [{ label: `${all.length} documents from ${publishers.size} publishers` }];
}

/** No AUM on file: say so, and show only what IS known — how many SIFs each strategy holds. */
function NotYetCaptured({ bars }: { bars: StrategyBar[] }) {
  return (
    <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
      <Rise>
        <h3 className="text-[15px] leading-[22px] text-ink">SIF AUM is not yet captured.</h3>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[26px] text-body">
          We publish SIF AUM only from month-end figures the AMCs and AMFI disclose, summed over one
          common month. None of the <span className="tabular">{stats.strategyCount}</span> SIFs has a
          figure on file yet, so this section draws no bars and ranks no asset manager rather than
          showing an estimate.
        </p>
      </Rise>

      <Rise delay={0.08}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">SIFs on file by strategy, with AUM not captured</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="py-3 pr-4 text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
                Strategy
              </th>
              <th scope="col" className="px-4 py-3 text-right text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
                SIFs
              </th>
              <th scope="col" className="py-3 pl-4 text-right text-[12px] font-normal uppercase leading-[14px] tracking-[0.06em] text-muted">
                AUM
              </th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.key} className="border-b border-hairline">
                <th
                  scope="row"
                  className={cn(
                    "py-3 pr-4 text-left text-[15px] font-normal leading-[22px]",
                    b.schemes === 0 ? "text-muted" : "text-ink",
                  )}
                >
                  {b.label}
                </th>
                <td className="tabular px-4 py-3 text-right text-[15px] leading-[22px] text-ink">{b.schemes}</td>
                <td className="py-3 pl-4 text-right">
                  <NotCaptured reason={b.schemes === 0 ? "not-applicable" : "not-captured"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Rise>
    </div>
  );
}
