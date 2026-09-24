import type { Absent, SifRow, StrategySlug } from "@/lib/data/types";
import {
  formatCr,
  formatDays,
  formatInr,
  formatNav,
  formatPct,
  formatUpdated,
} from "@/lib/format";
import {
  DEFAULT_COLUMNS,
  FIELD_ORDER,
  STRATEGIES,
  dayIso,
  fieldLabel,
  filterKind,
  getField,
  isLive,
  isSortable,
  type Field,
  type FieldGroup,
  type FilterValue,
  type NumberField,
  type ScreenState,
} from "@/lib/screener/fields";

/* ============================================================
   The Screener's view model — pure helpers over the registry.

   Nothing here knows a field by name except where the PRD names a
   control (the quick bar, the dependent strategy list). Everything
   else — which filters exist, how a bound prints, which columns can
   be chosen, what a sort key is called — is read off the registry in
   lib/screener/fields.ts, so a new live metric appears in the panel,
   the column picker and the sort control without touching this file.

   Client-safe: type-only data imports (tests/client-imports.test.ts).
   ============================================================ */

/* ---------- Groups ---------- */

/** The advanced panel's sections, in the PRD's order (p.46). */
export const PANEL_GROUPS: { id: string; label: string; groups: FieldGroup[] }[] = [
  { id: "fund", label: "Fund", groups: ["fund"] },
  { id: "performance", label: "Performance", groups: ["performance", "benchmark"] },
  { id: "risk", label: "Risk", groups: ["risk"] },
  { id: "size", label: "AUM", groups: ["size"] },
  { id: "nav", label: "NAV", groups: ["nav"] },
  { id: "cost", label: "Cost", groups: ["cost"] },
  { id: "liquidity", label: "Liquidity", groups: ["liquidity"] },
  { id: "investment", label: "Investment terms", groups: ["investment"] },
  { id: "portfolio", label: "Portfolio", groups: ["portfolio"] },
  { id: "manager", label: "Fund manager", groups: ["manager"] },
  { id: "disclosure", label: "Disclosure", groups: ["disclosure"] },
];

/** The column picker's sections (PRD p.43–44). */
export const COLUMN_GROUPS: { id: string; label: string; groups: FieldGroup[] }[] = [
  { id: "fund", label: "Fund information", groups: ["fund", "manager"] },
  { id: "size", label: "Size", groups: ["size"] },
  { id: "performance", label: "Performance", groups: ["performance"] },
  { id: "benchmark", label: "Benchmark", groups: ["benchmark"] },
  { id: "risk", label: "Risk", groups: ["risk"] },
  { id: "cost", label: "Cost", groups: ["cost"] },
  { id: "liquidity", label: "Liquidity", groups: ["liquidity"] },
  { id: "investment", label: "Investment", groups: ["investment"] },
  { id: "other", label: "Other", groups: ["nav", "disclosure"] },
];

/**
 * Column order. Group rank first, then registry order, then month fields by
 * id — which reproduces DEFAULT_COLUMNS exactly, so toggling a default
 * column off and on again lands it where it was and the URL collapses back
 * to the default (no `cols=` at all).
 */
const COLUMN_RANK: Record<FieldGroup, number> = {
  fund: 0,
  manager: 1,
  size: 2,
  risk: 3,
  performance: 4,
  benchmark: 5,
  cost: 6,
  liquidity: 7,
  investment: 8,
  nav: 9,
  disclosure: 10,
  portfolio: 11,
};

function columnRank(id: string): [number, number, string] {
  const f = getField(id);
  return [
    f ? COLUMN_RANK[f.group] : 99,
    FIELD_ORDER.get(id) ?? Number.MAX_SAFE_INTEGER,
    id,
  ];
}

export function byColumnOrder(a: string, b: string): number {
  const [ga, ia, sa] = columnRank(a);
  const [gb, ib, sb] = columnRank(b);
  return ga - gb || ia - ib || sa.localeCompare(sb);
}

/** The columns to draw: live fields only, the name always first. */
export function visibleColumns(cols: string[] | null): Field[] {
  const ids = [...new Set(["name", ...(cols ?? DEFAULT_COLUMNS)])].sort(byColumnOrder);
  return ids.flatMap((id) => {
    const f = getField(id);
    return f && isLive(f) ? [f] : [];
  });
}

export function toggleColumn(cols: string[] | null, id: string): string[] {
  if (id === "name") return cols ?? DEFAULT_COLUMNS;
  const current = cols ?? DEFAULT_COLUMNS;
  const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
  return [...new Set(["name", ...next])].sort(byColumnOrder);
}

/* ---------- Values ---------- */

export function isMissing(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    (typeof v === "number" && !Number.isFinite(v)) ||
    (Array.isArray(v) && v.length === 0)
  );
}

/** How many rows hold a value for this field. */
export function coverage(f: Field, rows: readonly SifRow[]): number {
  return rows.reduce((n, r) => (isMissing(f.get(r)) ? n : n + 1), 0);
}

export function absentFor(f: Field, r: SifRow): Absent {
  return f.absent?.(r) ?? "not-captured";
}

/**
 * The month-end most rows' AUM is dated to — the latest on a tie. A row
 * whose AUM is from another month prints that month under its figure, so a
 * June value in a column of Augusts is never read as current.
 */
export function commonAumAsOf(rows: readonly SifRow[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.aumAsOf && "v" in r.aumCr) counts.set(r.aumAsOf, (counts.get(r.aumAsOf) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [asOf, n] of counts) {
    const top = best === null ? 0 : (counts.get(best) ?? 0);
    if (best === null || n > top || (n === top && asOf > best)) best = asOf;
  }
  return best;
}

/** A number in its field's unit, as a table cell prints it. */
export function formatValue(f: NumberField, n: number): string {
  switch (f.unit) {
    case "pct":
      return f.signed ? formatPct(n) : `${n.toFixed(2)}%`;
    case "cr":
      return formatCr(n);
    case "inr":
      return formatInr(n);
    case "nav":
      return formatNav(n);
    case "days":
      return formatDays(n);
    case "ratio":
      return n.toFixed(2);
  }
}

const trim = (n: number) =>
  Number(n.toFixed(2)).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** A filter bound, as a chip prints it — short, and in the field's unit. */
export function formatBound(f: Field, n: number): string {
  if (f.kind === "date") return formatUpdated(dayIso(n));
  if (f.kind !== "number") return String(n);
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  switch (f.unit) {
    case "pct":
      return `${sign}${trim(abs)}%`;
    case "cr":
      return `${sign}${formatCr(abs)}`;
    case "inr":
      return `${sign}${formatInr(abs, { compact: true })}`;
    case "nav":
      return `${sign}₹${trim(abs)}`;
    case "days":
      return `${sign}${formatDays(abs)}`;
    case "ratio":
      return `${sign}${trim(abs)}`;
  }
}

/** The unit an input box carries beside it. */
export function unitAffix(f: Field): { prefix?: string; suffix?: string } {
  if (f.kind !== "number") return {};
  switch (f.unit) {
    case "pct":
      return { suffix: "%" };
    case "cr":
      return { prefix: "₹", suffix: "Cr" };
    case "inr":
    case "nav":
      return { prefix: "₹" };
    case "days":
      return { suffix: "days" };
    case "ratio":
      return {};
  }
}

/* ---------- Filters ---------- */

export function presetsOf(f: Field): { id: string; label: string; min?: number; max?: number }[] {
  return f.kind === "number" ? (f.filter?.presets ?? []) : [];
}

export function matchingPreset(f: Field, v: FilterValue | undefined) {
  if (!v || v.t !== "range") return undefined;
  return presetsOf(f).find((p) => (p.min ?? null) === v.min && (p.max ?? null) === v.max);
}

/**
 * The option list a set filter offers. Strategy depends on category (PRD
 * p.32): with categories chosen, only their strategies are listed.
 */
export function optionsFor(f: Field, rows: SifRow[], state: ScreenState) {
  if (f.kind !== "enum" && f.kind !== "list") return [];
  const all = f.options(rows);
  if (f.dependsOn !== "cat") return all;
  const cat = state.filters.cat;
  if (cat?.t !== "set") return all;
  return all.filter((o) => {
    const def = STRATEGIES[o.id as StrategySlug];
    return def ? cat.ids.includes(def.category) : true;
  });
}

function setFilter(s: ScreenState, id: string, v: FilterValue | null): ScreenState {
  const filters = Object.fromEntries(Object.entries(s.filters).filter(([k]) => k !== id));
  if (v) filters[id] = v;
  return { ...s, filters };
}

/** Strategies left chosen that no chosen category contains are dropped. */
function pruneStrategies(s: ScreenState): ScreenState {
  const cat = s.filters.cat;
  const str = s.filters.str;
  if (cat?.t !== "set" || str?.t !== "set") return s;
  const keep = str.ids.filter((id) => {
    const def = STRATEGIES[id as StrategySlug];
    return def ? cat.ids.includes(def.category) : false;
  });
  return setFilter(s, "str", keep.length ? { t: "set", ids: keep } : null);
}

export function withFilter(s: ScreenState, id: string, v: FilterValue | null): ScreenState {
  const next = setFilter(s, id, v);
  return id === "cat" ? pruneStrategies(next) : next;
}

export function toggleOption(s: ScreenState, id: string, option: string): ScreenState {
  const cur = s.filters[id];
  const ids = cur?.t === "set" ? cur.ids : [];
  const next = ids.includes(option) ? ids.filter((x) => x !== option) : [...ids, option];
  return withFilter(s, id, next.length ? { t: "set", ids: next } : null);
}

export function withBound(
  s: ScreenState,
  id: string,
  side: "min" | "max",
  n: number | null,
): ScreenState {
  const cur = s.filters[id];
  const range = cur?.t === "range" ? cur : { t: "range" as const, min: null, max: null };
  const next = { ...range, [side]: n };
  return withFilter(s, id, next.min === null && next.max === null ? null : next);
}

export function clearScreen(s: ScreenState): ScreenState {
  return { ...s, q: "", filters: {}, includeMissing: false };
}

/** Read a typed bound: commas, spaces and the typographic minus tolerated. */
export function parseNumber(text: string): number | null | undefined {
  const t = text.replace(/[,\s]/g, "").replace(/−/g, "-");
  if (t === "") return null;
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/* ---------- Chips ---------- */

/** Fields whose option labels already say what they are ("Equity", "Risk band 2"). */
const BARE = new Set(["cat", "str", "amc", "risk"]);

export type ChipSpec = { key: string; group?: string; text: string; remove: (s: ScreenState) => ScreenState };

const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));
const sharesWord = (a: string, b: string) => {
  const wb = words(b);
  return [...words(a)].some((w) => wb.has(w));
};

/** One chip per chosen option, one per range or flag — in canonical order. */
export function chipsFor(state: ScreenState, rows: SifRow[]): ChipSpec[] {
  const out: ChipSpec[] = [];
  if (state.q) {
    out.push({
      key: "q",
      group: "Search",
      text: `“${state.q}”`,
      remove: (s) => ({ ...s, q: "" }),
    });
  }
  for (const [id, v] of Object.entries(state.filters)) {
    const f = getField(id);
    if (!f || filterKind(f) !== v.t) continue;
    const label = fieldLabel(f, rows);

    if (v.t === "set") {
      const options = f.kind === "enum" || f.kind === "list" ? f.options(rows) : [];
      for (const option of v.ids) {
        const text = options.find((o) => o.id === option)?.label ?? option;
        out.push({
          key: `${id}:${option}`,
          group: BARE.has(id) ? undefined : label,
          text,
          remove: (s) => toggleOption(s, id, option),
        });
      }
      continue;
    }

    if (v.t === "flag") {
      const text = f.kind === "flag" ? f.labels[v.v ? 0 : 1] : String(v.v);
      /* "No exit load" says what it is; "All four captured" needs "Key disclosures". */
      out.push({ key: id, group: sharesWord(text, label) ? undefined : label, text, remove: (s) => withFilter(s, id, null) });
      continue;
    }

    const preset = matchingPreset(f, v);
    let text: string;
    if (preset) text = `${label}: ${preset.label}`;
    else if (f.kind === "date") {
      text =
        v.min !== null && v.max !== null
          ? `${label} ${formatBound(f, v.min)} – ${formatBound(f, v.max)}`
          : v.min !== null
            ? `${label} from ${formatBound(f, v.min)}`
            : `${label} to ${formatBound(f, v.max as number)}`;
    } else if (v.min !== null && v.max !== null) {
      text =
        v.min === v.max
          ? `${label} = ${formatBound(f, v.min)}`
          : `${label} ${formatBound(f, v.min)} to ${formatBound(f, v.max)}`;
    } else if (v.min !== null) text = `${label} ≥ ${formatBound(f, v.min)}`;
    else text = `${label} ≤ ${formatBound(f, v.max as number)}`;
    out.push({ key: id, text, remove: (s) => withFilter(s, id, null) });
  }
  return out;
}

/* ---------- Sorting ---------- */

export function sortLabels(f: Field): { asc: string; desc: string } {
  if (f.kind === "number" && f.sort) return f.sort;
  if ((f.kind === "enum" || f.kind === "list") && f.sort) return f.sort;
  if (f.kind === "date") return { asc: "Oldest first", desc: "Newest first" };
  return { asc: "Ascending", desc: "Descending" };
}

/**
 * With no key chosen the engine orders by name, A–Z, so that is what the
 * headers report (and a first click on the name header reverses it rather
 * than doing nothing visible).
 */
export function effectiveSort(sort: ScreenState["sort"]): ScreenState["sort"] {
  return sort.length ? sort : [{ id: "name", dir: "asc" }];
}

/** The direction a header's first click sorts: figures high→low, words A→Z. */
export function firstDir(f: Field): "asc" | "desc" {
  return f.kind === "number" ? "desc" : "asc";
}

/**
 * A header click. It sets the PRIMARY key — first click in the field's
 * natural direction, second click reversed, third click off — and leaves an
 * explicitly chosen secondary key (the Sort control's "Then by") alone.
 */
export function headerSort(sort: ScreenState["sort"], f: Field): ScreenState["sort"] {
  const [primary, secondary] = effectiveSort(sort);
  const keep = secondary && secondary.id !== f.id ? [secondary] : [];
  if (primary?.id === f.id) {
    if (primary.dir === firstDir(f)) {
      return [{ id: f.id, dir: primary.dir === "asc" ? "desc" : "asc" }, ...keep];
    }
    return keep;
  }
  return [{ id: f.id, dir: firstDir(f) }, ...keep];
}

export function sortableFields(fields: Field[]): Field[] {
  return fields.filter(isSortable);
}
