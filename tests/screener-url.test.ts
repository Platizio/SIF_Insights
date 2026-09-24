/**
 * The Screener URL codec — a screen is a link, so the link has to be exact.
 *
 * Three properties matter. ROUND TRIP: decoding what was encoded gives back
 * the (normalised) screen. CANONICAL: one screen has one URL, whatever order
 * or spelling it arrived in, so a bookmark and a shared link of the same
 * screen are the same string. FORGIVING: anything the codec does not
 * understand is dropped, never thrown — a mangled link degrades to a wider
 * screen rather than a broken page.
 */
import { describe, expect, it } from "vitest";

import { buildSifRows } from "@/lib/data";
import type { ScreenState } from "@/lib/screener/fields";
import {
  DEFAULT_SCREEN,
  MAX_PICK,
  compareHref,
  decodeScreen,
  encodeScreen,
  normaliseScreen,
  parseCompareIds,
  screenHref,
} from "@/lib/screener/url";

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** The PRD's own example screen. */
const PRD_URL =
  "q=tata&cat=equity&str=equity-long-short,hybrid-long-short&amc=icici,quant&risk=1,2,3&r6m=5~&r1m=2~5&aum=500~&ter=~1.5&liq=daily&el=0&inc=2025-10-01~&sort=r6m.desc,vol.asc&cols=name,amc,r6m,vol&nulls=1&pick=SIF-3,SIF-93";

const PRD_STATE: ScreenState = {
  q: "tata",
  filters: {
    amc: { t: "set", ids: ["icici", "quant"] },
    cat: { t: "set", ids: ["equity"] },
    str: { t: "set", ids: ["equity-long-short", "hybrid-long-short"] },
    inc: { t: "range", min: day("2025-10-01"), max: null },
    r1m: { t: "range", min: 2, max: 5 },
    r6m: { t: "range", min: 5, max: null },
    risk: { t: "set", ids: ["1", "2", "3"] },
    aum: { t: "range", min: 500, max: null },
    ter: { t: "range", min: null, max: 1.5 },
    el: { t: "flag", v: false },
    liq: { t: "set", ids: ["daily"] },
  },
  sort: [
    { id: "r6m", dir: "desc" },
    { id: "vol", dir: "asc" },
  ],
  cols: ["name", "amc", "r6m", "vol"],
  includeMissing: true,
  picked: ["SIF-3", "SIF-93"],
};

/** A small seeded PRNG, so the fuzz cases are the same on every run. */
function prng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe("decodeScreen", () => {
  it("reads the PRD's example screen", () => {
    expect(decodeScreen(PRD_URL)).toEqual(PRD_STATE);
    expect(decodeScreen(`?${PRD_URL}`)).toEqual(PRD_STATE);
  });

  it("reads the same screen from a string, URLSearchParams, or Next's searchParams", () => {
    const fromParams = decodeScreen(new URLSearchParams(PRD_URL));
    const record = Object.fromEntries(new URLSearchParams(PRD_URL));
    expect(fromParams).toEqual(PRD_STATE);
    expect(decodeScreen(record)).toEqual(PRD_STATE);
    // Next hands a repeated key over as an array; the first wins, as in a string.
    expect(decodeScreen({ ...record, q: ["tata", "other"] })).toEqual(PRD_STATE);
  });

  it("reads one URL the same way in every form — an encoded comma separates in all three", () => {
    /* The server page decodes Next's searchParams and the client decodes
       location.search. If the forms disagreed, one link would render two screens. */
    const urls = [
      "str=equity-long-short%2Chybrid-long-short&risk=1%2C2",
      new URLSearchParams(PRD_URL).toString(), // every separator written as %2C
      "q=tata+%26+sons%2B&cols=name%2Cr6m&sort=r6m.desc%2Cvol.asc&pick=SIF-3%2Csif-93",
      "amc=icici,quant&amc=other&cat=equity",
    ];
    for (const url of urls) {
      const fromString = decodeScreen(url);
      const params = new URLSearchParams(url);
      const record: Record<string, string | string[]> = {};
      for (const key of new Set(params.keys())) {
        const all = params.getAll(key);
        record[key] = all.length > 1 ? all : all[0];
      }
      expect(decodeScreen(params), url).toEqual(fromString);
      expect(decodeScreen(record), url).toEqual(fromString);
    }
    expect(decodeScreen(urls[0]).filters).toEqual({
      str: { t: "set", ids: ["equity-long-short", "hybrid-long-short"] },
      risk: { t: "set", ids: ["1", "2"] },
    });
    expect(decodeScreen(urls[1])).toEqual(PRD_STATE);
  });

  it("the empty URL is the default screen", () => {
    expect(decodeScreen("")).toEqual(DEFAULT_SCREEN);
    expect(decodeScreen("?")).toEqual(DEFAULT_SCREEN);
    expect(decodeScreen({})).toEqual(DEFAULT_SCREEN);
  });
});

describe("encodeScreen", () => {
  it("writes the canonical order: q, filters in registry order, sort, cols, nulls, pick", () => {
    const qs = encodeScreen(PRD_STATE);
    expect(qs).toBe(
      "q=tata&amc=icici,quant&cat=equity&str=equity-long-short,hybrid-long-short&inc=2025-10-01~&r1m=2~5&r6m=5~&risk=1,2,3&aum=500~&ter=~1.5&el=0&liq=daily&sort=r6m.desc,vol.asc&cols=name,amc,r6m,vol&nulls=1&pick=SIF-3,SIF-93",
    );
  });

  it("omits every default — the default screen is the bare path", () => {
    expect(encodeScreen(DEFAULT_SCREEN)).toBe("");
    expect(screenHref(DEFAULT_SCREEN)).toBe("/sif-screener");
    expect(encodeScreen({ ...DEFAULT_SCREEN, includeMissing: false, cols: null })).toBe("");
  });

  it("collapses the default column set to no `cols` param", () => {
    const defaults = decodeScreen("cols=name,amc,cat,str,aum,risk,r1m,r3m,r6m,rsi,ter,liq");
    expect(defaults.cols).toBeNull();
    expect(encodeScreen(defaults)).toBe("");
  });

  it("encodes each value and joins with a RAW comma, never %2C soup", () => {
    const qs = encodeScreen({ ...DEFAULT_SCREEN, q: "tata, & sons", filters: { mgr: { t: "set", ids: ["c d", "a"] } } });
    expect(qs).toBe("q=tata%2C%20%26%20sons&mgr=a,c%20d");
    expect(decodeScreen(qs).filters.mgr).toEqual({ t: "set", ids: ["a", "c d"] });
    expect(decodeScreen(qs).q).toBe("tata, & sons");
  });

  it("a comma inside a set id separates, as it does on the way in", () => {
    const s: ScreenState = { ...DEFAULT_SCREEN, filters: { mgr: { t: "set", ids: ["a,b", "c d"] } } };
    expect(normaliseScreen(s).filters.mgr).toEqual({ t: "set", ids: ["a", "b", "c d"] });
    expect(encodeScreen(s)).toBe("mgr=a,b,c%20d");
  });

  it("never throws on a query cut inside an emoji, or holding half of one", () => {
    const emoji = "\u{1F600}";
    const url = `q=${"a".repeat(119)}${encodeURIComponent(emoji)}${encodeURIComponent(emoji)}`;
    const s = decodeScreen(url);
    // Cut at 120 CODE POINTS: the first emoji whole, the second gone, nothing halved.
    expect(s.q).toBe(`${"a".repeat(119)}${emoji}`);
    expect(() => encodeScreen(s)).not.toThrow();
    expect(decodeScreen(encodeScreen(s))).toEqual(s);

    // A lone surrogate typed or pasted into the box is dropped, not encoded.
    const orphan = { ...DEFAULT_SCREEN, q: "ab\uD83D", filters: { mgr: { t: "set" as const, ids: ["x\uDE00"] } } };
    expect(() => encodeScreen(orphan)).not.toThrow();
    expect(encodeScreen(orphan)).toBe("q=ab&mgr=x");
  });

  it("trims after the cut, so normalising a long query is idempotent", () => {
    const s = { ...DEFAULT_SCREEN, q: `${"a".repeat(119)} b` };
    const once = normaliseScreen(s);
    expect(once.q).toBe("a".repeat(119));
    expect(normaliseScreen(once)).toEqual(once);
    expect(decodeScreen(encodeScreen(s))).toEqual(once);
  });

  it("prints a tiny bound without an exponent, so it survives the link", () => {
    const tiny = (min: number): ScreenState => ({ ...DEFAULT_SCREEN, filters: { r6m: { t: "range", min, max: null } } });
    expect(encodeScreen(tiny(1e-7))).toBe("r6m=0~");
    expect(decodeScreen(encodeScreen(tiny(1e-7)))).toEqual(normaliseScreen(tiny(1e-7)));
    // A tiny negative rounds to −0, which is folded (toEqual tells −0 from 0).
    expect(normaliseScreen(tiny(-1e-7)).filters.r6m).toEqual({ t: "range", min: 0, max: null });
    expect(encodeScreen(tiny(0.000001))).toBe("r6m=0.000001~");
    expect(encodeScreen(tiny(1.23456789))).toBe("r6m=1.234568~");
    expect(decodeScreen("r6m=0.00000001~").filters.r6m).toEqual({ t: "range", min: 0, max: null });
  });
});

describe("round trip", () => {
  const cases: ScreenState[] = [
    DEFAULT_SCREEN,
    PRD_STATE,
    { ...DEFAULT_SCREEN, q: "  Hybrid   long-short  " },
    { ...DEFAULT_SCREEN, filters: { r6m: { t: "range", min: -2.5, max: 0 } } },
    { ...DEFAULT_SCREEN, filters: { m2026_08: { t: "range", min: 1, max: null } } },
    { ...DEFAULT_SCREEN, filters: { "m2026-08": { t: "range", min: 1, max: null } } },
    { ...DEFAULT_SCREEN, filters: { disc: { t: "flag", v: true }, fs: { t: "flag", v: false } } },
    { ...DEFAULT_SCREEN, filters: { navdate: { t: "range", min: day("2026-09-01"), max: day("2026-09-22") } } },
    { ...DEFAULT_SCREEN, sort: [{ id: "m2026-07", dir: "asc" }] },
    { ...DEFAULT_SCREEN, cols: ["rsi", "name"], picked: ["sif-21", "SIF-3"] },
  ];

  it("decode(encode(s)) is normaliseScreen(s)", () => {
    for (const s of cases) expect(decodeScreen(encodeScreen(s))).toEqual(normaliseScreen(s));
  });

  it("encoding is idempotent: a decoded URL re-encodes to itself", () => {
    for (const s of cases) {
      const once = encodeScreen(s);
      expect(encodeScreen(decodeScreen(once))).toBe(once);
    }
  });

  it("one screen, one URL — param order and set order in the input do not matter", () => {
    const a = decodeScreen("risk=3,1,2&cat=equity&q=tata");
    const b = decodeScreen("q=tata&cat=equity&risk=1,2,3");
    expect(encodeScreen(a)).toBe(encodeScreen(b));
  });

  it("round-trips a screen built from every live row's values", () => {
    const rows = buildSifRows();
    const s: ScreenState = {
      ...DEFAULT_SCREEN,
      filters: {
        amc: { t: "set", ids: rows.map((r) => r.amcId) },
        str: { t: "set", ids: rows.map((r) => r.strategy!).filter(Boolean) },
      },
      picked: rows.slice(0, 4).map((r) => r.code),
    };
    expect(decodeScreen(encodeScreen(s), { knownCodes: rows.map((r) => r.code) })).toEqual(
      normaliseScreen(s),
    );
  });
});

describe("garbage in, a wider screen out", () => {
  it("drops unknown keys and planned metrics", () => {
    expect(decodeScreen("utm_source=x&foo=1&sharpe=1~2&top10=~5")).toEqual(DEFAULT_SCREEN);
  });

  it("drops a value of the wrong shape for its field", () => {
    const s = decodeScreen("r6m=abc&el=maybe&aum=1~2~3&cat=&inc=2026-02-31~&ter=~&risk=,,");
    expect(s.filters).toEqual({});
  });

  it("reads a reversed range the right way round", () => {
    expect(decodeScreen("r6m=8~2").filters.r6m).toEqual({ t: "range", min: 2, max: 8 });
  });

  it("a bare number is an exact range", () => {
    expect(decodeScreen("aum=500").filters.aum).toEqual({ t: "range", min: 500, max: 500 });
  });

  it("keeps the first of a repeated key", () => {
    expect(decodeScreen("q=first&q=second").q).toBe("first");
  });

  it("sort: at most two keys, known and sortable, no repeats, valid directions", () => {
    const s = decodeScreen("sort=nav.desc,sharpe.asc,r6m.sideways,r6m.desc,r6m.asc,vol.asc,aum.desc,nope.asc");
    expect(s.sort).toEqual([
      { id: "r6m", dir: "desc" },
      { id: "vol", dir: "asc" },
    ]);
  });

  it("cols: drops unknown and planned ids and repeats; all-invalid is the default", () => {
    expect(decodeScreen("cols=name,sharpe,name,bogus,r6m").cols).toEqual(["name", "r6m"]);
    expect(decodeScreen("cols=sharpe,bogus").cols).toBeNull();
  });

  it("pick: upper-cases codes, drops malformed and repeats, keeps at most four", () => {
    expect(decodeScreen("pick=sif-3,SIF-3,bogus,SIF-93,SIF-21,SIF-7,SIF-11").picked).toEqual([
      "SIF-3",
      "SIF-93",
      "SIF-21",
      "SIF-7",
    ]);
    expect(decodeScreen("pick=SIF-3,SIF-99999", { knownCodes: ["SIF-3"] }).picked).toEqual(["SIF-3"]);
  });

  it("nulls is on only for exactly 1", () => {
    expect(decodeScreen("nulls=1").includeMissing).toBe(true);
    for (const v of ["0", "true", "yes", ""]) expect(decodeScreen(`nulls=${v}`).includeMissing).toBe(false);
  });

  it("survives malformed percent-encoding without throwing", () => {
    expect(() => decodeScreen("q=%E0%A4%A&amc=%&%zz=1&cat=equity")).not.toThrow();
    expect(decodeScreen("q=%E0%A4%A&cat=equity")).toEqual({
      ...DEFAULT_SCREEN,
      filters: { cat: { t: "set", ids: ["equity"] } },
    });
  });

  it("clamps an absurdly long query", () => {
    expect(decodeScreen(`q=${"a".repeat(1000)}`).q.length).toBeLessThanOrEqual(120);
  });

  it("never throws, and always yields a canonical screen, on random input", () => {
    const rand = prng(20260923);
    const alphabet = "abcqrsz0159-_.,~%&=?+ SIF-3r6mnullspicksortcolsamcriskinc";
    for (let i = 0; i < 2000; i++) {
      const len = Math.floor(rand() * 60);
      let input = "";
      for (let j = 0; j < len; j++) input += alphabet[Math.floor(rand() * alphabet.length)];
      let s: ScreenState;
      expect(() => (s = decodeScreen(input)), input).not.toThrow();
      expect(normaliseScreen(s!), input).toEqual(s!);
      expect(decodeScreen(encodeScreen(s!)), input).toEqual(s!);
    }
  });

  it("encodes any state without throwing, and round-trips it — long, emoji-laden queries and extreme bounds included", () => {
    /* The decode fuzz above never builds a long query or a tiny bound, which
       is where encoding broke. This one fuzzes the STATE side. */
    const rand = prng(20260924);
    const pieces = ["a", "Z", " ", "  ", "-", ",", "\u{1F600}", "é", "\uD83D", "\uDE00", "\t", "é"];
    const magnitudes = [0, 1e-9, 1e-7, 1e-6, 0.05, 1.5, 123.456789, 1e6, 1e14];
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
    for (let i = 0; i < 1000; i++) {
      let q = "";
      const len = Math.floor(rand() * 200);
      for (let j = 0; j < len; j++) q += pick(pieces);
      const bound = () => (rand() < 0.2 ? null : pick(magnitudes) * (rand() < 0.5 ? -1 : 1));
      const s: ScreenState = {
        ...DEFAULT_SCREEN,
        q,
        filters: {
          r6m: { t: "range", min: bound(), max: bound() },
          mgr: { t: "set", ids: [pick(pieces) + pick(pieces), pick(pieces)] },
        },
      };
      let qs = "";
      expect(() => (qs = encodeScreen(s)), JSON.stringify(s)).not.toThrow();
      const once = normaliseScreen(s);
      expect(Array.from(once.q).length).toBeLessThanOrEqual(120);
      expect(normaliseScreen(once), JSON.stringify(s)).toEqual(once);
      expect(decodeScreen(qs), JSON.stringify(s)).toEqual(once);
      expect(encodeScreen(decodeScreen(qs))).toBe(qs);
    }
  });
});

describe("/compare ids", () => {
  const known = ["SIF-3", "SIF-21", "SIF-93", "SIF-7", "SIF-11"];

  it("parses case-insensitively, de-duplicates, and keeps at most four", () => {
    expect(parseCompareIds("sif-3,SIF-3,sif-93", known)).toEqual(["SIF-3", "SIF-93"]);
    expect(parseCompareIds("SIF-3,SIF-21,SIF-93,SIF-7,SIF-11", known)).toHaveLength(MAX_PICK);
  });

  it("drops unknown codes when told which are known, and malformed ones always", () => {
    expect(parseCompareIds("SIF-3,SIF-99999,<script>", known)).toEqual(["SIF-3"]);
    expect(parseCompareIds("SIF-3,SIF-99999,<script>")).toEqual(["SIF-3", "SIF-99999"]);
  });

  it("accepts Next's decoded searchParams shapes, and nothing", () => {
    expect(parseCompareIds(["SIF-3,SIF-21", "SIF-93"], known)).toEqual(["SIF-3", "SIF-21", "SIF-93"]);
    expect(parseCompareIds("SIF-3%2CSIF-21", known)).toEqual(["SIF-3", "SIF-21"]);
    expect(parseCompareIds(undefined)).toEqual([]);
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
  });

  it("compareHref writes the canonical link, and parses back to the same codes", () => {
    expect(compareHref(["sif-3", "SIF-93", "SIF-3"])).toBe("/compare?ids=SIF-3,SIF-93");
    expect(compareHref([])).toBe("/compare");
    const href = compareHref(["SIF-3", "SIF-21"]);
    expect(parseCompareIds(new URL(href, "https://x.test").searchParams.get("ids"), known)).toEqual([
      "SIF-3",
      "SIF-21",
    ]);
  });
});
