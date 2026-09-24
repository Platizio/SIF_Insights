# Wave 2D (sif) — amendments

- **Monthly-returns grid wraps instead of a 12-column year table.** Cells are
  `grid-cols-3 → 12` so a 390px screen never scrolls sideways; each cell prints
  the month and the signed % (heat grade is decoration on top, `heatGrade(pct,"1M")`).
- **NAV chart period chips are windowed from the scheme's latest published NAV**,
  not the reader's clock (static build). A window the series does not reach is
  shown but disabled rather than drawing a shorter line under a longer label.
- **House SIF AUM is stated only when `amcAum().complete`.** A partial month is
  shown as "Not captured" with "AUM held for x of y schemes" — a partial sum is
  not the house's AUM (applies to /amc, /amc/[id], /sif/[id]).
- **Disclosure provenance reads `verifiedAgainst` directly** from
  `lib/data/raw/disclosures.json` in the server-only `components/sif/detail.ts`
  because `Strategy` does not carry it. Suggest F1 add `verifiedAgainst` to
  `Strategy`/`SifRow` and this import is dropped.
- **/sif/[id] links to `/methodology#…` anchors** (returns, monthly-returns,
  volatility, max-drawdown, risk-band, ter, exit-load, liquidity, sources) —
  the anchors already named in `lib/screener/fields.ts`; the methodology page
  must render them.
