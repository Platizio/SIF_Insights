"use client";

import type { SifRow } from "@/lib/data/types";
import { Delta, RiskBand } from "@/components/primitives";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { formatDays, formatExpense, formatMonth, formatUpdated } from "@/lib/format";
import { LIQUIDITY_LABEL, type Field, type NumberField } from "@/lib/screener/fields";
import { cn } from "@/lib/cn";
import { CategoryChip } from "./bits";
import { absentFor, formatValue, isMissing } from "./model";

/**
 * One field of one row, as a results cell or a card line prints it.
 *
 * Generic by kind and unit, so a new live metric renders without an entry
 * here; the few fields below read richer data off the row (the exit load's
 * rate AND period, the manager's own spelling) or need a component (the
 * risk ramp, gain/loss glyphs). A missing value is always one of the three
 * honest phrases, never a blank, a dash or a zero.
 */
export function FieldValue({
  field,
  row,
  compact = false,
  aumAsOf = null,
}: {
  field: Field;
  row: SifRow;
  /** Narrow contexts: "N/A" with the full phrase for assistive tech. */
  compact?: boolean;
  /** The month-end most rows' AUM is dated to (`commonAumAsOf`). */
  aumAsOf?: string | null;
}) {
  const v = field.get(row);
  const text = "text-[13px] leading-[20px]";

  if (isMissing(v)) {
    return <NotCaptured reason={absentFor(field, row)} short={compact} />;
  }

  switch (field.id) {
    case "cat":
      return <CategoryChip category={row.category} />;
    case "str":
      return <span className={cn(text, "text-body")}>{row.strategyLabel}</span>;
    case "amc":
      return <span className={cn(text, "text-body")}>{row.amcName}</span>;
    case "brand":
      return <span className={cn(text, "text-body")}>{row.brand}</span>;
    case "risk":
      return <RiskBand band={row.riskBand} />;
    case "mgr":
      return <span className={cn(text, "text-body")}>{row.managers.join(", ")}</span>;
    case "opt":
      return <span className={cn(text, "text-body")}>{row.options.join(", ")}</span>;
    case "bm":
      return <span className={cn(text, "text-body")}>{row.benchmark}</span>;
    case "liq":
    case "sub":
      return <span className={cn(text, "text-body")}>{LIQUIDITY_LABEL[v as keyof typeof LIQUIDITY_LABEL]}</span>;
    case "aum":
      return (
        <span className={cn(text, "tabular text-ink")}>
          {formatValue(field as NumberField, v as number)}
          {row.aumAsOf && aumAsOf && row.aumAsOf !== aumAsOf ? (
            <span className="block text-[12px] leading-[16px] text-muted">
              {formatMonth(row.aumAsOf.slice(0, 7))} month-end
            </span>
          ) : null}
        </span>
      );
    case "ter":
    case "termax":
      return (
        <span className={cn(text, "tabular text-ink")}>
          {formatExpense(v as number, field.id === "termax")}
        </span>
      );
    case "el": {
      const load = row.exitLoad;
      if (!load.applicable) return <span className={cn(text, "text-body")}>No exit load</span>;
      const parts = [
        load.pct !== null ? `${load.pct.toFixed(2)}%` : null,
        load.periodDays !== null ? `within ${formatDays(load.periodDays)}` : null,
      ].filter(Boolean);
      return (
        <span className={cn(text, "tabular text-body")} title={load.text ?? undefined}>
          {parts.length ? parts.join(" ") : "Applies"}
          {load.tiered ? <span className="text-muted"> · tiered</span> : null}
        </span>
      );
    }
  }

  if (field.kind === "number") {
    const n = v as number;
    if (field.unit === "pct" && field.signed) return <Delta pct={n} />;
    return <span className={cn(text, "tabular text-ink")}>{formatValue(field, n)}</span>;
  }
  if (field.kind === "date") {
    return (
      <time dateTime={String(v)} className={cn(text, "tabular text-body")}>
        {formatUpdated(String(v))}
      </time>
    );
  }
  if (field.kind === "flag") {
    return <span className={cn(text, "text-body")}>{field.labels[v ? 0 : 1]}</span>;
  }
  const ids = Array.isArray(v) ? v : [String(v)];
  const labels = new Map(field.options([row]).map((o) => [o.id, o.label]));
  return (
    <span className={cn(text, "text-body")}>{ids.map((id) => labels.get(id) ?? id).join(", ")}</span>
  );
}
