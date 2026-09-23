import type { SifRow } from "@/lib/data/types";

import { getField, isSortable, isoDay, type EnumField, type Field, type ScreenState } from "./fields";
import { MAX_SORT } from "./url";

/* ============================================================
   The sort engine.

   Up to two keys; the second only breaks ties in the first. A row
   MISSING a key's value sorts LAST in BOTH directions: "insufficient
   history" is not the lowest return and not the highest, so it must
   not float to the top of an ascending sort and read as one. Rows
   still tied after the keys fall back to name, then code, so the
   order is total and stable across renders and machines.

   Pure; client-safe (type-only data imports).
   ============================================================ */

type Key = { field: Field; dir: 1 | -1; rank: (r: SifRow) => number | string | null };

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * How a field's value orders. Numbers and dates by value; enums by their
 * declared `order` when they have one (risk band 1→5, SEBI's strategy order),
 * otherwise by the option LABEL the reader sees — sorting AMCs by their ids
 * would order them by our slugs.
 */
function rankFor(field: Field, rows: SifRow[]): Key["rank"] {
  if (field.kind === "number") {
    return (r) => {
      const v = field.get(r);
      return v === null || !Number.isFinite(v) ? null : v;
    };
  }
  if (field.kind === "date") {
    return (r) => {
      const v = field.get(r);
      return v === null ? null : isoDay(v);
    };
  }
  if (field.kind === "flag") {
    return (r) => {
      const v = field.get(r);
      return v === null ? null : Number(v);
    };
  }
  return enumRank(field, rows);
}

function enumRank(field: EnumField, rows: SifRow[]): Key["rank"] {
  const order = field.sort?.order;
  const labels = new Map(field.options(rows).map((o) => [o.id, o.label]));
  const first = (v: string | string[] | null) =>
    v === null ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  return (r) => {
    const id = first(field.get(r));
    if (id === null) return null;
    if (order) {
      const i = order.indexOf(id);
      return i < 0 ? order.length : i;
    }
    return labels.get(id) ?? id;
  };
}

/** Rows sorted by `sort` (at most two keys). Returns a new array. */
export function sortRows(rows: SifRow[], sort: ScreenState["sort"]): SifRow[] {
  const keys: Key[] = [];
  for (const k of sort.slice(0, MAX_SORT)) {
    const field = getField(k.id);
    if (!field || !isSortable(field)) continue;
    keys.push({ field, dir: k.dir === "desc" ? -1 : 1, rank: rankFor(field, rows) });
  }

  const ranked = rows.map((r) => ({ r, ranks: keys.map((k) => k.rank(r)) }));
  ranked.sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const x = a.ranks[i];
      const y = b.ranks[i];
      if (x === null && y === null) continue;
      if (x === null) return 1; // missing last, whichever direction
      if (y === null) return -1;
      const c = compareValues(x, y) * keys[i].dir;
      if (c !== 0) return c;
    }
    return collator.compare(a.r.name, b.r.name) || a.r.code.localeCompare(b.r.code);
  });
  return ranked.map((x) => x.r);
}
