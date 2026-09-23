/**
 * The client-bundle rule: no `"use client"` module may reach the data layer.
 *
 * `lib/data` holds the full NAV history, and a client island that value-
 * imports anything behind it ships that history to the browser — which is
 * how `"SIF-3":[[` ended up in the chunk the root layout loads on every page,
 * because NfoBar (in the layout) imported `activeNfos`. Client islands take
 * serialisable props from a server component instead.
 *
 * The check follows VALUE imports transitively from every client module, so
 * a client file importing a "client-safe" helper that itself imports
 * `@/lib/data` fails too. Type-only imports are erased at compile time and
 * are allowed; `lib/data/types.ts` is the one module under lib/data a client
 * file may reach, and it must stay import-free for that to hold.
 *
 * Source text is scanned, not the compiled graph: this runs in milliseconds
 * with no build, and every import in this codebase is a static `import …
 * from "…"` or `export … from "…"`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const posix = (p: string) => relative(ROOT, p).split(sep).join("/");

/**
 * Client files that still value-import `@/lib/data`, and why they may.
 * Both are retired in W3, when their routes become redirects and their parts
 * move into server-fed components; delete the entry with the file.
 */
const ALLOWLIST: Record<string, string> = {
  "app/sif-tracker/TrackerTable.tsx": "retired in W3",
  "app/nav-tracker/NavExplorer.tsx": "retired in W3",
};

/** The only module under lib/data a client file may import. */
const CLIENT_SAFE_DATA = "lib/data/types.ts";

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** A leading "use client" directive — comments and blank lines may precede it. */
function isClientModule(source: string): boolean {
  const body = source.replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  return /^["']use client["']/.test(body);
}

type Edge = { spec: string; typeOnly: boolean };

/** Every static import / re-export in a module, with whether it is type-only. */
function importsOf(source: string): Edge[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  const edges: Edge[] = [];
  const re =
    /\b(import|export)\s+(type\s+)?((?:[\w*${}\s,]|\btype\b)*?)\s*from\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of code.matchAll(re)) {
    const spec = m[4] ?? m[5] ?? m[6];
    if (m[5] || m[6]) {
      edges.push({ spec, typeOnly: false });
      continue;
    }
    if (m[2]) {
      edges.push({ spec, typeOnly: true });
      continue;
    }
    // `import { type A, type B } from` is type-only too; a default or
    // namespace binding, or any untyped name, is a value import.
    const clause = m[3].trim();
    const braces = clause.match(/^\{([\s\S]*)\}$/);
    const typeOnly =
      braces !== null &&
      braces[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .every((s) => /^type\s/.test(s));
    edges.push({ spec, typeOnly });
  }
  return edges;
}

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx"];

/** A local import resolved to a file, or null for a package / asset. */
function resolveLocal(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of EXTENSIONS) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

function isForbidden(file: string): boolean {
  const p = posix(file);
  return p.startsWith("lib/data/") && p !== CLIENT_SAFE_DATA;
}

/** The first value-import chain from `root` into the data layer, or null. */
function dataChain(root: string): string[] | null {
  const seen = new Set<string>([root]);
  const queue: string[][] = [[root]];
  while (queue.length) {
    const path = queue.shift()!;
    const file = path[path.length - 1];
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    for (const edge of importsOf(readFileSync(file, "utf8"))) {
      if (edge.typeOnly) continue;
      const target = resolveLocal(edge.spec, file);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      const next = [...path, target];
      if (isForbidden(target)) return next.map(posix);
      queue.push(next);
    }
  }
  return null;
}

const clientFiles = ["app", "components", "lib"]
  .flatMap((d) => walk(join(ROOT, d)))
  .filter((f) => isClientModule(readFileSync(f, "utf8")));

describe("client bundle rule", () => {
  it("finds the client modules (the scan itself works)", () => {
    const found = clientFiles.map(posix);
    expect(found).toContain("components/sections/NfoTicker.tsx");
    expect(found).toContain("lib/url-state.ts");
    // A server wrapper is not a client module.
    expect(found).not.toContain("components/sections/NfoBar.tsx");
  });

  for (const file of clientFiles) {
    const name = posix(file);
    if (name in ALLOWLIST) continue;
    it(`${name} reaches no data-layer value`, () => {
      const chain = dataChain(file);
      expect(chain, chain ? `value-import chain: ${chain.join(" → ")}` : "").toBeNull();
    });
  }

  it("the allowlist names only files that still exist and still need it", () => {
    for (const [name, reason] of Object.entries(ALLOWLIST)) {
      const file = join(ROOT, name);
      expect(existsSync(file), `${name} is gone (${reason}) — remove it from ALLOWLIST`).toBe(true);
      expect(isClientModule(readFileSync(file, "utf8")), `${name} is no longer a client file`).toBe(
        true,
      );
      expect(dataChain(file), `${name} no longer imports lib/data — remove it`).not.toBeNull();
    }
  });

  it("lib/data/types.ts imports nothing, so a type import from it can never carry data", () => {
    const edges = importsOf(readFileSync(join(ROOT, CLIENT_SAFE_DATA), "utf8"));
    expect(edges).toEqual([]);
  });

  it("the client-safe helpers are client-safe: format, screener, compliance, url-state, use-today", () => {
    const helpers = [
      "lib/format.ts",
      "lib/compliance.ts",
      "lib/url-state.ts",
      "lib/use-today.ts",
      ...walk(join(ROOT, "lib/screener")).map(posix),
    ];
    for (const name of helpers) {
      const chain = dataChain(join(ROOT, name));
      expect(chain, chain ? `${name}: ${chain.join(" → ")}` : "").toBeNull();
    }
  });
});

describe("the scanner itself", () => {
  it("tells type-only imports from value imports", () => {
    const edges = importsOf(
      [
        `import type { Nfo } from "@/lib/data";`,
        `import { type Nfo, type Period } from "@/lib/data";`,
        `import { type Nfo, stats } from "@/lib/data";`,
        `import data from "@/lib/data/raw/schemes.json";`,
        `import * as all from "@/lib/data";`,
        `export { stats } from "@/lib/data";`,
        `export type { Nfo } from "@/lib/data";`,
        `import "@/lib/data/side-effect";`,
        `const lazy = () => import("@/lib/data");`,
        `// import { stats } from "@/lib/data";`,
      ].join("\n"),
    );
    expect(edges.map((e) => e.typeOnly)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("recognises the directive after a header comment, and not inside one", () => {
    expect(isClientModule(`/* header */\n"use client";\nexport {}`)).toBe(true);
    expect(isClientModule(`// note\n'use client';`)).toBe(true);
    expect(isClientModule(`import x from "y";\n"use client";`)).toBe(false);
    expect(isClientModule(`/* "use client" */\nexport {}`)).toBe(false);
  });

  it("flags a JSON import under lib/data/raw as the data layer", () => {
    expect(isForbidden(join(ROOT, "lib/data/raw/nav-history.json"))).toBe(true);
    expect(isForbidden(join(ROOT, "lib/data/index.ts"))).toBe(true);
    expect(isForbidden(join(ROOT, "lib/data/types.ts"))).toBe(false);
    expect(isForbidden(join(ROOT, "lib/format.ts"))).toBe(false);
  });
});
