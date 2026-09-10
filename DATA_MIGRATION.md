# Data migration — a record

**This is a historical record, not a task list.** It describes how the current
dataset was assembled and what changed along the way, so that the reasoning
survives. The migration itself is **complete**: every consumer named below was
updated, and every count it once quoted now derives from `stats.*`.

**It is not a description of current state.** For that, read
[`lib/data/index.ts`](lib/data/index.ts) — the types are the contract, the
comments carry the reasoning, and `stats` is the single place counts are
derived. For the pipeline that keeps it fed, read
[`pipeline/README.md`](pipeline/README.md). For the rules that bind new work,
read [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md).

> **Why no figures appear below.**
> Earlier revisions of this file quoted the NAV count, the file's as-of date and
> two schemes' NAVs. A nightly cron rewrites all four **every weekday**, so each
> was wrong within a day of being typed and stayed wrong. Correcting them to
> today's values would only restart that clock. **Interpolate `stats.*`; never
> restate a number in prose.** Where a count genuinely must appear as a word
> (a hand-split headline), annotate it with the stat it has to track — see
> `app/strategies/page.tsx` and `app/amc/page.tsx` for the pattern.

---

## What the migration changed

The data layer was rebuilt from AMFI's live SIF NAV feed
(`portal.amfiindia.com/spages/SIF_NAVAll.txt`).

| Before | After |
|---|---|
| 13 schemes | **30 schemes** |
| 8 AMCs | **17 AMCs** |
| 2 mandates | **5 mandates** |
| 5 schemes pending | **0 pending — every scheme in the feed carries a NAV** |
| NAV `{today, yesterday}` + day change | A **dated series** per scheme, backfilled from AMFI's historical export and appended daily |
| Disclosures assumed present | Disclosures **researched per scheme**, absent ones rendered as "Not captured" |

Scheme and AMC counts are structural and stable; they change only when a house
files. Everything else is `stats.*`.

### The five mandates (`strategy.type`)

`Equity Long-Short` · `Hybrid Long-Short` · `Equity Ex-Top 100 Long-Short` ·
`Sector Rotation Long-Short` · `Active Asset Allocator Long-Short`

At assembly these ran 10 / 13 / 5 / 1 / 1. **Read `mandates` for live counts** —
it is derived, ordered commonest-first, and cannot drift.

`category` is `"equity" | "hybrid" | "debt"` — 16 equity, 14 hybrid, 0 debt at
assembly. Sector Rotation sits under equity; Active Asset Allocator under hybrid.

---

## The API changes, and why

The current shape is in `lib/data/index.ts`; this records only what moved and
what the move was for.

- **`nav.yesterday` became a real series.** The first cut held a single
  observation per scheme, because AMFI's daily snapshot exposes no history. The
  history came later, from AMFI's per-scheme Excel export, and `navHistory(id)`
  now returns every published NAV for a scheme, oldest first.
- **`changePct` measures against the previous PUBLISHED close**, not against
  yesterday — weekends and non-dealing days are simply absent from the series.
  `nav.previous` carries that date, and the UI must state it rather than
  implying "today". It is `null`, never `0`, when only one observation exists:
  zero would claim the fund was unchanged, which we would not know.
- **`liveQuotesByMove()` was removed** in favour of `liveQuotes()`, ordered by
  scheme name. Ranking by NAV *size* would have been wrong, and at the time
  there was no move to rank by. A percentage move **is** comparable across
  schemes now, so ranking by `changePct` is defensible where a page wants a
  league table — but that stays the caller's explicit decision, not a default
  inherited from this function.
- **Comparative NAV visuals were dropped, then partly restored.** The original
  instruction — drop them entirely — was correct while `changePct` was null
  everywhere. With a real series, a **per-scheme** line chart is right and
  shipped: `<NavSeriesChart>`, one scheme per chart, against its own axis.
  The cross-scheme prohibition below is unchanged.
- **`Strategy` fields became nullable** (`overview`, `minInvestment`,
  `expenseRatio`, `exitLoad`, `riskBand`, `benchmark`, `redemptionFrequency`,
  `taxation`, `dividend`), and `isin` and `disclosuresCaptured` were added.
  `disclosuresCaptured` is **derived** from whether a `disclosures.json` entry
  exists rather than stored as a flag, so it cannot disagree with the data it
  describes. `expenseRatioIsCap` and `disclosuresVerified` were added later, for
  the same reason: a qualifier that travels with the number it qualifies.
- **`amc.logo` is `string | null`.** Every house in the feed has a mark today,
  so the null branch is currently unreached — it stays for the next house
  arriving from AMFI without artwork, which `<AmcMark>` renders as a text
  lockup in identical tile geometry.
- **`overview` moved out of the data and into a derived mandate description.**
  Stored per scheme it was null for most and near-verbatim repetition for the
  rest — four schemes on one mandate carried the same sentence word for word.
  It is now written once per mandate in `MANDATE_OVERVIEW`, grounded in SEBI's
  SIF framework rather than any one AMC's prose.

---

## Standing rules the migration established

These are not migration steps. They bind all new work.

### Never invent a value for an absent field

Where a scheme's information document does not state a field, the field is
`null` and the UI renders **"Not captured"** — visibly, in place, rather than as
a blank cell, a dash, or a plausible-looking default.

Every scheme currently has a researched document behind it, so this branch is
rarely reached today. **It is not dead code.** It is what stops the next scheme
arriving from the feed with nothing behind it from being papered over, and the
primitives already implement it:

- **`<Delta pct={nav.changePct} />`** accepts `null` and renders "No prior
  close". Keep passing it; do not guard at the call site.
- **`<RiskBand band={riskBandNumber(s.riskBand)} />`** accepts `null` and renders
  "Not captured".

Where a page filters or sorts on a nullable field, schemes without it must not
silently vanish — either exclude them from that control with a stated count, or
sort them last. Say which you did in the UI.

### Count the relationship, not the population

`disclosuresCaptured` says only that a document was **read**. A scheme can have
an entry and still leave a field null, so copy that names specific fields must
use `fullyDisclosedCount`, not `disclosedCount`. `hasFullDisclosures()` is what
separates them.

The tests make the same point deliberately: `tests/disclosures.test.ts` asserts
the **relationship** — a null headline field means the scheme is outside
`fullyDisclosedCount` — over whatever the data holds today, plus a synthetic
hole so the false branch is exercised even at full coverage. It does **not**
pin a count, because pinning one made *closing* a gap fail the suite. Write
docs and tests the same way.

### The face-value trap is absolute

A small number of schemes are priced off a ~₹1,000 face value while the rest sit
near ₹10. That is a different unit, not a hundredfold better performance.

**Never put absolute NAVs on a shared axis, bar width or comparative scale.**
Each chart plots ONE scheme against its OWN axis and states its own min/max.
**Percentage change is the only cross-scheme basis you may use.** Which schemes
they are, and what they are worth, is in the data — do not hardcode either.

### Prefer `stats.*` to a literal

Hardcoded counts rot silently. Interpolating a derived stat corrects itself as
data lands, and `tests/stats.test.ts` recomputes every one of them from the raw
JSON so a broken derivation fails the suite rather than shipping a false claim.

Better still, interpolate a **condition** rather than a number where the copy
allows it — `stats.disclosedCount === stats.strategyCount` picks between two
sentences on `/strategies` and needs no maintenance either way.

**Every "awaiting launch" / "not launched yet" state for a *scheme* is stale** —
`<PendingBadge>` now says "No NAV filed", which states the observation rather
than guessing the cause. Debt is still genuinely empty, so the debt category's
empty state stays.

### Compliance

Distributor register, no advice, no performance promises.

**Never claim a refresh cadence.** "Updated daily" was removed site-wide: it
shipped beside a NAV file that was already five days old, and nothing in the
pipeline guarantees a daily refresh. Every NAV surface pairs *"NAV data fetched
from AMFI"* with a **dated** clause — `formatUpdated(navLastUpdated)` — and the
source. See DESIGN_CONTRACT §5.

**`navSource` is a human label, not a URL.** Link with `navSourceUrl`.
