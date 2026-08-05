# Page briefs — interior routes

**Read `DESIGN_CONTRACT.md` first.** This file adds only the per-page content. All real facts live here; nothing on these pages may be invented.

---

## Rules that apply to EVERY page

- **Architecture:** chrome (ticker, header, `<main>`, footer) lives in `app/layout.tsx`. A page returns sections only, opening with `<PageHeader>` from `@/components/PageHeader`. Export a `metadata` object.
- **URLs are fixed** — they match the old site exactly so inbound links survive. Do not rename routes.
- **Next.js 16:** dynamic route `params` is a **Promise** and must be awaited:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  ```
  Add `generateStaticParams` and `generateMetadata` on dynamic routes. Unknown param → `notFound()`.
- **`<em className="swap">` is forbidden on interior pages.** The serif-italic word appears exactly twice site-wide, both on the homepage.
- **Do not reuse `<ClosingCta />`** (it carries the swap). Write a plain CTA block: `bg-accent-wash`, hairline, `<Magnetic>` + `<Button href="/contact" variant="primary">`.
- No shadows or blur on content. The ONLY exception is the `.glass` / `.glass-primary` / `.glass-ghost` / `.glass-active` classes on buttons and pills.
- Radius: `rounded-full` = interactive, `0` = content. Form controls are the one exception (4–6px).
- Never `ring-*` — it compiles to `box-shadow`, which the global reset kills. Use `outline-*`.
- Tailwind arbitrary values must be written **literally**; Tailwind scans raw source text, so an interpolated class never generates.
- All figures use `.tabular` or `<Odometer>`.
- Contrast ≥ 4.5:1 body, ≥ 3:1 for text ≥24px.
- TypeScript strict, no `any`. `npx tsc --noEmit` and `npx eslint app` must pass.

### Data honesty (non-negotiable)
- Every number traces to `@/lib/data`. **5 of 13 strategies have no NAV** → `<PendingBadge />`, never a fabricated figure.
- **THE ₹948 TRAP:** `iti-equity` NAV is ~₹948 while every other fund is ~₹10. Never put absolute NAVs on a shared axis, bar width or comparative scale. Cross-fund comparison is via `changePct` only.
- **Debt is genuinely empty.** Say so; no placeholder cards.
- `<Odometer>` fires once and stops — a looping figure implies live data we do not claim.
- Springs are for objects; quantities get eased tweens.

### Compliance (every page)
SIF Insight is a **distributor**, not an adviser or AMC. Copy stays in "discover / learn / compare / consult". No advice, no guaranteed returns, no performance promises, no urgency. Any fund shown must carry risk band, exit load, expense ratio and minimum investment — that is material disclosure.

### THE AMC LOGO TRAP
The 8 PNGs in `/public/amc/` have **no alpha channel**. Each is a flat rectangle with a baked-in background, tones ranging from near-white (`edelweiss` ~239 luminance) to near-black (`iti` ~28). They **cannot** be flattened to one ink — `brightness-0` turns each into a solid black box. Render at native colour inside a **white tile with a hairline**, `object-contain` (aspect ratios vary 1.0 → 1.96). `grayscale` at rest → colour on hover is fine; grayscale preserves luminance.

---

## 1. `/what-is-sif` → `app/what-is-sif/page.tsx`

Header: eyebrow `The category`, lines `["Specialised Investment", "Funds, explained."]`.
Standfirst: A SEBI fund category introduced in 2025. SIFs sit between mutual funds and the PMS/AIF tier — hedge-fund-style flexibility inside a regulated pooled structure, from a ₹10 lakh minimum.
Meta: `SEBI circular, Feb 2025` · `{stats.strategyCount} schemes live` · `{stats.amcCount} asset managers`

**The definition** (real copy, light editing for flow only):
> Specialised Investment Funds are a new category of investment product introduced by SEBI in 2025, created to give Indian investors access to more sophisticated, flexible and diversified strategies than traditional mutual funds allow.
>
> Mutual funds invest in equity, debt or hybrid schemes under strict diversification limits. SIFs can operate with hedge-fund-style flexibility inside SEBI's framework — bridging the gap between mutual funds, which are too limited for advanced strategies, and PMS/AIF, which are too expensive and exclusive for most investors.

**Pull-quote** (treat like the one in `CategoryComparison`: left `<Rule vertical />` + `<LineReveal as="p">`):
> Think of SIFs as a regulated middle ground — advanced strategies, but with a lower ticket size than PMS and AIF.

**Four defining features** — `<TiltCard>` grid:
- **Minimum investment** — Investors need to commit at least ₹10 lakh. Figure: `<Odometer value={stats.minInvestment} prefix="₹" />`
- **Regulated by SEBI** — SIFs are tightly governed under SEBI's rules.
- **Investment flexibility** — SIFs can invest in a broad universe of assets.
- **Risk controls** — SIFs are allowed up to 25% unhedged short exposure. Figure: `<Odometer value={stats.maxUnhedgedShortPct} suffix="%" />`

**Then `<CategoryComparison />`** — import the existing section (the SIF vs MF vs PMS vs AIF table). It belongs here more than anywhere.

**Who should invest** — four points, hairline-separated, `<Group>`/`<GroupItem>`:
- For investors seeking growth with controlled volatility.
- For those investing ₹10 lakh or more with a long-term view.
- For anyone wanting tax-efficient, professional strategies.
- For investors looking for advanced long-short portfolio tools.

**Three strategy types** → `/strategies/equity` ({stats.equityCount}), `/strategies/hybrid` ({stats.hybridCount}), `/strategies/debt` (honest `<PendingBadge />` + "Launching soon").

**Then `<Faq />`** — import the existing section. Then the plain CTA.

Link the SEBI circular where the 2025 framework is cited:
`https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html`

---

## 2. `/strategies` + `/strategies/[category]`

### `app/strategies/page.tsx` — hub
Header: eyebrow `The funds`, lines `["Thirteen strategies.", "Eight houses."]`.
- Three category cards → equity / hybrid / debt, each with an `<Odometer>` count. Debt shows `<PendingBadge />` + "Launching soon".
- **Import and render `<StrategyGrid />`** — it already has filter pills, tilt cards, sparklines and all four disclosures. Do not rebuild it.
- **How to invest**, three steps: Assess your profile and goals → Compare schemes and disclosures → Consult us before committing.
- **Risk disclosure block — reproduce faithfully:**
  - **Market risk** — Equity markets can be volatile. Long-short strategies aim to reduce but cannot eliminate market risk entirely.
  - **Derivative risk** — Use of derivatives for hedging introduces counterparty risk and potential for amplified losses.
  - **Short selling risk** — Short positions have theoretically unlimited loss potential if the shorted stock rises significantly.
  - **Liquidity risk** — Some positions may be difficult to exit during market stress, affecting fund performance.
- Footnote: `Risk bands are indicative and may vary with market conditions and portfolio composition. Consult your financial adviser before investing.`

### `app/strategies/[category]/page.tsx`
Valid: `equity` (7), `hybrid` (6), `debt` (0). Anything else → `notFound()`.
- **equity** — all 7 are `Long-Short Equity`, every one Risk Band 5, min ₹10,00,000, expense 2.25%, daily redemption. Benchmarks are NIFTY 500 TRI variants except `iti-equity` (NIFTY 50 TRI).
- **hybrid** — all 6 are `Multi-Asset Long-Short`. **Risk bands genuinely vary and that is the interesting part:** `edelweiss-hybrid` and `sbi-hybrid` are Band 1, `bandhan-hybrid` is Band 2, the rest Band 5. Redemption ranges from twice-weekly to monthly. Surface the variation; don't flatten it.
- **debt** — genuinely empty. `No debt SIF has launched yet.` Explain SEBI's framework permits the category and we will track schemes as they are filed. No fake cards.

Each category page shows a **full detail card per strategy** — `overview` plus ALL of `minInvestment`, `expenseRatio`, `exitLoad`, `riskBand` (via `<RiskBand>`), `benchmark`, `redemptionFrequency`, `taxation`, `dividend`, `amfiSchemeCode`. NAV via `getNav(id)`. Plus the same four risk callouts.

---

## 3. `/sif-tracker` + `/nav-tracker`

### `app/sif-tracker/page.tsx` — filterable comparison (`"use client"`)
Header: eyebrow `Compare`, lines `["Every SIF scheme,", "side by side."]`.
Filters as glass pills (`glass glass-ghost` / `glass glass-active`): AMC (8), Category, Risk band (1–5 via `riskBandNumber`), Expense bucket (low <1.5% / medium 1.5–2.5% / high >2.5%), Exit load (none / has), Redemption frequency (**derive distinct values from the data, do not hardcode**), plus **Clear all** and a live result count.

Real semantic `<table>`, `<th scope="col">`, hairline separators, **no zebra striping**, hover `bg-surface-2`. Columns: checkbox · AMC (`sifName` + `name`) · Strategy · Category · NAV · Day · Risk · Benchmark · Exit load · Expense · Redemption · Taxation. Wrap in `overflow-x-auto` with `tabIndex={0}` + `aria-label`.

**Compare selected (n)** → modal, property-by-property. Accessible: focus trap, Escape, backdrop click, `aria-modal`, focus restored on close. Enter 0.22s / **exit 0.15s**.

Mobile: stacked cards from the SAME filtered array (`hidden md:block` / `md:hidden`).

### `app/nav-tracker/page.tsx` (`"use client"` for the selector)
Header: eyebrow `Live NAV`, lines `["Net asset value,", "as filed."]`, meta `Source: AMFI` · `Updated {formatUpdated(navLastUpdated)}` · `{stats.liveNavCount} of {stats.strategyCount} live`.
- Fund selector over the 13 strategies.
- Selected fund detail: name, AMC, type, benchmark, large `<Odometer decimals={4} prefix="₹" />`, previous close, `<Delta size="lg" />`, risk band, full disclosures.
- **The chart: exactly TWO real observations exist per fund** (`yesterday`, `today`). Draw exactly two points with `<DrawnPath>` + `<DrawnDot>`, labelled `Previous close → Today`. **Do NOT invent a 7/30-day series and do NOT add a day-range selector that cannot be honoured** — the old site had one that was inert for every live fund. State plainly that two observations are available.
- Pending fund → `<PendingBadge />`, no chart, copy: `This scheme has not launched. NAV will appear once the AMC files it with AMFI.`
- **Import and render `<NavBoard />`** beneath rather than rebuilding it.
- Required: `NAV data fetched from AMFI. Updated daily.`

---

## 4. `/amc` + `/amc/[id]`

### `app/amc/page.tsx`
Header: eyebrow `Asset managers`, lines `["Eight houses.", "Thirteen schemes."]`.
Grid of the 8 AMCs → `<TiltCard>` linking to `/amc/{id}`: logo in a white tile (see LOGO TRAP), `sifName` prominent, `name` beneath, `description`, an `<Odometer>` strategy count, equity/hybrid split, and how many have a live NAV vs await launch. **ICICI and The Wealth Company have schemes with no NAV — be honest.**

SIF sub-brands: quant→QSIF · sbi→Magnum SIF · edelweiss→Altiva SIF · tata→Titanium SIF · iti→Diviniti SIF · icici→iSIF · bandhan→Arudha SIF · wealth→WSIF.

### `app/amc/[id]/page.tsx`
Header: `sifName` as title, `name` in the eyebrow, `aside` carrying the logo tile.
- The AMC's `description`.
- Every strategy it offers as a full detail card with ALL disclosure fields (as in §2).
- A summary strip: scheme count, categories, risk band range, live-NAV count — all counted, never asserted.
- Prev/next AMC navigation and a link back to `/amc`.
- Never imply AMC endorsement. We track and cover; we do not represent them.

---

## 5. `/about`, `/media`, `/downloads`

### `app/about/page.tsx`
**The old About copy is unusable — its "Vision / Mission / Goal" text was generic social-network boilerplate ("connect with others who share their interests and passions", "real-time chat"). Discard it entirely.** Write fresh copy from these facts only:
- **Company:** SIF Insight, operated by **Platizio Services LLP**, a certified distributor of Mutual Funds and SIFs. Not an AMC, not an investment adviser. Positioning: India's independent record of the SIF market.
- **Founder:** **Vividh Chaturvedi**, Founder & CEO. Certified Financial Planner (CFP®) and MBA. Over 25 years across financial services and international business. Deep knowledge of Indian markets — equities, bonds, commodities. Active interest in equity derivatives and algorithmic trading. Photo `/founder.jpg` via `next/image` with explicit dimensions inside a `<Wipe>`, `alt="Vividh Chaturvedi, Founder and CEO of SIF Insight"`.
- **What we do:** track all {stats.strategyCount} schemes across {stats.amcCount} AMCs; publish NAVs sourced from AMFI; surface the disclosures that matter; help investors shortlist schemes that fit their profile.
- Numbers strip via `<Odometer>`: AMCs · schemes · minimum · max unhedged short %.

Invent nothing else — no awards, client counts, AUM, testimonials, team members or offices.

### `app/media/page.tsx`
**Five real videos, in order:**
| id | title |
|---|---|
| `UVpPGY8GuPQ` | SIF vs Mutual Funds Strategies |
| `Y6wZcsjc17s` | Investment Insight & SIF Basics |
| `OfF8djLO9Rg` | SIF Market Analysis |
| `Ea2M4Ds7zmk` | Minimum Investment in SIFs Explained |
| `HQ4N1ZuZLNM` | Expert Investment Tips for SIFs |

**A sixth id in the old site, `dQw4w9WgXcQ` ("Understanding SIF Returns"), is the Rickroll video. It is placeholder junk. Do NOT include it.**

Thumbnails: `https://img.youtube.com/vi/{id}/maxresdefault.jpg`. Use a plain `<img loading="lazy">` with explicit width/height rather than `next/image`, to avoid editing the shared `next.config.ts` for a remote host. Channel: `https://www.youtube.com/@sifinsight`.

**Two real blog posts (external):**
- *What are Specialized Investment Funds (SIFs)? A Beginner's Guide* — 2025-01-15, 5 min read, "SIF Basics". Excerpt: Learn everything you need to know about SIFs, India's newest SEBI-regulated investment category. Understand the basics, benefits, and how they differ from traditional mutual funds. → `https://sifinsight.com/blogs-1/f/what-are-specialized-investment-funds-sifs-a-beginner%E2%80%99s-guide`
- *Minimum Investment in SIFs: What Does ₹10 Lakh Get You?* — 2025-01-10, 4 min read, "Investment Guide". Excerpt: Understanding the value proposition of the Rs 10 lakh minimum investment in Specialised Investment Funds. Discover what returns and benefits you can expect. → `https://sifinsight.com/blogs-1/f/minimum-investment-in-sifs-what-does-%E2%82%B910-lakh-get-you`

External links: `target="_blank" rel="noopener noreferrer"` + sr-only "(opens in a new tab)". **No newsletter form** — the old one had no handler; point to `/contact`.

### `app/downloads/page.tsx`
Download URL = `https://drive.google.com/uc?export=download&id={fileId}`.

**Factsheets** — "Download the latest factsheets for SIF schemes"
| Name | fileId | Size | Date |
|---|---|---|---|
| All Magnum SIF Schemes Factsheet - October 2025 | `1SBCoU1X22jwTycBR09qZbgnf43ITYcS9` | 3.5 MB | Nov 17, 2025 |
| Altiva Hybrid Long-Short Fund Portfolio Update - Oct 2025 | `1iA6l7o_eh-prZ_LoVkZ6f5GFZZH-3hYD` | 2.8 MB | Nov 17, 2025 |

**Presentations (PPTs)** — "Download presentations and decks about SIFs"
| Name | fileId | Size | Date |
|---|---|---|---|
| An introduction to Specialized Investment Fund (SIF) | `1UiteJ9ZnmQVIpRciXsqaF1AaVJyPjJ7K` | 236 KB | Nov 26, 2025 |
| Presentation of Magnum Hybrid Long Short Fund - Office Print | `1CYXnN7_CktzkKN6IWAhh_VjKgvTmM3dV` | 3.2 MB | Dec 3, 2025 |
| QSIF Deck | `1eMR3iRhwCtIkT2PkZxjj9_lBLlNiru94` | 12.4 MB | Nov 26, 2025 |
| Titanium Hybrid Long Short Fund - SIF - Final | `1t9GVXawJRbdmCDHJxfXY5oZsonoakBPI` | 6.6 MB | Nov 26, 2025 |

Two hairline-separated groups. Sizes and dates as supplied — do not round or restate. Note these are third-party AMC documents that open from Google Drive.

---

## 6. `/contact` → `app/contact/page.tsx`, `ContactForm.tsx`, `actions.ts`

**Context:** the old form had no action and no handler — it submitted nowhere. Its consent line claimed "you agree to our privacy policy" while the footer's Privacy link pointed at `#` and no such page existed. For a financial-services lead form that is a real compliance gap.

**Client decision:** build the full form now, wired to a Server Action that is explicitly unconfigured, and document the integration point.

### `actions.ts`
`"use server"`. Export an async action shaped for `useActionState` (`prevState, formData`). **Validate on the server** — name, email format, Indian phone (tolerant of spaces/`+91`), investment range must be one of the allowed values, message optional with a length cap. Return field-level errors. Then read an env var (e.g. `CONTACT_EMAIL_PROVIDER_KEY`); if absent return an honest `{ status: "unconfigured" }` result — never fake success, never throw unhandled. Leave a clearly-marked `TODO` for the provider call naming the env var. **Do not add dependencies** (`resend`/`nodemailer` are not installed here). Never log the submitted personal data.

### `ContactForm.tsx`
`"use client"`, `useActionState` + `useFormStatus` (verify the Next 16 / React 19 API in `node_modules/next/dist/docs/`).
Fields: Name · Email · Phone · Investment range (**₹10–25 L**, **₹25–50 L**, **₹50 L–1 Cr**, **₹1 Cr+**) · Message.
Real `<label>` on every input (never a placeholder standing in for one). Errors tied via `aria-describedby` + `aria-invalid`. Result in an `aria-live="polite"` region. Pending state from `useFormStatus`. Focus ring via `outline`. Submit button uses `.glass glass-primary`.

### `page.tsx`
Header: eyebrow `Contact`, lines `["Tell us your goals.", "We will map the funds."]`. Two-column, form left, details right.
**Right column — real details, prominent, because they work even when the form cannot:**
- `info@sifinsight.com` (`mailto:`)
- **+91 92055 23100** (`tel:+919205523100`)
- WhatsApp `https://wa.me/919205523100?text=` with prefill `Hello, I would like to know more about SIF Insight.`
- "Powered by Platizio Services LLP — a certified distributor of Mutual Funds and SIFs."

**Consent line:** do NOT claim a privacy policy that does not exist. State truthfully that details are used only to respond to the enquiry, and leave a visible code comment flagging that a published privacy policy is required before this form collects data in production.

The old site had a "Calendly calendar will be embedded here" placeholder — do not ship a placeholder. Omit scheduling or leave a commented integration point.
