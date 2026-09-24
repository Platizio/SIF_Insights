import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import { Rise, Rule } from "@/components/motion/Reveal";
import { RiskBand, Section, Shell } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { SourceNote } from "@/components/ui/SourceNote";
import { navSource, navSourceUrl } from "@/lib/data";
import type { DocumentKind, LiquidityBucket, SifRow } from "@/lib/data/types";
import {
  formatCr,
  formatDays,
  formatExpense,
  formatInr,
  formatMonth,
  formatNav,
  formatPct,
  formatUpdated,
} from "@/lib/format";
import type { SifDetail } from "./detail";
import {
  FactList,
  FactRow,
  FactSource,
  MethodologyLink,
  Provenance,
  SectionHead,
  SifSection,
} from "./parts";

/* ============================================================
   /sif/[id] sections 3–8. Server components throughout.

   Every missing value is a <NotCaptured> with the reason it is
   missing — never a dash, a default or an estimate. Where a value
   is a researched fact, the document it was read from is named
   beneath it.
   ============================================================ */

const BUCKET_LABEL: Record<LiquidityBucket, string> = {
  daily: "Daily",
  "twice-weekly": "Twice weekly",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  other: "Other",
};

const DOC_KIND_LABEL: Record<DocumentKind, string> = {
  ISID: "Investment Strategy Information Document",
  SID: "Scheme Information Document",
  KIM: "Key Information Memorandum",
  SAI: "Statement of Additional Information",
  factsheet: "Factsheet",
  portfolio: "Portfolio disclosure",
  addendum: "Addendum",
};

/* ============================================================
   3. Risk
   ============================================================ */

export function SifRisk({ detail }: { detail: SifDetail }) {
  const { row, volatility, drawdown } = detail;

  return (
    <SifSection
      id="risk"
      head={
        <SectionHead eyebrow="Risk" lines={["Risk band, volatility", "and drawdown."]}>
          The risk band is the scheme document&apos;s own classification.
          Volatility and drawdown are calculated by us from AMFI&apos;s published
          NAVs, once enough history is held.
        </SectionHead>
      }
    >
      <Rise>
        <FactList>
          <FactRow
            label="Risk band"
            note={
              <MethodologyLink anchor="#risk-band">What the risk band means</MethodologyLink>
            }
          >
            <RiskBand band={row.riskBand} />
          </FactRow>

          <FactRow
            label="Volatility (annualised)"
            tabular
            note={
              <>
                {volatility ? (
                  <span className="tabular block">
                    Standard deviation of daily returns × √252, over{" "}
                    {volatility.obs.toLocaleString("en-IN")} NAVs from{" "}
                    {formatUpdated(volatility.from)} to {formatUpdated(volatility.to)}.
                  </span>
                ) : null}
                <MethodologyLink anchor="#volatility" className="mt-1" />
              </>
            }
          >
            {volatility ? (
              `${volatility.pct.toFixed(2)}%`
            ) : (
              <NotCaptured
                reason={"absent" in row.volatility ? row.volatility.absent : "insufficient-history"}
              />
            )}
          </FactRow>

          <FactRow
            label="Maximum drawdown"
            tabular
            note={
              <>
                {drawdown ? (
                  <span className="tabular block">
                    From a peak NAV of {formatNav(drawdown.peak.nav)} on{" "}
                    {formatUpdated(drawdown.peak.date)} to a trough of{" "}
                    {formatNav(drawdown.trough.nav)} on {formatUpdated(drawdown.trough.date)}.
                  </span>
                ) : null}
                <MethodologyLink anchor="#max-drawdown" className="mt-1" />
              </>
            }
          >
            {drawdown ? (
              formatPct(drawdown.pct)
            ) : (
              <NotCaptured
                reason={"absent" in row.maxDrawdown ? row.maxDrawdown.absent : "insufficient-history"}
              />
            )}
          </FactRow>
        </FactList>
        <p className="mt-5 max-w-[68ch] text-[13px] leading-[20px] text-muted">
          Risk bands are indicative and may vary with market conditions and
          portfolio composition.
        </p>
      </Rise>
    </SifSection>
  );
}

/* ============================================================
   4. Costs
   ============================================================ */

export function SifCosts({ detail }: { detail: SifDetail }) {
  const { row, strategy, ter } = detail;
  const el = row.exitLoad;

  /* The one expense figure we hold from the disclosures, when it is NOT known
     to be the cap — shown as what it is, never promoted to either row. */
  const unqualified =
    "absent" in row.terMax && strategy.expenseRatio !== null && strategy.expenseRatioIsCap !== true
      ? formatExpense(strategy.expenseRatio, strategy.expenseRatioIsCap)
      : null;

  return (
    <SifSection
      id="costs"
      head={
        <SectionHead eyebrow="Costs" lines={["What the scheme", "charges."]} methodology="#ter">
          The ratio a scheme charges and the maximum its document permits are
          different numbers, so they are shown separately.
        </SectionHead>
      }
    >
      <Rise>
        <FactList>
          <FactRow
            label="Current TER (Regular plan)"
            tabular
            note={ter ? `As of ${formatUpdated(ter.asOf)}` : undefined}
            source={ter ? <FactSource source={ter.source} /> : undefined}
          >
            {ter ? `${ter.pct.toFixed(2)}%` : <NotCaptured />}
          </FactRow>

          <FactRow
            label="Maximum permitted base expense ratio"
            tabular
            note={"v" in row.terMax ? "The ceiling stated in the scheme document." : undefined}
          >
            {"v" in row.terMax ? `${row.terMax.v.toFixed(2)}%` : <NotCaptured reason={row.terMax.absent} />}
          </FactRow>

          {unqualified ? (
            <FactRow
              label="Expense ratio (as disclosed)"
              tabular
              note="The document does not say whether this is the charged ratio or the ceiling."
            >
              {unqualified}
            </FactRow>
          ) : null}

          <FactRow
            label="Exit load"
            note={
              <>
                {exitLoadParse(el)}
                <MethodologyLink anchor="#exit-load" className="mt-1" />
              </>
            }
          >
            {el.text === null ? <NotCaptured /> : el.text}
          </FactRow>
        </FactList>
      </Rise>
    </SifSection>
  );
}

function exitLoadParse(el: SifRow["exitLoad"]): ReactNode {
  if (el.applicable === null || el.text === null) return null;
  if (el.applicable === false) return <span className="block">Read as: no exit load.</span>;
  const parts: string[] = [];
  if (el.pct !== null) parts.push(`${el.tiered ? "up to " : ""}${el.pct.toFixed(2)}%`);
  if (el.periodDays !== null) parts.push(`no load after ${formatDays(el.periodDays)} from allotment`);
  if (parts.length === 0) return null;
  return (
    <span className="tabular block">
      Read as: {parts.join("; ")}
      {el.tiered ? " (tiered)" : ""}.
    </span>
  );
}

/* ============================================================
   5. Liquidity & terms
   ============================================================ */

export function SifTerms({ detail }: { detail: SifDetail }) {
  const { row, facts } = detail;
  const terms = facts.redemptionTerms;
  const sub = facts.subscription;

  return (
    <SifSection
      id="terms"
      head={
        <SectionHead eyebrow="Liquidity & terms" lines={["When you can get in,", "and out."]} methodology="#liquidity">
          Printed in the scheme document&apos;s own words. The screener groups
          these into standard buckets; this page keeps the exact wording.
        </SectionHead>
      }
    >
      <Rise>
        <FactList>
          <FactRow
            label="Redemption"
            note={
              <>
                {row.liquidity ? <span className="block">Screener bucket: {BUCKET_LABEL[row.liquidity]}</span> : null}
                {terms?.value.days && terms.value.days.length > 0 ? (
                  <span className="block">Dealing days: {terms.value.days.join(", ")}</span>
                ) : null}
                {terms?.value.noticeDays !== undefined ? (
                  <span className="tabular block">Notice period: {formatDays(terms.value.noticeDays)}</span>
                ) : null}
              </>
            }
            source={terms ? <FactSource source={terms.source} locator={terms.locator} /> : undefined}
          >
            {row.redemptionText ?? <NotCaptured />}
          </FactRow>

          <FactRow
            label="Subscription"
            note={row.subscriptionBucket ? `Screener bucket: ${BUCKET_LABEL[row.subscriptionBucket]}` : undefined}
            source={sub ? <FactSource source={sub.source} locator={sub.locator} /> : undefined}
          >
            {row.subscriptionText ?? <NotCaptured />}
          </FactRow>

          <FactRow label="Settlement">
            {terms?.value.settlement ?? <NotCaptured />}
          </FactRow>

          <FactRow label="Minimum investment" tabular>
            {row.minInvestment === null ? <NotCaptured /> : formatInr(row.minInvestment)}
          </FactRow>

          <FactRow
            label="Minimum additional investment"
            tabular
            source={facts.minAdditional ? <FactSource source={facts.minAdditional.source} locator={facts.minAdditional.locator} /> : undefined}
          >
            {row.minAdditional === null ? <NotCaptured /> : formatInr(row.minAdditional)}
          </FactRow>

          <FactRow
            label="Plans and options"
            source={facts.options ? <FactSource source={facts.options.source} locator={facts.options.locator} /> : undefined}
          >
            {row.options.length === 0 ? <NotCaptured /> : row.options.join(" · ")}
          </FactRow>

          <FactRow label="Taxation">{row.taxation ?? <NotCaptured />}</FactRow>
          <FactRow label="Dividend (IDCW)">{row.dividend ?? <NotCaptured />}</FactRow>
        </FactList>
        <p className="mt-5 max-w-[68ch] text-[13px] leading-[20px] text-muted">
          Taxation is summarised from the scheme document and may change; consult
          a tax adviser for your own position.
        </p>
      </Rise>
    </SifSection>
  );
}

/* ============================================================
   6. Fund & management
   ============================================================ */

export function SifFund({ detail }: { detail: SifDetail }) {
  const { row, facts, aum, houseAum, amc } = detail;
  const managers = facts.fundManagers;
  const allocation = facts.assetAllocation;
  const objective = facts.objective;

  return (
    <SifSection
      id="fund"
      head={
        <SectionHead eyebrow="Fund & management" lines={["Who runs it,", "and how large it is."]} />
      }
    >
      <Rise>
        <FactList>
          <FactRow
            label="Fund managers"
            source={managers ? <FactSource source={managers.source} locator={managers.locator} /> : undefined}
          >
            {managers && managers.value.length > 0 ? (
              <ul>
                {managers.value.map((m) => (
                  <li key={m.name}>
                    {m.name}
                    {m.role || m.since ? (
                      <span className="text-[13px] text-muted">
                        {" "}
                        — {[m.role, m.since ? `since ${formatUpdated(m.since)}` : null].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : row.managers.length > 0 ? (
              row.managers.join(", ")
            ) : (
              <NotCaptured />
            )}
          </FactRow>

          <FactRow
            label="Inception"
            tabular
            note={
              row.inception
                ? row.inception.basis === "allotment"
                  ? "Date of allotment, from the scheme document."
                  : "Date of the first NAV AMFI published. The allotment date is not captured."
                : undefined
            }
            source={
              facts.allotmentDate ? (
                <FactSource source={facts.allotmentDate.source} locator={facts.allotmentDate.locator} />
              ) : undefined
            }
          >
            {row.inception ? formatUpdated(row.inception.date) : <NotCaptured />}
          </FactRow>

          <FactRow
            label="Scheme AUM"
            tabular
            note={aum ? `Month-end, as of ${formatUpdated(aum.asOf)}` : undefined}
            source={aum ? <FactSource source={aum.source} /> : undefined}
          >
            {aum ? formatCr(aum.cr) : <NotCaptured />}
          </FactRow>

          <FactRow
            label={`${row.brand} total SIF AUM`}
            tabular
            note={
              houseAum ? (
                houseAum.complete ? (
                  `All ${houseAum.total} of the house's schemes, month-end ${formatMonth(houseAum.asOf.slice(0, 7))}.`
                ) : (
                  `AUM is held for ${houseAum.counted} of the house's ${houseAum.total} schemes for ${formatMonth(houseAum.asOf.slice(0, 7))}, so no house total is stated.`
                )
              ) : undefined
            }
          >
            {houseAum && houseAum.complete ? formatCr(houseAum.cr) : <NotCaptured />}
          </FactRow>

          <FactRow
            label="Investment objective"
            source={objective ? <FactSource source={objective.source} locator={objective.locator} /> : undefined}
          >
            {row.objective ?? <NotCaptured />}
          </FactRow>

          <FactRow
            label="Benchmark"
            note={row.benchmarkText && row.benchmarkText !== row.benchmark ? `As the document states it: ${row.benchmarkText}` : undefined}
          >
            {row.benchmark ?? <NotCaptured />}
          </FactRow>

          <FactRow
            label="Asset allocation"
            source={allocation ? <FactSource source={allocation.source} locator={allocation.locator} /> : undefined}
          >
            {allocation && allocation.value.length > 0 ? (
              <table className="w-full border-collapse text-left text-[13px] leading-[20px]">
                <caption className="sr-only">Indicative asset allocation, per the scheme document</caption>
                <thead>
                  <tr className="border-b border-hairline text-muted">
                    <th scope="col" className="py-2 pr-4 font-normal">Instrument</th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">Minimum</th>
                    <th scope="col" className="py-2 text-right font-normal">Maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.value.map((a) => (
                    <tr key={a.asset} className="border-b border-hairline last:border-b-0">
                      <th scope="row" className="py-2 pr-4 font-normal text-ink">{a.asset}</th>
                      <td className="tabular py-2 pr-4 text-right text-ink">{a.minPct}%</td>
                      <td className="tabular py-2 text-right text-ink">{a.maxPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <NotCaptured />
            )}
          </FactRow>
        </FactList>
        {amc ? (
          <p className="mt-5 text-[13px] leading-[20px] text-muted">
            Managed by {amc.name}.{" "}
            <Link href={`/amc/${amc.id}`} className="text-accent underline decoration-transparent underline-offset-4 hover:decoration-current">
              All {amc.sifName} schemes
            </Link>
          </p>
        ) : null}
      </Rise>
    </SifSection>
  );
}

/* ============================================================
   7. Documents & disclosures
   ============================================================ */

export function SifDocuments({ detail }: { detail: SifDetail }) {
  const { row, strategy, points, verifiedAgainst } = detail;
  const isid = row.documents.find((d) => d.kind === "ISID") ?? null;

  return (
    <SifSection
      id="documents"
      head={
        <SectionHead eyebrow="Documents & disclosures" lines={["Read the scheme’s", "own documents."]} methodology="#sources">
          Please read all scheme-related documents carefully before investing.
          Links open the publisher&apos;s own copy.
        </SectionHead>
      }
    >
      <Rise>
        {row.documents.length === 0 ? (
          <p className="border-t border-b border-hairline py-4 text-[15px] leading-[24px] text-body">
            <NotCaptured className="text-[15px]" />
            <span className="mt-1 block text-[13px] leading-[20px] text-muted">
              We hold no verified document link for this scheme yet. The
              documents are published on {row.amcName}&apos;s website.
            </span>
          </p>
        ) : (
          <ul className="border-t border-hairline">
            {row.documents.map((d) => (
              <li key={d.url} className="border-b border-hairline">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group grid gap-1 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-8"
                >
                  <span>
                    <span className="block text-[13px] leading-[20px] text-muted">{DOC_KIND_LABEL[d.kind]}</span>
                    <span className="inline-flex items-center gap-1.5 text-[15px] leading-[24px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
                      {d.title}
                      <ExternalIcon size={11} />
                      <span className="sr-only">(opens in a new tab)</span>
                    </span>
                  </span>
                  <span className="tabular text-[13px] leading-[20px] text-muted">
                    {formatUpdated(d.date)} · {d.publisher}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-10 text-[15px] font-medium leading-[24px] text-ink">Provenance</h3>
        <dl className="mt-3 border-t border-hairline">
          <Provenance label="NAV source">
            <a href={navSourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-hairline underline-offset-4 hover:text-ink">
              {navSource}
            </a>
          </Provenance>
          <Provenance label="AMFI scheme code" tabular>{row.code}</Provenance>
          <Provenance label="ISIN" tabular>
            {strategy.isin ?? <NotCaptured />}
          </Provenance>
          <Provenance label="NAVs held" tabular>
            {points.length.toLocaleString("en-IN")}
            {points.length > 0 ? `, ${formatUpdated(points[0].date)} to ${formatUpdated(points[points.length - 1].date)}` : ""}
          </Provenance>
          <Provenance label="Disclosures">
            {!strategy.disclosuresCaptured ? (
              <NotCaptured />
            ) : (
              <>
                Read from the scheme&apos;s information document
                {verifiedAgainst ? ` (${verifiedAgainst})` : ""}.
                {strategy.disclosuresVerified ? " Confirmed by a second reader." : ""}
                {isid ? (
                  <SourceNote
                    className="mt-1"
                    sources={[{ label: `${isid.publisher} · ISID`, href: isid.url }]}
                  />
                ) : null}
              </>
            )}
          </Provenance>
        </dl>
      </Rise>
    </SifSection>
  );
}

/* ============================================================
   8. Other schemes from the same house
   ============================================================ */

export function SifPager({ detail }: { detail: SifDetail }) {
  const { row, siblings, amc } = detail;
  const index = siblings.findIndex((s) => s.id === row.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const others = siblings.filter((s) => s.id !== row.id);

  return (
    <Section className="pt-0">
      <Shell>
        <Rule />
        {others.length > 0 ? (
          <Rise className="mt-10">
            <p className="text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
              More from {row.brand}
            </p>
            <ul className="mt-4 border-t border-hairline">
              {others.map((s) => (
                <li key={s.id} className="border-b border-hairline">
                  <Link
                    href={`/sif/${s.id}`}
                    className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                  >
                    <span className="text-[15px] leading-[24px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
                      {s.shortName}
                    </span>
                    <span className="text-[13px] leading-[20px] text-muted">{s.strategyLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Rise>
        ) : null}

        <nav
          aria-label={`Schemes from ${row.brand}`}
          className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          {prev ? <PagerLink row={prev} direction="prev" /> : <span aria-hidden="true" />}
          <Link
            href={amc ? `/amc/${amc.id}` : "/amc"}
            className="text-[15px] leading-[22px] text-body underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
          >
            {amc ? `All ${amc.sifName} schemes` : "All asset managers"}
          </Link>
          {next ? <PagerLink row={next} direction="next" /> : <span aria-hidden="true" />}
        </nav>
      </Shell>
    </Section>
  );
}

function PagerLink({ row, direction }: { row: SifRow; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/sif/${row.id}`}
      className={`group flex items-center gap-3 ${isNext ? "sm:flex-row-reverse sm:text-right" : ""}`}
    >
      <ArrowIcon
        size={14}
        className={
          isNext
            ? "shrink-0 text-accent transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
            : "shrink-0 rotate-180 text-accent transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-1"
        }
      />
      <span>
        <span className="block text-[12px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-muted">
          {isNext ? "Next scheme" : "Previous scheme"}
        </span>
        <span className="mt-1 block text-[15px] leading-[22px] text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-accent">
          {row.shortName}
        </span>
      </span>
    </Link>
  );
}
