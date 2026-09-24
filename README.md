# SIF Insight

India's public record of the Specialised Investment Fund market — every SIF
scheme AMFI publishes, with its NAV history and the terms read out of its own
scheme information document.

Operated by Platizio Services LLP, a distributor of Mutual Funds and SIFs. The
site is editorial and informational: it is not an AMC, not an investment
adviser, and nothing it renders is advice.

Production: <https://www.sifinsight.com> — the apex redirects here, so `www`
is the canonical host and the one four `ORIGIN` constants must name.

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
Motion · Lenis

Every route is statically rendered. There is no runtime data fetch, no API
route, no database and no backend — see the pipeline section below for why.

---

## Layout

```
app/                 Routes (see the route map below).
components/
  sections/          Home sections + global chrome (SiteHeader, SiteFooter…)
  tracker/ screener/ compare/ sif/ learn/ legal/ leads/   Per-page parts
  ui/                Dialog, DisclosureNav, Segmented, Chip, HBar, NotCaptured…
  motion/            Reveal primitives — the site's whole motion vocabulary
  primitives.tsx     Shell, Section, Card, Eyebrow, RiskBand, Button, ActionButton
lib/
  data/              THE data layer (index.ts is a barrel): returns, costs, AUM,
                     NFOs, taxonomy, and buildSifRows() — one serialisable row per
                     scheme that the Tracker, Screener, Compare and SIF pages share.
  data/raw/*.json    Source JSON. Machine-written and hand-researched.
  screener/          The metric registry: every live metric is a filter, a sort
                     key and a column; plus the URL codec.
  site.ts nav.ts     Contact details, ARN, socials; the navigation tree.
  compliance.ts      Disclaimer text, past-performance note, banned copy.
  leads/             Popup + consultation server actions, Resend delivery.
  content/           Videos, expert conversations, articles (editorial).
pipeline/            Python. Nightly AMFI NAV fetch (see below).
scripts/             verify-static-html.mjs — post-build HTML checks (CI).
tests/               Vitest — data integrity, returns reference, codecs, leads.
```

### Route map

| Route | What it is |
|---|---|
| `/` | Brand hero → SIFs We Offer → What is a SIF / Why SIF → Video Library → Why SIF Insight → consultation CTA; 15 s lead popup |
| `/sif-tracker` | Market snapshot, Live/Upcoming NFOs, Top 5, performance heatmap, AUM by strategy/AMC, latest NAVs |
| `/sif-screener` | Search, quick + advanced filters, chips, customisable columns, 2-key sort, select ≤4 → Compare (state in the URL) |
| `/compare?ids=SIF-3,…` | Side-by-side for up to 4 SIFs (dynamic; works with JS off) |
| `/sif/[id]` | Individual SIF page (33 static pages) |
| `/amc`, `/amc/[id]` | AMC directory and house pages |
| `/learn`, `/learn/articles/[slug]` | Videos, expert conversations, articles, FAQs |
| `/what-is-sif`, `/strategies/**`, `/downloads` | Learn sub-pages |
| `/about`, `/contact` | About Us; Book a Consultation |
| `/terms`, `/disclaimer`, `/regulatory-disclosures`, `/privacy`, `/methodology` | Legal and methodology |
| `/nav-tracker`, `/media` | 308 redirects (see `next.config.ts`) |

### `lib/data/raw/`

| File | Written by | Holds |
|---|---|---|
| `schemes.json` | Pipeline (NAV) + hand (identity) | The 33 schemes, the 17 AMCs, today's NAV, `navAsOf` |
| `nav-history.json` | Pipeline | Every published NAV per scheme, back to each scheme's first |
| `disclosures.json` | Hand research | Scheme terms, **keyed by AMFI scheme code** |
| `faqs.json` | Hand | FAQ accordion content |
| `nfo-news.json` | Hand research | NFO windows (`opensOn`/`closesOn`) and announced SIFs; status is derived |
| `scheme-facts.json` | Hand research | Allotment, face value, managers, objective, terms — every value a cited `Fact` |
| `aum.json` | Hand research | Month-end scheme AUM, ₹ crore; AMC/industry/strategy totals are derived |
| `ter.json` | Hand research | Charged total TER + base expense ratio (Regular plan), dated |
| `documents.json` | Hand research | ISID/KIM/factsheet/portfolio links with date and publisher |

**Research data goes stale.** AUM and TER are point-in-time. Refresh monthly
(after AMC factsheets publish, around the 10th): add the new month to
`aum.json` and the new row to `ter.json`, cite a source in each file's
`sources`, and set `verified: true` only after reading the document. The site
always prints the as-of date, so stale data is visible, never silent.

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
  → python pipeline/fetch_nav.py    # fetch → validate 33 codes → upsert → export
  → npx tsc --noEmit                # the data must typecheck before it lands
  → git commit + push               # the host rebuilds and redeploys
```

23:30 IST because AMCs file SIF NAV on the AMFI portal by 23:00 IST on each
business day; running earlier risks capturing the previous day's values.

**The job fails loudly.** If AMFI's format drifts or any of the 33 scheme codes
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
| `RESEND_API_KEY` | For lead delivery | Resend API key |
| `LEAD_FROM_EMAIL` | For lead delivery | Sender on a Resend-verified domain, e.g. `SIF Insight <leads@sifinsight.com>` |
| `LEAD_TO_EMAIL` | No | Recipient; defaults to `sifinsights@gmail.com` (`SITE.email`) |

Server-only — **no `NEXT_PUBLIC_` prefix**, or the key ships to the browser.
Set it in `.env.local` for development and in the host's environment for
production. Never commit it.

Set them in `.env.local` from `.env.example`. Without them the popup and
consultation forms still validate fully and then say, honestly, that the
details were not sent — offering call, WhatsApp and email instead. They never
claim a success they cannot prove ([`lib/leads/deliver.ts`](lib/leads/deliver.ts)).

---

## Known gaps

Tracked deliberately and visible in the UI rather than papered over:

- **Lead delivery** needs the Resend variables above.
- **Legal pages are drafts** (`/terms`, `/disclaimer`, `/regulatory-disclosures`,
  `/privacy`) pending compliance approval, as are the footer disclaimer and the
  hero trust line.
- **Articles** — the old site's posts were archived nowhere; `/learn` says so
  until the client supplies the text.
- **Debt strategies** — the category is genuinely empty. `/strategies/debt`
  says so; there is no "coming soon" grid.
- **Disclosure coverage** — all 33 schemes have a document behind them, but
  some documents do not state every field. Those render "Not captured". The
  counts on the site are derived, so they correct themselves as gaps close.
- **Three cost figures, never interchangeable**: the ISID cap (on the *base*
  expense ratio since April 2026), the base expense ratio charged, and the
  total TER (base + brokerage + transaction costs + statutory levies).
- **Not yet calculated**: benchmark returns, alpha, beta, Sharpe, AUM growth and
  portfolio exposure — listed on `/methodology`, never shown as empty columns.

---

## Docs

| File | What it covers |
|---|---|
| [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) | Type scale, colour, motion, and the data-honesty rules. Binding. |
| [`PAGE_BRIEFS.md`](PAGE_BRIEFS.md) | What each route is for and what it must say |
| [`DATA_MIGRATION.md`](DATA_MIGRATION.md) | How the current dataset was assembled |
| [`pipeline/README.md`](pipeline/README.md) | NAV pipeline internals |
| [`AGENTS.md`](AGENTS.md) | Next.js 16 notes for coding agents |
