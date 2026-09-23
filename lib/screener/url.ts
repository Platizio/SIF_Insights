import {
  DEFAULT_COLUMNS,
  FIELD_ORDER,
  dayIso,
  filterKind,
  getField,
  isLive,
  isSortable,
  isoDay,
  type FilterValue,
  type ScreenState,
} from "./fields";

/* ============================================================
   Screen state <-> query string.

   /sif-screener?q=tata&cat=equity&str=equity-long-short,hybrid-long-short
     &risk=1,2,3&r6m=5~&aum=500~&ter=~1.5&el=0&inc=2025-10-01~
     &sort=r6m.desc,vol.asc&cols=name,amc,r6m,vol&nulls=1&pick=SIF-3,SIF-93

   PURE — no window, no React — so the server page can decode the same
   URL the client writes, and the round trip is unit-tested.

   - `~` separates range bounds; either side may be empty. Values are
     in display units: percent as percent, AUM in crore, money in
     rupees, days as days, dates as ISO.
   - Sets are comma-joined. Each value is encodeURIComponent'd and
     joined with a RAW comma, so a comma inside a value (encoded %2C)
     can never split it. URLSearchParams.toString() would encode the
     separators too and turn every URL into %2C soup.
   - CANONICAL: params in a fixed order (q, then filters in registry
     order, then sort, cols, nulls, pick), defaults omitted, set values
     de-duplicated and sorted. One screen, one URL — so a shared link
     and a bookmark of the same screen are the same string.
   - Anything it does not understand is DROPPED, never an error: an
     unknown key, a planned metric, a malformed bound, a filter of the
     wrong shape for its field. A mangled link degrades to a wider
     screen, not a broken page.
   ============================================================ */

export const MAX_SORT = 2;
export const MAX_PICK = 4;

export const DEFAULT_SCREEN: ScreenState = {
  q: "",
  filters: {},
  sort: [],
  cols: null,
  includeMissing: false,
  picked: [],
};

const RESERVED = new Set(["q", "sort", "cols", "nulls", "pick"]);
const CODE = /^SIF-\d+$/;
const MAX_QUERY = 120;

type Input = string | URLSearchParams | Record<string, string | string[] | undefined>;

/** A value, and whether it still needs percent-decoding. */
type Raw = { value: string; encoded: boolean };

function decodePart(part: string, encoded: boolean): string | null {
  if (!encoded) return part;
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return null; // a stray "%" — drop the value, keep the page
  }
}

/** The whole value, decoded. */
const whole = (raw: Raw) => decodePart(raw.value, raw.encoded);

/** The value split on RAW commas, each part decoded, empties dropped. */
const parts = (raw: Raw) =>
  raw.value
    .split(",")
    .map((p) => decodePart(p, raw.encoded)?.trim() ?? "")
    .filter((p) => p.length > 0);

/** First occurrence of each key. A canonical URL never repeats one. */
function readInput(input: Input): Map<string, Raw> {
  const out = new Map<string, Raw>();
  if (typeof input === "string") {
    const search = input.startsWith("?") ? input.slice(1) : input;
    for (const pair of search.split("&")) {
      if (!pair) continue;
      const eq = pair.indexOf("=");
      const key = decodePart(eq < 0 ? pair : pair.slice(0, eq), true);
      if (key === null || out.has(key)) continue;
      out.set(key, { value: eq < 0 ? "" : pair.slice(eq + 1), encoded: true });
    }
  } else if (input instanceof URLSearchParams) {
    input.forEach((value, key) => {
      if (!out.has(key)) out.set(key, { value, encoded: false });
    });
  } else {
    for (const [key, v] of Object.entries(input)) {
      const value = Array.isArray(v) ? v[0] : v;
      if (typeof value === "string") out.set(key, { value, encoded: false });
    }
  }
  return out;
}

function parseBound(text: string, dates: boolean): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  if (dates) return isoDay(t) ?? undefined;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** "5~" / "~1.5" / "2~5" / "5" → a range; malformed → null (drop). */
function parseRange(text: string, dates: boolean): FilterValue | null {
  const [lo, hi, ...rest] = text.includes("~") ? text.split("~") : [text, text];
  if (rest.length > 0) return null;
  const min = parseBound(lo, dates);
  const max = parseBound(hi, dates);
  if (min === undefined || max === undefined || (min === null && max === null)) return null;
  // A reversed range is a slip, not a request for nothing: read it the right way round.
  return min !== null && max !== null && min > max
    ? { t: "range", min: max, max: min }
    : { t: "range", min, max };
}

function parseFlag(text: string): FilterValue | null {
  const t = text.trim().toLowerCase();
  if (t === "1" || t === "true" || t === "yes") return { t: "flag", v: true };
  if (t === "0" || t === "false" || t === "no") return { t: "flag", v: false };
  return null;
}

const byNaturalOrder = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

/** A filter value checked against its field; null when it cannot apply. */
function normaliseFilter(id: string, value: FilterValue): FilterValue | null {
  const field = getField(id);
  if (!field) return null;
  const kind = filterKind(field);
  if (kind !== value.t) return null;

  if (value.t === "set") {
    const ids = [...new Set(value.ids.map((s) => s.trim()).filter(Boolean))].sort(byNaturalOrder);
    return ids.length ? { t: "set", ids } : null;
  }
  if (value.t === "range") {
    const ok = (n: number | null) => n === null || Number.isFinite(n);
    if (!ok(value.min) || !ok(value.max) || (value.min === null && value.max === null)) {
      return null;
    }
    if (field.kind === "date") {
      const integral = (n: number | null) => n === null || Number.isInteger(n);
      if (!integral(value.min) || !integral(value.max)) return null;
    }
    return value.min !== null && value.max !== null && value.min > value.max
      ? { t: "range", min: value.max, max: value.min }
      : { t: "range", min: value.min, max: value.max };
  }
  return { t: "flag", v: value.v };
}

function normaliseCodes(codes: string[], known?: readonly string[]): string[] {
  const allowed = known ? new Set(known.map((c) => c.toUpperCase())) : null;
  const out: string[] = [];
  for (const raw of codes) {
    const code = raw.trim().toUpperCase();
    if (!CODE.test(code) || out.includes(code)) continue;
    if (allowed && !allowed.has(code)) continue;
    out.push(code);
    if (out.length === MAX_PICK) break;
  }
  return out;
}

function normaliseSort(sort: ScreenState["sort"]): ScreenState["sort"] {
  const out: ScreenState["sort"] = [];
  for (const key of sort) {
    const field = getField(key.id);
    if (!field || !isSortable(field) || (key.dir !== "asc" && key.dir !== "desc")) continue;
    if (out.some((k) => k.id === key.id)) continue;
    out.push({ id: key.id, dir: key.dir });
    if (out.length === MAX_SORT) break;
  }
  return out;
}

function normaliseCols(cols: string[] | null): string[] | null {
  if (cols === null) return null;
  const out: string[] = [];
  for (const id of cols) {
    const field = getField(id);
    if (field && isLive(field) && !out.includes(id)) out.push(id);
  }
  if (out.length === 0) return null;
  const isDefault =
    out.length === DEFAULT_COLUMNS.length && out.every((id, i) => id === DEFAULT_COLUMNS[i]);
  return isDefault ? null : out;
}

/** Canonical key order for filters: registry order, then month fields by id. */
function filterOrder(a: string, b: string): number {
  const ia = FIELD_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
  const ib = FIELD_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
  return ia - ib || a.localeCompare(b);
}

/**
 * Any ScreenState made canonical: invalid parts dropped, sets sorted,
 * defaults collapsed. `decodeScreen` always returns one of these, and
 * `encodeScreen` normalises first, so `decode(encode(s))` equals
 * `normaliseScreen(s)`.
 */
export function normaliseScreen(
  state: ScreenState,
  o: { knownCodes?: readonly string[] } = {},
): ScreenState {
  const filters: Record<string, FilterValue> = {};
  for (const id of Object.keys(state.filters).sort(filterOrder)) {
    const value = normaliseFilter(id, state.filters[id]);
    if (value) filters[id] = value;
  }
  return {
    q: state.q.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY),
    filters,
    sort: normaliseSort(state.sort),
    cols: normaliseCols(state.cols),
    includeMissing: state.includeMissing === true,
    picked: normaliseCodes(state.picked, o.knownCodes),
  };
}

/**
 * Query string → ScreenState. Accepts a raw search string (with or without
 * the "?"), a URLSearchParams, or the already-decoded `searchParams` object a
 * Next page receives. Pass `knownCodes` to drop picks for unknown schemes.
 */
export function decodeScreen(
  input: Input,
  o: { knownCodes?: readonly string[] } = {},
): ScreenState {
  const params = readInput(input);
  const filters: Record<string, FilterValue> = {};

  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    const field = getField(key);
    if (!field) continue;
    const kind = filterKind(field);
    let value: FilterValue | null = null;
    if (kind === "set") value = { t: "set", ids: parts(raw) };
    else if (kind === "range") {
      const text = whole(raw);
      value = text === null ? null : parseRange(text, field.kind === "date");
    } else if (kind === "flag") {
      const text = whole(raw);
      value = text === null ? null : parseFlag(text);
    }
    if (value) filters[key] = value;
  }

  const sortRaw = params.get("sort");
  const sort = sortRaw
    ? parts(sortRaw).map((p) => {
        const dot = p.lastIndexOf(".");
        return { id: p.slice(0, dot), dir: p.slice(dot + 1) as "asc" | "desc" };
      })
    : [];

  const qRaw = params.get("q");
  const colsRaw = params.get("cols");
  const nulls = params.get("nulls");
  const pickRaw = params.get("pick");

  return normaliseScreen(
    {
      q: qRaw ? (whole(qRaw) ?? "") : "",
      filters,
      sort,
      cols: colsRaw ? parts(colsRaw) : null,
      includeMissing: nulls ? whole(nulls) === "1" : false,
      picked: pickRaw ? parts(pickRaw) : [],
    },
    o,
  );
}

function formatBound(n: number | null, dates: boolean): string {
  if (n === null) return "";
  return dates ? dayIso(n) : String(n);
}

const enc = encodeURIComponent;
const list = (values: string[]) => values.map(enc).join(",");

/** ScreenState → canonical query string, without the "?" ("" for the default screen). */
export function encodeScreen(state: ScreenState): string {
  const s = normaliseScreen(state);
  const out: string[] = [];

  if (s.q) out.push(`q=${enc(s.q)}`);
  for (const [id, value] of Object.entries(s.filters)) {
    if (value.t === "set") out.push(`${enc(id)}=${list(value.ids)}`);
    else if (value.t === "flag") out.push(`${enc(id)}=${value.v ? "1" : "0"}`);
    else {
      const dates = getField(id)?.kind === "date";
      out.push(`${enc(id)}=${formatBound(value.min, dates)}~${formatBound(value.max, dates)}`);
    }
  }
  if (s.sort.length) out.push(`sort=${list(s.sort.map((k) => `${k.id}.${k.dir}`))}`);
  if (s.cols) out.push(`cols=${list(s.cols)}`);
  if (s.includeMissing) out.push("nulls=1");
  if (s.picked.length) out.push(`pick=${list(s.picked)}`);

  return out.join("&");
}

/** A link to a screen. */
export function screenHref(state: ScreenState, path = "/sif-screener"): string {
  const qs = encodeScreen(state);
  return qs ? `${path}?${qs}` : path;
}

/* ============================================================
   /compare?ids=SIF-3,SIF-93,SIF-21
   ============================================================ */

/**
 * The `ids` param → AMFI codes: case-insensitive, de-duplicated, at most
 * four, and (given `known`) unknown codes dropped. Accepts the raw string or
 * Next's decoded `searchParams.ids` (string | string[] | undefined).
 */
export function parseCompareIds(
  raw: string | string[] | undefined | null,
  known?: readonly string[],
): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const codes = text
    .split(",")
    .map((p) => decodePart(p, /%/.test(p)) ?? "")
    .filter(Boolean);
  return normaliseCodes(codes, known);
}

export function compareHref(codes: string[], path = "/compare"): string {
  const ids = normaliseCodes(codes);
  return ids.length ? `${path}?ids=${list(ids)}` : path;
}
