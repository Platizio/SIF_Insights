# Wave content (2E Learn + 2F About/Legal/Methodology) — amendments

- **Legal layout (`components/legal/LegalDocument.tsx`)**: /terms, /disclaimer, /regulatory-disclosures and /methodology share one layout — numbered clauses at 68ch, a sticky anchor TOC on `lg+` (static above the clauses on mobile), "Last updated" under the TOC (`LEGAL_UPDATED`, 2026-09-23). Clause `aliases` give extra anchor ids (e.g. `#drawdown` → `#max-drawdown`, `#planned` → `#not-yet-calculated`).
- **/methodology anchors**: every `methodology` anchor in `lib/screener/fields.ts` resolves (`#sources #face-value #returns #monthly-returns #inception #volatility #max-drawdown #risk-band #benchmarks #aum #ter #exit-load #liquidity #heatmap #missing-values #not-yet-calculated`) plus aliases `#drawdown #planned #one-day-change`.
- **Heatmap bounds are restated on /methodology** (0.25/1/2.5 and 1/3/7). Request: F1 exports the bounds from `lib/format.ts` so the page reads them.
- **/about Vision & Mission**: the section label (eyebrow style) is the `h2`; the statement is set at 22–28px. Icon cards use a square hairline chip (not `rounded-full`, since it is not interactive).
- **/about #connect** is a ConsultCta-shaped panel with three actions (Book a Consultation / WhatsApp Us / Email Us); the two off-site actions are `<a>` pills with the same glass classes as `<Button>`.
- **/learn**: the Learn sub-nav is read from `PRIMARY_NAV` so it cannot drift from the header dropdown. Every hub section (`#videos #experts #articles #faqs`) always renders; empty states are one line plus a real link.
- **Faq** takes props (`items, id, eyebrow, lines, intro, cta`); defaults keep the home page unchanged; CTA default is `/contact` (was `#consult`).
