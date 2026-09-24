#!/usr/bin/env node
/* ============================================================
   Post-build checks over the prerendered HTML — the regressions that
   pass tsc, eslint and vitest and still ship a broken page.

   Run after `next build`:  node scripts/verify-static-html.mjs

   1. Reveal invariant. Motion serialises a hidden variant into the server
      HTML as an inline `opacity:0`. Every such element must carry
      `data-reveal`, which is what the <noscript> reset and RevealGuard
      target; one without it is invisible with JS off and stays invisible
      if its trigger never fires (DESIGN_CONTRACT §1.12).
   2. Dead links. `href="#"`, empty hrefs, and internal links that match
      no prerendered page, dynamic route or configured redirect.
   3. Copy the contract bans (lib/compliance.ts BANNED_COPY) and the
      retired literals — the old inbox, the stale scheme counts, the old
      tagline. Verbatim YouTube titles are exempt: they are the channel's
      own words, quoted. A video with a `displayTitle` is not: the site
      prints that instead, and it is our copy.

   No dependencies: the build manifests say which routes exist, and a
   regex pass is enough for server HTML we generate ourselves.
   ============================================================ */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, ".next", "server", "app");
const read = (p) => readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

/* ---------- which paths exist ---------- */
const prerendered = new Set(Object.keys(json(join(ROOT, ".next", "prerender-manifest.json")).routes));
const routes = json(join(ROOT, ".next", "routes-manifest.json"));
const dynamic = [...(routes.dynamicRoutes ?? []), ...(routes.staticRoutes ?? [])].map(
  (r) => new RegExp(r.regex),
);
const redirectSources = (routes.redirects ?? [])
  .filter((r) => !r.internal)
  .map((r) => new RegExp(r.regex));
const PUBLIC_FILE = /\.(png|jpe?g|svg|webp|avif|ico|webmanifest|xml|txt|pdf|mp4)$/i;

function pathExists(path) {
  if (prerendered.has(path)) return true;
  if (PUBLIC_FILE.test(path)) return true;
  if (path.startsWith("/_next/")) return true;
  return dynamic.some((re) => re.test(path)) || redirectSources.some((re) => re.test(path));
}

/* ---------- banned copy ---------- */
const compliance = read(join(ROOT, "lib", "compliance.ts"));
const bannedBlock = compliance.match(/BANNED_COPY[^=]*=\s*\[([\s\S]*?)\]/);
const BANNED = bannedBlock ? [...bannedBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
const RETIRED = [
  "info@sifinsight.com",
  "Thirty schemes",
  "Seventeen houses",
  "India’s SIF market, in full view",
  "India's SIF market, in full view",
];
const videos = json(join(ROOT, "lib", "content", "videos.json")).videos ?? [];
const EXEMPT_TITLES = videos.filter((v) => !v.displayTitle).map((v) => v.title);

/* Visible text only: drop scripts, styles and tags, decode the few entities
   that matter for matching. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/* ---------- run ---------- */
const failures = [];
const files = htmlFiles(APP);
let checkedLinks = 0;

for (const file of files) {
  const page = "/" + relative(APP, file).split(sep).join("/").replace(/\.html$/, "").replace(/^index$/, "");
  const html = read(file);

  // 1. hidden without data-reveal
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bstyle="[^"]*opacity:\s*0(?![.\d])[^"]*"[^>]*)>/gi)) {
    if (!/\bdata-reveal\b/.test(m[2])) {
      failures.push(`${page}: <${m[1]}> ships opacity:0 without data-reveal — ${m[0].slice(0, 140)}`);
    }
  }

  // 2. links
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)) {
    const href = m[1].replace(/&amp;/g, "&");
    checkedLinks++;
    if (href === "" || href === "#") {
      failures.push(`${page}: dead href="${href}"`);
      continue;
    }
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (!pathExists(path)) failures.push(`${page}: link to ${href} matches no page, route or redirect`);
  }

  // 3. copy
  let text = visibleText(html);
  for (const title of EXEMPT_TITLES) text = text.split(title).join(" ");
  for (const phrase of [...BANNED, ...RETIRED]) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      failures.push(`${page}: contains "${phrase}"`);
    }
  }
  if (/info@sifinsight\.com/i.test(html)) failures.push(`${page}: markup still references info@sifinsight.com`);
}

if (failures.length) {
  console.error(`verify-static-html: ${failures.length} problem(s) in ${files.length} pages\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`verify-static-html: ${files.length} pages, ${checkedLinks} links — clean`);
