# SIF Insight

India's public record of the Specialised Investment Fund market — every SIF
scheme AMFI publishes, with its NAV history and the terms read out of its own
scheme information document.

Operated by Platizio Services LLP, a distributor of Mutual Funds and SIFs. The
site is editorial and informational: it is not an AMC, not an investment
adviser, and nothing it renders is advice.

Production: <https://sifinsight.com>

---

## The one rule

**Every number on this site traces to `@/lib/data`, and every field in
`@/lib/data` traces to a source.** Nothing is defaulted, rounded into
existence, or inferred to fill a gap.

Where a scheme's information document does not state a field, the field is
`null` and the UI renders **"Not captured"** — visibly, in place, rather than
as a blank cell, a dash, or a plausible-looking default. `disclosuresCaptured`
is *derived* from whether a disclosure entry exists rather than stored as a
flag, so it cannot drift from the data it describes. The same is true of every
count in `stats`.

This is a financial-services site in a SEBI category that did not exist before
2025. A wrong expense ratio is worse than a missing one, and a placeholder is
worse than an admission. If you are adding data, read
[`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) first — §1.13 is this rule written
out at length.

---

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, once (`tests/`) |

The test suite is data-integrity focused, not UI-focused: it asserts that NAV
series are ordered and non-empty, that derived counts match the raw JSON, that
absent fields stay absent, and that expired NFOs never render.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Motion · GSAP · Lenis · React Three Fiber

Every route is statically rendered. There is no runtime data fetch, no API
route, no database and no backend — see the pipeline section below for why.

---

## Layout

```
app/                 Routes. One directory per page; 30 routes total.
components/
  sections/          Page-level compositions (Hero, NavBoard, SiteFooter…)
  motion/            Reveal primitives — the site's whole motion vocabulary
  webgl/             R3F canvases (hero, yield surface)
  primitives.tsx     Shell, Section, Card, Eyebrow, RiskBand, PendingBadge
lib/
  data/index.ts      THE data layer. Types, derivations, formatting, stats.
  data/raw/*.json    Source JSON. Machine-written and hand-researched.
pipeline/            Python. Nightly AMFI NAV fetch (see below).
tests/               Vitest — data integrity.
```

### `lib/data/raw/`

| File | Written by | Holds |
|---|---|---|
| `schemes.json` | Pipeline (NAV) + hand (identity) | The 30 schemes, the 17 AMCs, today's NAV, `navAsOf` |
| `nav-history.json` | Pipeline | Every published NAV per scheme, back to each scheme's first |
| `disclosures.json` | Hand research | Scheme terms, **keyed by AMFI scheme code** |
| `faqs.json` | Hand | FAQ accordion content |
| `nfo-news.json` | Hand | The NFO ticker |

`disclosures.json` is deliberately a separate file from `schemes.json` so the
nightly NAV job and hand disclosure research never write to the same file, and
so a merge conflict between them is impossible.

**Disclosure entries are keyed by AMFI scheme code (`SIF-122`), not by our
slug.** The slug is ours and could be renamed; the scheme code is AMFI's and
identifies the fund. A scheme with no entry has nothing researched, and every
field resolves to `null`.

---

## The NAV pipeline

The site is statically rendered and NAV moves once a day, so **there is no live
backend and no runtime fetch.** A nightly GitHub Actions job pulls AMFI's file,
writes JSON into `lib/data/raw/`, and the resulting commit triggers a redeploy.

```
GitHub Actions cron (23:30 IST, Mon–Fri)
  → python pipeline/fetch_nav.py    # fetch → validate 30 codes → upsert → export
  → npx tsc --noEmit                # the data must typecheck before it lands
  → git commit + push               # the host rebuilds and redeploys
```

23:30 IST because AMCs file SIF NAV on the AMFI portal by 23:00 IST on each
business day; running earlier risks capturing the previous day's values.

**The job fails loudly.** If AMFI's format drifts or any of the 30 scheme codes
stops resolving, `fetch_nav.py` exits non-zero and the workflow fails rather
than committing partial or defaulted data. A red build is the intended
behaviour — stale-but-true beats fresh-but-wrong.

The commit message must never contain `[skip ci]`: the host reads that token as
"do not deploy", which would land the data in git and never on the site.

See [`pipeline/README.md`](pipeline/README.md) for the scripts and the one-time
Excel backfill.

---

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `CONTACT_EMAIL_PROVIDER_KEY` | No | Transactional email key for the contact form |

Server-only — **no `NEXT_PUBLIC_` prefix**, or the key ships to the browser.
Set it in `.env.local` for development and in the host's environment for
production. Never commit it.

Without it the contact form still validates fully and then reports, honestly,
that it has no delivery path — it never claims a success it cannot prove. See
the `TODO(contact-delivery)` contract in
[`app/contact/actions.ts`](app/contact/actions.ts): wiring a provider is a
change to `deliverEnquiry()` and nothing else.

---

## Known gaps

Tracked deliberately and visible in the UI rather than papered over:

- **Contact delivery** is unwired (above).
- **Privacy Policy / Terms of Service** are unwritten. The footer renders them
  as inert text, not as links to `#`.
- **Debt strategies** — the category is genuinely empty. `/strategies/debt`
  says so; there is no "coming soon" grid.
- **Disclosure coverage** — all 30 schemes have a document behind them, but
  some documents do not state every field. Those render "Not captured". The
  counts on the site are derived, so they correct themselves as gaps close.
- **Expense ratios are ISID caps**, not the TER actually charged, for every
  scheme where `expenseRatioIsCap` is true. Anywhere the number is shown, that
  qualifier must travel with it.

---

## Docs

| File | What it covers |
|---|---|
| [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) | Type scale, colour, motion, and the data-honesty rules. Binding. |
| [`PAGE_BRIEFS.md`](PAGE_BRIEFS.md) | What each route is for and what it must say |
| [`DATA_MIGRATION.md`](DATA_MIGRATION.md) | How the current dataset was assembled |
| [`pipeline/README.md`](pipeline/README.md) | NAV pipeline internals |
| [`AGENTS.md`](AGENTS.md) | Next.js 16 notes for coding agents |
