import Link from "next/link";
import type { ReactNode } from "react";
import { AmcMark } from "@/components/AmcMark";
import { ExternalIcon } from "@/components/icons";
import { Group, GroupItem, Rise } from "@/components/motion/Reveal";
import { RiskBand } from "@/components/primitives";
import { AsOf } from "@/components/ui/AsOf";
import { HBar } from "@/components/ui/HBar";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { cn } from "@/lib/cn";
import { MIXED_STRATEGY_NOTE, PAST_PERFORMANCE_NOTE } from "@/lib/compliance";
import {
  amcById,
  compareSeries,
  formatCr,
  formatDays,
  formatExpense,
  formatMonth,
  formatNav,
  formatPct,
  formatUpdated,
  navLastUpdated,
  RETURN_RULES,
  schemeFacts,
  stats,
  type Absent,
  type DocumentKind,
  type SchemeFacts,
  type SifRow,
} from "@/lib/data";
import { FIELDS, fieldLabel, fieldSource, getField, isLive, LIQUIDITY_LABEL } from "@/lib/screener/fields";
import { BenchmarkCompare } from "./BenchmarkCompare";
import { CompareSection } from "./CompareSection";
import { DiffScope } from "./DiffScope";
import { RebasedLineChart } from "./RebasedLineChart";
import { SeriesSwatch, seriesOf } from "./series";
import {
  absentCell,
  CompareTable,
  fieldCell,
  noteCells,
  registryRow,
  rowIsSame,
  textCell,
  type CellSpec,
  type CompareColumn,
  type CompareRow,
} from "./table";

/* ============================================================
   The comparison itself — PRD "Recommended Compare Page Flow",
   Summary → Strategy → Performance → Risk → Size → Costs →
   Liquidity → Portfolio → Benchmark → Key terms → Documents.

   Server-rendered end to end from the selected SifRows (plus the
   researched scheme facts that are not on a SifRow), so the whole
   comparison is in the first HTML and in a shared link. Rows are
   read off the metric registry wherever it has the field; the few
   parameters it does not model (objective, allocation, redemption
   days, settlement, track record, documents) are built here from the
   same data layer, with the same three absence phrases.

   Never a verdict. The only per-cell markers are the registry's
   factual "Highest / Lowest … among selected" notes.
   ============================================================ */

const LINK =
  "text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink hover:decoration-current";

/* Literal classes per SIF count — Tailwind scans source text. */
const CARD_GRID = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
} as const;

const DOC_LABEL: Record<DocumentKind, string> = {
  ISID: "Information document (ISID)",
  SID: "Scheme Information Document",
  KIM: "Key Information Memorandum",
  SAI: "Statement of Additional Information",
  factsheet: "Factsheet",
  portfolio: "Portfolio disclosure",
  addendum: "Addendum",
};
const DOC_ORDER: DocumentKind[] = ["ISID", "SID", "KIM", "factsheet", "portfolio", "SAI", "addendum"];

const isIso = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const dateText = (s: string) => (isIso(s) ? formatUpdated(s) : s);

/** Distinct registry sources behind a block's fields, as the rows resolve them. */
function sourcesOf(ids: string[], rows: SifRow[], extra: string[] = []): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    const f = getField(id);
    if (f && isLive(f)) out.add(fieldSource(f, rows));
  }
  for (const e of extra) out.add(e);
  return [...out];
}

/** Whole calendar months (and the days left over) between two ISO dates. */
function trackRecord(from: string, to: string): { months: number; days: number } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
  return { months: Math.max(0, months), days };
}

/* ---------- cells the registry does not model ---------- */

function exitLoadCell(r: SifRow): CellSpec {
  const el = r.exitLoad;
  if (el.text) return textCell(el.text);
  if (el.applicable === false) return textCell("No exit load");
  if (el.applicable === true) return textCell("Exit load applies");
  return absentCell("not-captured");
}

function exitPeriodCell(r: SifRow): CellSpec {
  const el = r.exitLoad;
  if (el.applicable === false) return absentCell("not-applicable");
  if (el.periodDays === null) return absentCell("not-captured");
  const text = formatDays(el.periodDays);
  return { key: text, node: <span className="tabular">{text}</span>, num: el.periodDays };
}

function listCell(lines: string[] | null | undefined): CellSpec {
  if (!lines || lines.length === 0) return absentCell("not-captured");
  return {
    key: lines.join(" | "),
    node: (
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    ),
  };
}

function customRow(id: string, label: ReactNode, cells: CellSpec[], hint?: ReactNode): CompareRow {
  return { id, label, cells, hint };
}

/* ============================================================ */

export function CompareView({ rows }: { rows: SifRow[] }) {
  const codes = rows.map((r) => r.code);
  const columns: CompareColumn[] = rows.map((r) => ({ code: r.code, name: r.shortName }));
  const facts: SchemeFacts[] = codes.map((c) => schemeFacts(c));
  const n = Math.min(4, Math.max(2, rows.length)) as keyof typeof CARD_GRID;
  const series = compareSeries(codes);

  /* ---------- rows, section by section ---------- */

  const navCell = (r: SifRow): CellSpec => {
    if (!Number.isFinite(r.nav)) return absentCell("not-captured");
    const text = formatNav(r.nav);
    return {
      key: `${text} ${r.navAsOf}`,
      node: <span className="tabular">{text}</span>,
      sub: r.navAsOf ? `as of ${formatUpdated(r.navAsOf)}` : undefined,
    };
  };
  const riskCell = (r: SifRow): CellSpec =>
    r.riskBand === null
      ? absentCell("not-captured")
      : { key: `Band ${r.riskBand}`, node: <RiskBand band={r.riskBand} />, num: r.riskBand };
  const aumCell = (r: SifRow): CellSpec => {
    if (!("v" in r.aumCr)) return absentCell(r.aumCr.absent);
    const text = formatCr(r.aumCr.v);
    return {
      key: text,
      node: <span className="tabular">{text}</span>,
      sub: r.aumAsOf ? `as of ${dateText(r.aumAsOf)}` : undefined,
      num: r.aumCr.v,
    };
  };

  const summary: CompareRow[] = [
    registryRow("cat", rows),
    registryRow("str", rows),
    registryRow("mgr", rows, { label: "Fund manager" }),
    registryRow("inc", rows),
    registryRow("nav", rows, { cell: (_, r) => navCell(r) }),
    registryRow("aum", rows, { cell: (_, r) => aumCell(r) }),
    registryRow("risk", rows, { cell: (_, r) => riskCell(r) }),
  ];

  const strategy: CompareRow[] = [
    registryRow("cat", rows, { label: "Category" }),
    registryRow("str", rows, { label: "Strategy type" }),
    customRow(
      "objective",
      "Investment objective",
      rows.map((r) =>
        r.objective
          ? {
              key: r.objective,
              node: <p className="line-clamp-4 text-[15px] leading-[24px]">{r.objective}</p>,
              sub: (
                <Link href={`/sif/${r.id}`} className={LINK}>
                  View details
                </Link>
              ),
            }
          : absentCell("not-captured"),
      ),
    ),
    customRow(
      "allocation",
      "Equity / debt allocation",
      facts.map((f) =>
        listCell(
          f.assetAllocation?.value.map((a) =>
            a.minPct === a.maxPct ? `${a.asset}: ${a.minPct}%` : `${a.asset}: ${a.minPct}–${a.maxPct}%`,
          ),
        ),
      ),
      "Range the scheme document permits",
    ),
    customRow(
      "derivatives",
      "Long-short approach · permitted derivative exposure",
      rows.map(() => absentCell("not-captured")),
      `SEBI's SIF framework caps unhedged short exposure at ${stats.maxUnhedgedShortPct}% of net assets for every SIF`,
    ),
    registryRow("bm", rows, { label: "Benchmark" }),
    registryRow("min", rows, { label: "Minimum investment" }),
    registryRow("glong", rows, {
      label: "Gross long · gross short · net exposure",
      hint: "Needs portfolio disclosures",
    }),
  ];

  const performanceIds = ["r1w", "r1m", "r3m", "r6m", "r1y", "r2y", "rsi"];
  const siRow = registryRow("rsi", rows, {
    cell: (f, r) => {
      const cell = fieldCell(f, r, rows);
      const meta = r.returnsMeta.SI;
      return cell.key !== null && meta.from
        ? { ...cell, sub: `From ${formatUpdated(meta.from)}${meta.annualised ? " · annualised" : ""}` }
        : cell;
    },
  });
  /* A trailing period ends on the same date for every SIF, so "highest among
     selected" compares like with like. Since-first-NAV does not: a SIF one day
     old and one a year old are measured over different spans, so the marker
     stands only when every start date agrees. */
  const siStarts = new Set(rows.map((r) => r.returnsMeta.SI.from ?? ""));
  const performance: CompareRow[] = [
    ...performanceIds
      .filter((id) => id !== "rsi")
      .map((id) => registryRow(id, rows)),
    siStarts.size === 1 ? siRow : { ...siRow, notes: undefined },
    registryRow("bmr", rows, { label: "Benchmark return" }),
    registryRow("xr", rows, { label: "Excess return vs benchmark" }),
  ];

  /* The anchor is the registry's, so the link lands where the figure is explained. */
  const method = (id: string) => (
    <>
      SIF Insight calculation ·{" "}
      <Link href={`/methodology${getField(id)?.methodology ?? ""}`} className={LINK}>
        View Calculation Methodology
      </Link>
    </>
  );
  const mddRow = registryRow("mdd", rows, { label: "Maximum drawdown", hint: method("mdd") });
  const risk: CompareRow[] = [
    registryRow("risk", rows, { label: "Risk band", cell: (_, r) => riskCell(r) }),
    registryRow("vol", rows, { label: "Volatility (annualised)", hint: method("vol") }),
    {
      ...mddRow,
      /* A drawdown is a fall, stored ≤ 0: the LOWEST drawdown is the smallest
         fall, so it is measured by size, not by signed value. */
      notes: noteCells(mddRow.cells, "lowest", "Lowest drawdown among selected", Math.abs),
    },
  ];

  const tenure = facts.map((f) =>
    (f.fundManagers?.value ?? [])
      .filter((m) => m.since)
      .map((m) => `${m.name} — since ${dateText(m.since!)}`),
  );
  const size: CompareRow[] = [
    registryRow("aum", rows, { label: "SIF AUM", cell: (_, r) => aumCell(r) }),
    registryRow("amcaum", rows, {
      label: "AMC total SIF AUM",
      /* The month is part of the figure: a house total and the scheme AUM
         above it are only comparable when both say which month-end. */
      cell: (f, r) => {
        const cell = fieldCell(f, r, rows);
        return cell.key !== null && r.amcAumAsOf
          ? { ...cell, sub: `Month-end ${formatMonth(r.amcAumAsOf.slice(0, 7))}` }
          : cell;
      },
    }),
    registryRow("mgr", rows, { label: "Fund manager(s)" }),
    ...(tenure.some((t) => t.length > 0)
      ? [customRow("tenure", "Fund manager experience", tenure.map((t) => listCell(t)), "Tenure on this scheme")]
      : []),
    registryRow("inc", rows),
    customRow(
      "track",
      "Track record",
      rows.map((r) => {
        if (!r.inception) return absentCell("not-captured");
        const { months, days } = trackRecord(r.inception.date, navLastUpdated);
        const text = months >= 1 ? `${months} ${months === 1 ? "month" : "months"}` : formatDays(days);
        return {
          key: text,
          node: <span className="tabular">{text}</span>,
          sub: months >= 1 ? `${formatDays(days)} in all` : undefined,
          num: days,
        };
      }),
      `To ${formatUpdated(navLastUpdated)}`,
    ),
  ];

  const terCell = (r: SifRow): CellSpec => {
    if (!("v" in r.ter)) return absentCell(r.ter.absent);
    const text = `${r.ter.v.toFixed(2)}%`;
    return {
      key: text,
      node: <span className="tabular">{text}</span>,
      sub: r.terAsOf ? `Regular plan · as of ${dateText(r.terAsOf)}` : "Regular plan",
      num: r.ter.v,
    };
  };
  const berCell = (r: SifRow): CellSpec => {
    if (!("v" in r.ber)) return absentCell(r.ber.absent);
    const text = `${r.ber.v.toFixed(2)}%`;
    return {
      key: text,
      node: <span className="tabular">{text}</span>,
      sub: r.terAsOf ? `Regular plan · as of ${dateText(r.terAsOf)}` : "Regular plan",
      num: r.ber.v,
    };
  };
  const terMaxCell = (r: SifRow): CellSpec => {
    if (!("v" in r.terMax)) return absentCell(r.terMax.absent);
    const text = formatExpense(r.terMax.v, true) ?? "";
    return { key: text, node: <span className="tabular">{text}</span>, num: r.terMax.v };
  };
  const costs: CompareRow[] = [
    registryRow("ter", rows, {
      label: "Total TER (incl. levies)",
      hint: "Ratio charged, as the AMC publishes it: the base expense ratio plus brokerage, transaction costs and statutory levies",
      cell: (_, r) => terCell(r),
    }),
    /* Between the total and the cap, so the cap sits under the figure it
       actually limits — a 4.24% total beside a 2.10% cap otherwise reads as
       a breach. */
    registryRow("ber", rows, {
      label: "Base expense ratio (charged)",
      hint: "The part of the TER that the scheme document's cap limits",
      cell: (_, r) => berCell(r),
    }),
    registryRow("termax", rows, {
      label: "Maximum permitted base expense ratio",
      hint: "The cap in the scheme document — not the ratio charged",
      cell: (_, r) => terMaxCell(r),
    }),
    customRow("el", "Exit load", rows.map(exitLoadCell)),
    customRow("eldays", "Exit load period", rows.map(exitPeriodCell)),
  ];

  const liquidity: CompareRow[] = [
    registryRow("min", rows, { label: "Minimum investment" }),
    registryRow("minadd", rows, { label: "Minimum additional investment" }),
    registryRow("sub", rows, {
      label: "Subscription frequency",
      cell: (f, r) =>
        r.subscriptionText ? textCell(r.subscriptionText) : fieldCell(f, r, rows),
    }),
    registryRow("liq", rows, {
      label: "Redemption frequency",
      hint: "As the scheme document words it",
      cell: (f, r) => {
        if (!r.redemptionText) return fieldCell(f, r, rows);
        const cell = textCell(r.redemptionText);
        const bucket = r.liquidity && r.liquidity !== "other" ? LIQUIDITY_LABEL[r.liquidity] : null;
        /* The bucket is a reading aid for wording like "on the 1st and 15th";
           beside "Daily (Business Day)" it would only repeat the text. */
        return cell.key !== null && bucket && !r.redemptionText.toLowerCase().includes(bucket.toLowerCase())
          ? { ...cell, sub: bucket }
          : cell;
      },
    }),
    customRow(
      "days",
      "Redemption days",
      /* A scheme that redeems every business day has no set days: that is
         "Not applicable", not a gap in the data. */
      facts.map((f, i) => {
        const days = f.redemptionTerms?.value.days;
        if ((!days || days.length === 0) && rows[i].liquidity === "daily") {
          return absentCell("not-applicable");
        }
        return textCell(days?.join(", "));
      }),
    ),
    customRow("el-liq", "Exit load", rows.map(exitLoadCell)),
    customRow(
      "settlement",
      "Settlement / redemption terms",
      facts.map((f) => {
        const t = f.redemptionTerms?.value;
        const lines = [
          ...(t?.noticeDays !== undefined ? [`${formatDays(t.noticeDays)} notice`] : []),
          ...(t?.settlement ? [t.settlement] : []),
        ];
        return listCell(lines);
      }),
    ),
  ];

  const keyTerms: CompareRow[] = [
    registryRow("cat", rows, { label: "Category" }),
    registryRow("str", rows, { label: "Strategy" }),
    registryRow("min", rows, { label: "Minimum investment" }),
    registryRow("risk", rows, { label: "Risk band", cell: (_, r) => riskCell(r) }),
    registryRow("bm", rows, { label: "Benchmark" }),
    customRow(
      "expense",
      "Expense ratio",
      rows.map((r) => {
        if ("v" in r.ter) {
          const text = formatExpense(r.ter.v, false) ?? "";
          return { key: text, node: <span className="tabular">{text}</span>, sub: "Charged (current TER)" };
        }
        if ("v" in r.terMax) {
          const text = formatExpense(r.terMax.v, true) ?? "";
          return { key: text, node: <span className="tabular">{text}</span>, sub: "Maximum permitted" };
        }
        return absentCell("not-captured");
      }),
    ),
    customRow("el-terms", "Exit load", rows.map(exitLoadCell)),
    registryRow("liq", rows, {
      label: "Redemption frequency",
      cell: (f, r) => (r.redemptionText ? textCell(r.redemptionText) : fieldCell(f, r, rows)),
    }),
    registryRow("inc", rows),
  ];

  const tables = [summary, strategy, performance, risk, size, costs, liquidity, keyTerms];
  const allRows = tables.flat();
  const identical = allRows.filter((r) => rowIsSame(r.cells)).length;

  const mixed = new Set(rows.map((r) => r.strategy ?? r.type)).size > 1;
  const siField = getField("rsi");
  const siLabel = siField ? fieldLabel(siField, rows) : "Since inception";

  const portfolioPlanned = FIELDS.filter((f) => f.group === "portfolio" && !isLive(f)).map((f) =>
    f.label.toLowerCase(),
  );
  const portfolioLive = FIELDS.filter((f) => f.compare?.section === "portfolio" && isLive(f));
  const portfolioDocs = rows.filter((r) => r.disclosures.portfolio).length;

  const pageSources = [
    "AMFI",
    ...(rows.some((r) => "v" in r.aumCr || "v" in r.ter) ? ["AMC disclosures"] : []),
    ...(rows.some((r) => r.disclosures.factsheet) ? ["Factsheets"] : []),
    ...(rows.some((r) => r.disclosures.captured) ? ["Scheme documents"] : []),
    "SIF Insight calculations",
  ];

  return (
    <DiffScope
      identical={identical}
      total={allRows.length}
      aside={
        <AsOf iso={navLastUpdated} format={formatUpdated} className="lg:text-right" />
      }
    >
      {mixed ? (
        <Rise>
          <p
            role="note"
            className="mt-8 max-w-[92ch] border border-hairline bg-accent-wash px-6 py-5 text-[15px] leading-[26px] text-ink"
          >
            {MIXED_STRATEGY_NOTE}
          </p>
        </Rise>
      ) : null}

      <nav aria-label="Comparison sections" className="mt-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] leading-[20px]">
          {[
            ["summary", "Summary"],
            ["strategy", "Strategy"],
            ["performance", "Performance"],
            ["risk", "Risk"],
            ["size", "Fund size"],
            ["costs", "Costs"],
            ["liquidity", "Liquidity"],
            ["portfolio", "Portfolio"],
            ["benchmark", "Benchmark"],
            ["terms", "Key terms"],
            ["documents", "Documents"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className={LINK}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------- 2. Summary ---------------- */}
      <CompareSection
        id="summary"
        eyebrow="Summary"
        title={["Comparison Summary"]}
        intro="Who runs each SIF, what it is built to do, how big it is and where it sits on the risk scale — before the detail below."
        footer={{ sources: sourcesOf(["cat", "str", "mgr", "inc", "nav", "aum", "risk"], rows) }}
      >
        <Group className={cn("grid grid-cols-1 gap-4", CARD_GRID[n])}>
          {rows.map((r, i) => {
            const amc = amcById.get(r.amcId);
            return (
              <GroupItem key={r.code} className="h-full">
                <article className="flex h-full flex-col border border-hairline bg-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                      SIF {i + 1}
                    </span>
                    <SeriesSwatch index={i} />
                  </div>
                  <AmcMark amc={amc} size="md" className="mt-5" />
                  <h3 className="mt-5 text-[22px] font-medium leading-[30px] text-ink">{r.shortName}</h3>
                  <p className="mt-1 text-[13px] leading-[20px] text-muted">{r.amcName}</p>

                  <dl className="mt-6 border-t border-hairline">
                    {summary.map((row) => {
                      const cell = row.cells[i];
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "flex items-baseline justify-between gap-6 border-b border-hairline py-2.5",
                            rowIsSame(row.cells) && "group-data-[diff=on]/diff:hidden",
                          )}
                        >
                          <dt className="shrink-0 text-[13px] leading-[20px] text-muted">{row.label}</dt>
                          <dd className="min-w-0 text-right text-[13px] leading-[20px] text-ink">
                            {cell.key === null ? (
                              <NotCaptured reason={cell.absent} detail={cell.detail} />
                            ) : (
                              <>
                                <span className="block">{cell.node}</span>
                                {cell.sub ? <span className="block text-muted">{cell.sub}</span> : null}
                              </>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>

                  <Link
                    href={`/sif/${r.id}`}
                    className="group mt-auto inline-flex items-center gap-2 pt-6 text-[13px] leading-[20px] text-accent"
                  >
                    View SIF details
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
                    >
                      <path
                        d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </article>
              </GroupItem>
            );
          })}
        </Group>
        <p className="mt-5 max-w-[80ch] text-[13px] leading-[20px] text-muted">
          A NAV is the price of one unit, and SIFs start from different face values (₹10 or
          ₹1,000), so NAVs are not compared across SIFs. The percentage returns below are.
        </p>
      </CompareSection>

      {/* ---------------- 3. Strategy ---------------- */}
      <CompareSection
        id="strategy"
        eyebrow="Strategy"
        title={["Strategy & Investment Approach"]}
        intro="What each SIF is set up to do, and the limits it works within. Long-short SIFs of different strategies are built for different jobs."
        footer={{ sources: sourcesOf(["cat", "str", "bm", "min"], rows, ["SEBI"]) }}
      >
        <CompareTable caption="Strategy and investment approach" columns={columns} rows={strategy} />
      </CompareSection>

      {/* ---------------- 4. Performance ---------------- */}
      <CompareSection
        id="performance"
        eyebrow="Performance"
        title={["Performance"]}
        intro="Trailing returns to each SIF's latest published NAV. Where a SIF is too young for a period it says so — nothing is annualised or extended to fill the gap."
        footer={{ sources: sourcesOf(performanceIds, rows, ["AMFI"]), methodology: "#returns" }}
      >
        <CompareTable caption="Performance comparison" columns={columns} rows={performance} />
        <div className="mt-14">
          <h3 className="text-[15px] font-medium leading-[24px] text-ink">
            Growth over a common period
          </h3>
          <p className="mt-1 max-w-[68ch] text-[13px] leading-[20px] text-muted">
            Each SIF rebased to 100 at the same start date, so their paths can be read against one
            another.
          </p>
          <div className="mt-6">
            <RebasedLineChart
              siLabel={siLabel}
              series={rows.map((r) => ({
                code: r.code,
                name: r.shortName,
                points: series[r.code] ?? [],
              }))}
            />
          </div>
        </div>
        <p className="mt-6 max-w-[92ch] border-l-2 border-hairline pl-4 text-[13px] leading-[20px] text-body">
          {PAST_PERFORMANCE_NOTE}
        </p>
      </CompareSection>

      {/* ---------------- 5. Risk ---------------- */}
      <CompareSection
        id="risk"
        eyebrow="Risk"
        title={["Risk"]}
        intro="The measured figures, not a label. A lower number is not a safer fund; read each one against the SIF's strategy and time in the market."
        footer={{ sources: sourcesOf(["risk", "vol", "mdd"], rows), methodology: "#volatility" }}
      >
        <CompareTable caption="Risk comparison" columns={columns} rows={risk} />
        <RiskBars rows={rows} minObs={RETURN_RULES.minObsForRisk} />
        <p className="mt-6 max-w-[80ch] text-[13px] leading-[20px] text-muted">
          Sharpe ratio, alpha and beta are not shown yet. They need a longer history and a
          benchmark series held on one consistent method; they will appear here once both are in
          place.
        </p>
      </CompareSection>

      {/* ---------------- 6. Size & management ---------------- */}
      <CompareSection
        id="size"
        eyebrow="Fund size"
        title={["Fund Size & Management"]}
        intro="Context beyond returns: how much each SIF manages, who manages it and for how long it has been running."
        footer={{ sources: sourcesOf(["aum", "amcaum", "mgr", "inc"], rows), methodology: "#aum" }}
      >
        <CompareTable caption="Fund size and management" columns={columns} rows={size} />
        <AumBars rows={rows} />
      </CompareSection>

      {/* ---------------- 7. Costs ---------------- */}
      <CompareSection
        id="costs"
        eyebrow="Costs"
        title={["Costs"]}
        intro="The expense ratio a SIF charges and the maximum its scheme document permits are different figures, so they sit on separate rows and are never swapped for one another."
        footer={{ sources: sourcesOf(["ter", "termax", "el", "eldays"], rows), methodology: "#ter" }}
      >
        <CompareTable caption="Cost comparison" columns={columns} rows={costs} />
      </CompareSection>

      {/* ---------------- 8. Liquidity ---------------- */}
      <CompareSection
        id="liquidity"
        eyebrow="Liquidity"
        title={["Liquidity & Investment Terms"]}
        intro="How often you can get in and out can vary materially across SIFs. Redemption terms are quoted in the scheme document's own words."
        footer={{ sources: sourcesOf(["min", "minadd", "sub", "liq"], rows), methodology: "#liquidity" }}
      >
        <CompareTable caption="Liquidity and investment terms" columns={columns} rows={liquidity} />
      </CompareSection>

      {/* ---------------- 9. Portfolio ---------------- */}
      <CompareSection
        id="portfolio"
        eyebrow="Portfolio"
        title={["Portfolio & Exposure"]}
        intro="Exposure, allocation and concentration, compared only where each SIF's portfolio disclosure allows a like-for-like reading."
      >
        {portfolioLive.length > 0 ? (
          <CompareTable
            caption="Portfolio and exposure"
            columns={columns}
            rows={portfolioLive.map((f) => registryRow(f.id, rows))}
          />
        ) : (
          <div className="grid gap-8 border border-hairline bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
            <div>
              <p className="text-[15px] leading-[26px] text-ink">
                <NotCaptured reason="not-captured" className="text-[15px] text-ink" /> — portfolio
                exposure is not yet held for any of the selected SIFs.
              </p>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-[26px] text-body">
                We compare portfolios only once the disclosures behind them are consistent enough to
                line up; a partial set would rank the SIFs we happened to read first.
                {portfolioDocs > 0 ? (
                  <>
                    {" "}
                    The portfolio disclosures we hold for{" "}
                    <span className="tabular">{portfolioDocs}</span> of these SIFs are linked under
                    Documents below.
                  </>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                Compared here once held
              </p>
              <p className="mt-3 text-[13px] leading-[20px] text-body">
                {[
                  ...portfolioPlanned,
                  "market-cap allocation (large · mid · small)",
                  "sector allocation",
                  "number of holdings",
                  "top 5 holdings %",
                  "top holdings",
                ]
                  .map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t))
                  .join(" · ")}
              </p>
            </div>
          </div>
        )}
      </CompareSection>

      {/* ---------------- 10. Benchmark ---------------- */}
      <CompareSection
        id="benchmark"
        eyebrow="Benchmark"
        title={["Benchmark"]}
        intro="Each SIF's return beside the index it names as its benchmark — relative performance rather than absolute returns alone."
        footer={{ sources: sourcesOf(["bm", "r1m"], rows), methodology: "#benchmarks" }}
      >
        <BenchmarkCompare rows={rows} columns={columns} />
      </CompareSection>

      {/* ---------------- 11. Key terms ---------------- */}
      <CompareSection
        id="terms"
        eyebrow="Key terms"
        title={["Key Terms"]}
        intro="The scheme terms that matter most, in one compact view."
        footer={{ sources: sourcesOf(["cat", "str", "min", "risk", "bm", "ter", "termax", "el", "liq", "inc"], rows) }}
      >
        <CompareTable caption="Key scheme terms" columns={columns} rows={keyTerms} />
      </CompareSection>

      {/* ---------------- 12. Documents ---------------- */}
      <CompareSection
        id="documents"
        eyebrow="Disclosures"
        title={["Documents"]}
        intro="The scheme documents behind these figures, each with its date and publisher. Read them in full before investing."
      >
        <div className={cn("grid grid-cols-1 gap-4", CARD_GRID[n])}>
          {rows.map((r, i) => (
            <DocumentList key={r.code} row={r} index={i} />
          ))}
        </div>
      </CompareSection>

      {/* ---------------- Data date, sources, next step ---------------- */}
      <section aria-label="Data and sources" className="mt-20 border-t border-hairline pt-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
          <div className="space-y-3 text-[13px] leading-[20px] text-muted">
            <AsOf iso={navLastUpdated} format={formatUpdated} />
            <p>Sources: {pageSources.join(" · ")}</p>
            <p>
              Volatility, drawdown and returns are SIF Insight calculations on AMFI&apos;s published
              NAVs.{" "}
              <Link href="/methodology" className={LINK}>
                View Calculation Methodology
              </Link>
            </p>
            <p className="max-w-[80ch]">{PAST_PERFORMANCE_NOTE}</p>
          </div>
          <p className="text-[15px] leading-[26px] text-body lg:text-right">
            <Link href="/contact" className="group inline-flex items-center gap-2 text-ink">
              <span className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:decoration-current">
                Need help understanding these SIFs? Speak to an Expert
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </p>
        </div>
      </section>
    </DiffScope>
  );
}

/* ============================================================
   Comparison bars — the differences made visible. Bars are drawn
   only for figures where length is a fair comparison (volatility,
   the size of a fall, AUM); never NAV. Every bar has its number
   printed beside it.
   ============================================================ */

function BarList({
  title,
  rows,
  value,
  absent,
  text,
  caption,
}: {
  title: string;
  rows: SifRow[];
  value: (r: SifRow) => number | null;
  /** Why a row has no bar — printed where its number would be. */
  absent: (r: SifRow) => Absent;
  text: (v: number) => string;
  caption?: string;
}) {
  const values = rows.map(value);
  const max = Math.max(...values.map((v) => (v === null ? 0 : v)));
  return (
    <div>
      <p className="text-[13px] font-medium leading-[20px] text-ink">{title}</p>
      {caption ? <p className="text-[13px] leading-[20px] text-muted">{caption}</p> : null}
      <ul className="mt-4 space-y-4">
        {rows.map((r, i) => {
          const v = values[i];
          return (
            <li key={r.code}>
              <div className="flex items-baseline justify-between gap-4 text-[13px] leading-[20px]">
                <span className="flex min-w-0 items-center gap-2">
                  <SeriesSwatch index={i} />
                  <span className="truncate text-body">{r.shortName}</span>
                </span>
                {v === null ? (
                  <NotCaptured reason={absent(r)} />
                ) : (
                  <span className="tabular shrink-0 text-ink">{text(v)}</span>
                )}
              </div>
              {v !== null ? (
                <HBar className="mt-2" value={v} max={max} tone={seriesOf(i).tone} delay={i * 0.06} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const reasonOf = (c: SifRow["volatility"]): Absent => ("absent" in c ? c.absent : "not-captured");
const rowVol = (r: SifRow) => ("v" in r.volatility ? r.volatility.v : null);
const rowFall = (r: SifRow) => ("v" in r.maxDrawdown ? Math.abs(r.maxDrawdown.v) : null);
const rowAum = (r: SifRow) => ("v" in r.aumCr ? r.aumCr.v : null);

function RiskBars({ rows, minObs }: { rows: SifRow[]; minObs: number }) {
  const volCount = rows.filter((r) => rowVol(r) !== null).length;
  const fallCount = rows.filter((r) => rowFall(r) !== null).length;
  if (volCount < 2 && fallCount < 2) {
    return (
      <p className="mt-6 max-w-[80ch] text-[13px] leading-[20px] text-muted">
        Comparison bars appear once at least two of the selected SIFs have{" "}
        <span className="tabular">{minObs}</span> published NAVs — the history volatility and
        drawdown are calculated on.
      </p>
    );
  }
  return (
    <div className="mt-8 grid gap-10 border border-hairline bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {volCount >= 2 ? (
        <BarList
          title="Volatility (annualised)"
          rows={rows}
          value={rowVol}
          absent={(r) => reasonOf(r.volatility)}
          text={(v) => `${v.toFixed(2)}%`}
        />
      ) : null}
      {fallCount >= 2 ? (
        <BarList
          title="Maximum drawdown"
          caption="Bar length is the size of the fall, peak to trough."
          rows={rows}
          value={rowFall}
          absent={(r) => reasonOf(r.maxDrawdown)}
          text={(v) => formatPct(-v)}
        />
      ) : null}
    </div>
  );
}

function AumBars({ rows }: { rows: SifRow[] }) {
  if (rows.filter((r) => rowAum(r) !== null).length < 2) return null;
  return (
    <div className="mt-8 border border-hairline bg-surface p-6 sm:p-8 lg:max-w-[760px]">
      <BarList
        title="SIF AUM"
        rows={rows}
        value={rowAum}
        absent={(r) => reasonOf(r.aumCr)}
        text={formatCr}
      />
    </div>
  );
}

/* ============================================================ */

function DocumentList({ row, index }: { row: SifRow; index: number }) {
  const docs = [...row.documents].sort(
    (a, b) => DOC_ORDER.indexOf(a.kind) - DOC_ORDER.indexOf(b.kind) || b.date.localeCompare(a.date),
  );
  return (
    <div className="flex h-full flex-col border border-hairline bg-surface p-6">
      <p className="flex items-start gap-2 text-[15px] font-medium leading-[24px] text-ink">
        <SeriesSwatch index={index} className="mt-2" />
        {row.shortName}
      </p>
      {docs.length === 0 ? (
        <p className="mt-4 text-[13px] leading-[20px] text-muted">
          <NotCaptured reason="not-captured" /> — no scheme documents are held for this SIF yet.{" "}
          {row.amcName} publishes them on its own website.
        </p>
      ) : (
        <ul className="mt-4 border-t border-hairline">
          {docs.map((d) => (
            <li key={d.url} className="border-b border-hairline py-3 last:border-b-0">
              <p className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
                {DOC_LABEL[d.kind]}
              </p>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-start gap-1.5 text-[15px] leading-[24px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:decoration-current"
              >
                {d.title}
                <ExternalIcon size={12} className="mt-1.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="tabular mt-0.5 text-[13px] leading-[20px] text-muted">
                {dateText(d.date)} · {d.publisher}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
