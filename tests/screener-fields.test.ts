/**
 * The metric registry (lib/screener/fields.ts).
 *
 * The registry is the one place a metric is defined — the filter panel, the
 * column picker, the sort control, the URL codec and Compare all read it — so
 * this checks it is complete (every id the spec names), honest (a planned
 * metric can never be rendered, filtered or sorted), and total over the live
 * rows (every getter answers every row with a value of its declared kind, or
 * a missing value with a reason).
 */
import { describe, expect, it } from "vitest";

import { PERIODS, buildSifRows, monthlyReturns, strategies } from "@/lib/data";
import {
  DEFAULT_COLUMNS,
  FIELDS,
  fieldsFor,
  filterKind,
  getField,
  isLive,
  isSortable,
  isoDay,
  dayIso,
  monthFieldsFor,
  type Field,
} from "@/lib/screener/fields";

const rows = buildSifRows();

/** Every field id spec §7 names, by group. */
const SPEC_IDS = {
  fund: ["name", "amc", "brand", "cat", "str", "mgr", "inc", "age", "status"],
  performance: ["r1d", "r1w", "r1m", "r3m", "r6m", "r1y", "r2y", "rsi"],
  benchmark: ["bm"],
  risk: ["risk", "vol", "mdd"],
  size: ["aum", "amcaum"],
  nav: ["nav", "navdate", "fv"],
  cost: ["ter", "termax", "el", "elpct", "eldays"],
  liquidity: ["liq", "sub"],
  investment: ["min", "minadd", "opt"],
  disclosure: ["disc", "fs", "pf", "sid"],
};
const PLANNED = ["sharpe", "alpha", "beta", "bmr", "xr", "aumg", "eq", "debt", "cash", "glong", "gshort", "net", "top10"];
const ABSENT = ["insufficient-history", "not-captured", "not-applicable", "withheld"];

const byId = (id: string) => getField(id)!;

describe("registry completeness", () => {
  it("defines every field id the spec names, each once", () => {
    const ids = FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [...Object.values(SPEC_IDS).flat(), ...PLANNED]) expect(ids).toContain(id);
  });

  it("marks exactly the spec's future metrics as planned", () => {
    expect(FIELDS.filter((f) => !isLive(f)).map((f) => f.id).sort()).toEqual([...PLANNED].sort());
  });

  it("has one return field per period", () => {
    expect(SPEC_IDS.performance).toHaveLength(PERIODS.length);
    for (const id of SPEC_IDS.performance) expect(byId(id).group).toBe("performance");
  });

  it("the default columns are the PRD's, in its order, and each is flagged default", () => {
    expect(DEFAULT_COLUMNS).toEqual(["name", "amc", "cat", "str", "aum", "risk", "r1m", "r3m", "r6m", "rsi", "ter", "liq"]);
    const flagged = FIELDS.filter((f) => f.column?.default).map((f) => f.id);
    expect(new Set(flagged)).toEqual(new Set(DEFAULT_COLUMNS));
  });

  it("has the spec's presets for age, AUM and minimum investment", () => {
    const presets = (id: string) => {
      const f = byId(id);
      return f.kind === "number" ? (f.filter?.presets ?? []) : [];
    };
    expect(presets("age")).toHaveLength(5);
    expect(presets("aum")).toHaveLength(4);
    expect(presets("min")).toHaveLength(3);
  });

  it("NAV is filterable but never sortable — absolute NAV is not comparable across face values", () => {
    const nav = byId("nav");
    expect(filterKind(nav)).toBe("range");
    expect(isSortable(nav)).toBe(false);
  });
});

describe("planned metrics are never rendered", () => {
  it("are absent from the rendered field list, filters, sorts and the default columns", () => {
    const rendered = fieldsFor(rows).map((f) => f.id);
    for (const id of PLANNED) {
      const f = byId(id);
      expect(rendered).not.toContain(id);
      expect(filterKind(f)).toBeNull();
      expect(isSortable(f)).toBe(false);
      expect(DEFAULT_COLUMNS).not.toContain(id);
      expect(f.status).toBe("planned");
    }
  });
});

function expectKind(f: Field, v: unknown, where: string) {
  switch (f.kind) {
    case "number":
      expect(typeof v === "number" && Number.isFinite(v), where).toBe(true);
      break;
    case "date":
      expect(typeof v === "string" && isoDay(v) !== null, where).toBe(true);
      break;
    case "flag":
      expect(typeof v, where).toBe("boolean");
      break;
    case "enum":
      expect(typeof v, where).toBe("string");
      break;
    case "list":
      expect(Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string"), where).toBe(true);
      break;
  }
}

describe("every live field over every live row", () => {
  const fields = fieldsFor(rows);

  it("answers each row with a value of its kind, or a missing value with a reason", () => {
    for (const f of fields) {
      for (const r of rows) {
        const where = `${f.id} × ${r.code}`;
        const v = f.get(r);
        const missing = v === null || (Array.isArray(v) && v.length === 0);
        if (missing) {
          expect(f.absent, `${where}: missing, but the field cannot say why`).toBeDefined();
          expect(ABSENT).toContain(f.absent!(r));
        } else {
          expectKind(f, v, where);
        }
      }
    }
  });

  it("enum and list options cover every value a row holds, with true counts", () => {
    for (const f of fields) {
      if (f.kind !== "enum" && f.kind !== "list") continue;
      const options = f.options(rows);
      const ids = new Set(options.map((o) => o.id));
      expect(ids.size, f.id).toBe(options.length);
      for (const r of rows) {
        const v = f.get(r);
        for (const id of v === null ? [] : Array.isArray(v) ? v : [v]) expect(ids, `${f.id}: ${id}`).toContain(id);
      }
      for (const o of options) {
        const count = rows.filter((r) => {
          const v = f.get(r);
          return v !== null && (Array.isArray(v) ? v.includes(o.id) : v === o.id);
        }).length;
        expect(o.count, `${f.id}: ${o.id}`).toBe(count);
        expect(o.inert === true, `${f.id}: ${o.id}`).toBe(count === 0);
      }
    }
  });

  it("the strategy options list all seven SEBI strategies, the empty ones inert", () => {
    const str = byId("str");
    if (str.kind !== "enum") throw new Error("str is not an enum field");
    const options = str.options(rows);
    expect(options).toHaveLength(7);
    const live = new Set(strategies.map((s) => s.type));
    expect(options.filter((o) => !o.inert).length).toBe(live.size);
  });
});

describe("month fields", () => {
  it("one per completed month any scheme holds, oldest first", () => {
    const months = [...new Set(strategies.flatMap((s) => monthlyReturns(s.id).map((m) => m.month)))].sort();
    expect(monthFieldsFor(rows).map((f) => f.id)).toEqual(months.map((m) => `m${m}`));
  });

  it("are synthesised on demand for a well-formed month, and only then", () => {
    expect(getField("m2026-08")?.kind).toBe("number");
    expect(getField("m2026-13")).toBeUndefined();
    expect(getField("m2026-8")).toBeUndefined();
    expect(getField("nope")).toBeUndefined();
  });

  it("read a row's own monthly figure, and nothing for a month it lacks", () => {
    for (const r of rows) {
      for (const m of r.monthly) expect(byId(`m${m.month}`).get(r)).toBe(m.pct);
      expect(byId("m1999-01").get(r)).toBeNull();
    }
  });
});

describe("date helpers", () => {
  it("isoDay and dayIso are inverses, and reject impossible dates", () => {
    for (const iso of ["2024-02-29", "2025-10-01", "2026-12-31"]) expect(dayIso(isoDay(iso)!)).toBe(iso);
    expect(isoDay("2026-02-31")).toBeNull();
    expect(isoDay("2026-2-3")).toBeNull();
    expect(isoDay("not a date")).toBeNull();
  });
});
