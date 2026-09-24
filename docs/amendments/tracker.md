# Wave 2B (SIF Tracker): amendments

For the integrator to fold into `DESIGN_CONTRACT.md` and the spec. Each item names the file that owns it.

## Copy and missing values

- **The eyebrow and the H1 are both "SIF Tracker".** The PRD (p.22) names the page heading, and the brief fixes the eyebrow. → `app/sif-tracker/page.tsx`.
- **"Not announced" is a fourth missing-value text, for upcoming NFO dates only.** An announced SIF with no stated window is not "Not captured": the AMC has not published a date, so there is nothing for us to capture. A gap in an *open* offer's record still says "Not captured". → `components/tracker/NfoList.tsx`.
- **Benchmark Return renders "Not captured" on every Top 5 row.** `SifRow` has no benchmark returns yet. The column stays because the PRD lists it (p.25). The tooltip names the benchmark. → `components/tracker/TopPerformers.tsx`.
- **An AUM strategy with no SIF filed says "Not applicable"; one with SIFs but no figure for the month says "Not captured".** Neither gets a bar. An empty track next to a strategy that holds money would read as zero. → `components/tracker/AumIntelligence.tsx`.

## Layout and visuals

- **The snapshot is two ledger bands, not cards.** They are hairline grids with `border-l/-t` on the list and `border-r/-b` on each tile.
  - Band 1 is size: SIFs, AMCs, strategy types, disclosures.
  - Band 2 is activity: Live NFOs, Upcoming SIFs, then AUM in a `2fr` cell.
  - Figures use the mono `.tabular` face through `Odometer`, at `clamp(28px, 4.2vw, 52px)`. The 28px floor is what fits "30 / 33" in a 390px two-up tile.
  - The two NFO tiles are whole-tile links to `#live-nfos` / `#upcoming`. → `components/tracker/MarketSnapshot.tsx`, `stat.tsx`.
- **1 Week is set apart (PRD p.24).** The period filter is two `Segmented` fieldsets that share one radio `name`, so they behave as one native radio group: one Tab stop, and arrow keys run across both. The second fieldset holds only 1W, with smaller chips (`[&_label]:px-3 py-1.5 text-[12px]`). Periods that no SIF has yet (1Y, 2Y today) are inert. → `components/tracker/TopPerformers.tsx`.
- **Heatmap cells are separated by a 2px `border-surface` gutter**, so the fills read as tiles. The sticky name column draws its right hairline with an `after:` pseudo-element, because `border-collapse` borders do not travel with a sticky cell. Text is ink on grades 1–2, `text-surface` on 3–4, and muted on N/A, following the pairings in the tokens' note. → `components/tracker/Heatmap.tsx`, `model.ts` (`HEAT_CLASS`).
- **The heatmap legend is a scale.** Eight swatches run from strongest loss to strongest gain, with the band edges ticked between them. The 1W edges are stated in a caption.
- **The distributor note sits after `ConsultCta`** in a `Shell` pulled up with `-mt-12`, because `ConsultCta` has no note slot. See the requests below. → `app/sif-tracker/page.tsx`.
- **Interactive tables are not row-staggered.** Rows inside the filter/sort islands change on every interaction, so each island is revealed once by an outer `Rise`. Only the static Latest NAVs board uses `RowGroup`/`RowItem`.

## Data and derivation

- **The NFO clock never runs behind the build.** `useNfoToday` takes the later of the reader's Indian date and `navLastUpdated`. On the hydrating render it prints the server-formatted date label, so ICU "Sep"/"Sept" differences cannot cause a mismatch. → `components/tracker/NfoClock.ts`.
- **Only open and upcoming offers are shipped to the islands.** An offer closed on the build date cannot reopen on a later date. → `components/tracker/data.ts`.
- **Heatmap legend edges are a copy of spec §9** (`HEAT_EDGES` in `components/tracker/model.ts`), because `lib/format.ts` keeps its bounds private.
