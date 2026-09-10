import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Test config for the data-layer invariants in `tests/`.
 *
 * These are PURE assertions over `@/lib/data` and the raw JSON it is built
 * from — no component rendering, so no jsdom and no DOM globals. The default
 * `node` environment is deliberate: adding jsdom would buy nothing here and
 * would make the suite slower and less honest about what it actually covers.
 *
 * Two things the suite needs from the bundler, both of which `lib/data/index.ts`
 * relies on:
 *
 *  1. The `@/` path alias. tsconfig.json maps `@/*` -> `./*`; Vite does not read
 *     tsconfig paths, so it is mirrored here rather than pulled in via an extra
 *     `vite-tsconfig-paths` dependency.
 *  2. JSON imports. Vite handles `import x from "./raw/schemes.json"` natively,
 *     which is what `lib/data/index.ts` does for all five raw files.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
