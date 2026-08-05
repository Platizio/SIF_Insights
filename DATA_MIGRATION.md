# Data migration — AMFI live feed, 30 schemes

The data layer was rebuilt from AMFI's live SIF NAV feed. `lib/data/index.ts`
and `components/primitives.tsx` are already migrated. This file is the brief
for updating everything that consumes them.

**Read `DESIGN_CONTRACT.md` first** — all its rules still apply.

> ### ⚠️ REVISION 2 — NAV history now exists. Read before trusting this file.
>
> This document was written when we held **one observation per scheme**. We now
> hold **2,644 published NAVs across all 30**, backfilled from AMFI's historical
> NAV export and appended daily by `pipeline/`. Three statements below are
> therefore **superseded**:
>
> | Was | Now |
> |---|---|
> | "`nav.changePct` is `null` for every scheme" | **Real** for all 30. Still `null` for a scheme holding a single NAV. |
> | "`nav.yesterday` is GONE… no history feed" | A full dated series exists — `navHistory(id)` returns it. |
> | "drop comparative NAV visuals entirely" | A **per-scheme** line chart is correct and shipped (`<NavSeriesChart>`). |
>
> **What has NOT changed — the face-value trap is still absolute.** SIF-21
> (~₹943) and SIF-96 (~₹1,022) sit against ~₹10 for the other 28. Never put
> absolute NAVs on a shared axis, bar width or comparative scale. Each chart
> plots ONE scheme against its OWN axis. Percentage change *is* comparable
> across schemes, and is the only cross-scheme basis you may use.
>
> `changePct` is the move since the scheme's **previous published** NAV, which
> is not always yesterday — weekends and non-dealing days are absent from the
> series. `nav.previous` carries that date; state it rather than saying "today".
>
> New API: `navHistory(id)` · `nav.previous` · `nav.observations` ·
> `stats.navObservations` · `stats.chartableCount` · `stats.navHistoryFrom`.

---

## What changed

| Before | Now |
|---|---|
| 13 schemes | **30 schemes** |
| 8 AMCs | **17 AMCs** |
| 2 mandates | **5 mandates** |
| 5 schemes pending | **0 pending — every scheme has a live NAV** |
| NAV `{today, yesterday}` + day change | **one observation per scheme, no day change** |
| All disclosure fields present | **Only 13 of 30 have them** |

Source: `https://portal.amfiindia.com/spages/SIF_NAVAll.txt`, NAVs as at **2026-07-30**.

### The five mandates (`strategy.type`)
`Equity Long-Short` (10) · `Hybrid Long-Short` (13) · `Equity Ex-Top 100 Long-Short` (5) · `Sector Rotation Long-Short` (1) · `Active Asset Allocator Long-Short` (1)

`category` is still `"equity" | "hybrid" | "debt"` — 16 equity, 14 hybrid, 0 debt.
Sector Rotation sits under equity; Active Asset Allocator under hybrid.

---

## API changes

```ts
type NavQuote =
  | { status: "live"; today: number; asOf: string; changePct: number | null }
  | { status: "pending" };
```

- **`nav.yesterday` is GONE.** AMFI publishes one snapshot a day and exposes no
  SIF history feed, so we hold a single observation per scheme.
- **`nav.changePct` is `null` for every scheme.** Null, not `0` — zero would
  claim the fund was unchanged, which we do not know.
- **`nav.asOf`** is the observation date (ISO). Show it wherever a NAV appears.
- **`liveQuotesByMove()` is GONE** → use **`liveQuotes()`** (ordered by scheme
  name; there is no move to rank by, and ranking by NAV size would be wrong —
  the ₹930 and ₹1,004 schemes are priced off a different face value, not
  performing a hundred times better).

### Nullable `Strategy` fields
`overview`, `minInvestment`, `expenseRatio`, `exitLoad`, `riskBand`,
`benchmark`, `redemptionFrequency`, `taxation`, `dividend` are all
`… | null`. New: `isin: string | null`, **`disclosuresCaptured: boolean`**.

`riskBandNumber(riskBand: string | null): number | null`.

`amc.logo` is `string | null` — only the original 8 houses have a mark.

### Primitives already handle the null cases — do not re-implement
- **`<Delta pct={nav.changePct} />`** accepts `null` and renders "No prior close".
  Keep passing it; do not guard at the call site.
- **`<RiskBand band={riskBandNumber(s.riskBand)} />`** accepts `null` and renders
  "Not captured".

### New exports
`liveQuotes()` · `mandates` (`{type, count}[]`, commonest first) · `navSource` ·
`stats.disclosedCount` (13) · `stats.mandateCount` (5).

---

## How to render a scheme without disclosures

17 of 30 have `disclosuresCaptured: false`. They have a real name, NAV, ISIN,
category and mandate — and nothing else.

**Never invent a value, never leave a blank, never fall back to a default.**
Render the field as explicitly not captured:

```
Minimum    —  Not captured
Expense    —  Not captured
Exit load  —  Not captured
Risk band  —  Not captured
```

Give the card a short note: *Disclosures for this scheme are not yet captured —
see the scheme information document.* The `disclosuresCaptured` flag is there so
you can say it once at card level rather than five times.

Where a page filters or sorts on a nullable field, schemes without it must not
silently vanish — either exclude them from that control with a stated count, or
sort them last. Say which you did in the UI.

---

## Copy that is now factually wrong

Hardcoded counts must change. **13 → 30 schemes, 8 → 17 houses.**

| Where | Was | Should read |
|---|---|---|
| `/strategies` PageHeader | "Thirteen strategies." / "Eight houses." | "Thirty schemes." / "Seventeen houses." |
| `/amc` PageHeader | "Eight houses." / "Thirteen schemes." | "Seventeen houses." / "Thirty schemes." |

Prefer interpolating `stats.*` over writing a number wherever the layout allows
it. Headline `lines` are hand-split so they stay literal — just make them true.

**Every "awaiting launch" / "not launched yet" state for a *scheme* is now
stale** — all 30 have a NAV. Debt is still genuinely empty (0 schemes), so the
debt category's empty state stays.

---

## Compliance unchanged

Distributor register, no advice, no performance promises. Every NAV shown needs
its source and as-of date: *NAV data fetched from AMFI. Updated daily.* plus
`formatUpdated(navLastUpdated)`.

**The face-value trap is now worse.** `iti-equity` (SIF-21) is ₹930.15 and
`franklin-*` (SIF-96) is ₹1,004.92, against ~₹10 for the other 28. Never put
absolute NAVs on a shared axis, bar width or comparative scale — and with
`changePct` null there is no percentage fallback either, so **drop comparative
NAV visuals entirely** rather than inventing a basis for them.
