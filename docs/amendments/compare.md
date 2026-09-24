# Wave 2C-2 (Compare) — amendments

For the integrator to fold into `DESIGN_CONTRACT.md` / the shared spec.

## Design contract

- **Compare chart reveal is a left-to-right clip, not `<DrawnPath>`.** DrawnPath
  animates `stroke-dasharray`, which erases the per-series dash patterns the
  chart needs so no series depends on colour alone. The clip is a hand-rolled
  reveal (`data-reveal` + `useRevealed(ref, ENTER.chart)`, animating
  `clip-path`), so both safety nets open it. The dashed paths carry no
  `data-reveal`, so the nets' `stroke-dasharray: none` never flattens them.
- **One `<Section>` for the whole comparison.** The twelve PRD blocks are
  `<section>`s inside one `<Section id="comparison">`, separated by a drawn
  `<Rule>` and `pt-20`, not twelve `py-[100px]` Sections (≈2,400px of air
  between tables).
- **Series styling:** `components/compare/series.tsx` — series 1–4 =
  `--color-series-1..4` + solid / dashed / dotted / dash-dot. The same swatch
  heads the SIF's column in every table.
- **Section headings use the PRD's words verbatim** ("Strategy & Investment
  Approach", "Fund Size & Management", "Key Terms", …).

## Data / compliance

- **Markers.** "Highest … / Lowest … among selected" follow the registry's
  `compare.note` (returns, volatility, AUM, TER). Two refinements:
  - *Since first NAV:* no marker unless every selected SIF's SI starts on the
    same date. A one-day-old SIF and a year-old one are not like for like.
  - *Maximum drawdown:* marked "Lowest drawdown among selected" by the SIZE of
    the fall (`Math.abs`). The registry `mdd` has no `note`. See the requested
    change below.
- **Rebased chart window** (`components/compare/rebase.ts`) restates the
  trailing-return rules because a client file may not import `lib/data`:
  - start = calendar offset from the latest NAV among the selected SIFs;
  - a SIF enters only with a NAV on or before the start, at most 7 days
    earlier (`maxStartGapDays`); otherwise it is listed as left out;
  - SI starts at the latest first NAV;
  - a window needs 2 SIFs;
  - the default is SI, unless SI spans fewer than 28 days. Then the default
    is the longest shared window.
- **Permitted derivative exposure:** no per-scheme field exists, so the row
  prints "Not captured". Its hint states SEBI's framework cap
  (`stats.maxUnhedgedShortPct`) as a regulatory limit, not as the scheme's own.
- **Planned registry fields rendered as "Not captured" rows in Compare only:**
  `glong` (gross long/short/net, one row), `bmr`, `xr`. The brief asks for
  these rows. They never become filters, columns or sort keys.
- **Unknown / malformed / over-cap `ids`** are reported under the slots, never
  silently dropped. With JS off, a `<noscript>` GET form (`<select multiple
  name="ids">`) builds the same URL.

## Requested shared-file changes

- `lib/screener/fields.ts` (F1): give `mdd` a compare note with magnitude
  semantics, e.g. `compare: { section: "risk", note: "lowest", by: "magnitude" }`.
  Compare can then drop its local override.
- Portfolio exposure: `portfolio.json` has no loader. Once F1 adds one and
  live `portfolio` fields, Compare renders them automatically: it reads
  `FIELDS` with `compare.section === "portfolio"`.
