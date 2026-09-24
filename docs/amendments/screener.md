# Wave 2C-1 (SIF Screener): contract amendments

- **Quick-filter menus render in place, not portalled.** Same as `ui/DisclosureNav`: the controls must follow the trigger in tab order. They are still overlays: mounted only while open, behind `useIsClient`, inside `AnimatePresence`, using the shared `popover` variant. `aria-controls` is set only while the panel exists. Each panel is clamped to the viewport's 16px gutter when it opens.
  → `components/screener/FilterPopover.tsx`
- **More Filters is `ui/Dialog` restyled through `className`.** It is a right-hand side sheet at `sm` and up, and full screen below `sm`. `Dialog` itself is unchanged, so the focus trap, Escape, scroll lock and return focus are the shared ones. The group jump links are buttons, not `#anchors`, because smooth scroll owns hash links and the page is locked while the sheet is open.
  → `components/screener/MoreFilters.tsx`
- **Fields left out of the More Filters panel:**
  - The SIF-name set filter, because the universal search is the name filter.
  - The planned Portfolio fields. That group shows one line instead, linking `/methodology`.
  - The monthly-return filters are not left out, but sit behind one disclosure button inside Performance.
- **Flag filters are three-state:** Any / yes / no (`ui/Segmented`), not a single on/off toggle. "No exit load" and "Exit load applies" are both real screens.
- **A range filter on a field no SIF holds is disabled** and says "Not captured for any SIF yet". Today that is AUM and TER. Applying it would hide the whole universe. It enables itself when research data lands. Every range filter states its coverage ("Available for 11 of 33 SIFs") when that is incomplete.
- **Header-click sort cycle:**
  - The first click sorts in the field's natural direction: figures high→low, words A→Z.
  - The second click reverses it, and the third click removes it.
  - A header click only ever sets the primary key. The secondary key belongs to the "Then by" select.
  - `aria-sort` is set on the primary column only.
- **Column order is canonical.** Columns sort by group rank, then registry order. That reproduces the PRD's default column order exactly, so a reset or re-toggled default collapses back to no `cols=` param.
- **Compare bar layering is `z-[140]`.** That is below the WhatsApp button (150), the header (200) and dialogs (1000). The bar sets `--float-offset` on `<html>` to `calc(<height>px + 1.25rem)` and removes it on unmount.
- **Inputs and selects are 16px below `sm`** (14px / 13px above), because iOS zooms the page on focus under 16px.
- **Results rows use no reveal wrappers.** The rows re-mount on every filter change and must never pass through opacity 0.
- **Deferred PRD items (no live data or registry field yet):**
  - Benchmark out-/under-performance and excess-return filters (`bmr`, `xr` are planned).
  - Return-ranking bands (Top 10/25/50%).
  - Sharpe, alpha and beta.
  - AUM growth.
  - Portfolio and exposure filters.
  - Fund-manager experience and AUM metrics.
  - A "Live NFO" status (NFOs stay in the Tracker).
  - "Save Screen" (the PRD marks it as a future feature, so it is omitted entirely).
