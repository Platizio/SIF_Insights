# LEDGER — Design Contract

**Every section agent MUST read this file completely before writing code.** It is
the single source of truth for the *rules*. It is deliberately **not** a source
of truth for API signatures or for any number the data layer derives — those go
stale within a day of being written here, so this file points at the code that
owns them instead. Where it points, follow the pointer.

Stack: Next.js 16 (App Router, RSC) · React 19 · TypeScript strict · Tailwind v4
(`@theme`) · Motion v12 (`motion/react`) · Lenis · Radix (accordion only).

**Two conventions used below:**

- **`→ source:`** names the file that actually owns a value. If this document
  and that file disagree, **the file is right and this document is a bug** —
  fix it here.
- **`RECORD —`** marks a decision we made and why. It describes history, not
  current state; the thing it describes may no longer be on the page. Keep it
  for the reasoning, never cite it as a description of what ships.

---

## 0. The brief in one line

**A warm-paper editorial research house — alive, tactile, and composed.**
Off-white paper ground, near-black ink, structure in hairlines, data in tabular
mono. It should read as the place the numbers live — but it must feel *authored
and animated*, not like a static document.

> **RECORD — revision 2, why the canvas is light.**
> Build one was judged too flat, too static and too dark: technically compliant
> and visually inert, flat boxes fading up 32px with nothing to engage with.
> Three things changed and all three still hold:
>
> 1. **The canvas is LIGHT (warm paper).** Every colour token in §2 is tuned for
>    it. Do not carry over dark-theme assumptions.
> 2. **The logo NEVER sits on a plate/chip.** On the light ground it sits
>    natively. Removing that white box is an explicit client instruction.
>    → source: `components/sections/SiteFooter.tsx`, the logo lockup.
> 3. **Motion is a first-class requirement, not a garnish.** "Restraint" is not
>    the goal — *finesse and character* are. See §8.

---

## 1. HARD RULES — violating any of these fails review

1. **No `box-shadow`** on content surfaces. Elevation = surface tint change +
   1px hairline. Enforced by a `box-shadow: none` reset in `@layer base`, which
   also disables Tailwind's `ring-*` utilities.
2. **No blur** on content surfaces. No `filter: blur()`, no decorative glowing
   orbs.

> **EXCEPTION — interactive surfaces are tinted translucent glass.** Client
> instruction. Buttons and filter pills use `.glass` plus one of
> `.glass-primary` / `.glass-ghost` / `.glass-inverse` / `.glass-active`.
> **The exception covers both blur AND shadow, inner and outer**, because the
> shipped treatment is a *lens*, not a frosted sheet, and a lens without a lift
> beneath it reads as a printed tint:
>
> - `backdrop-filter: blur(4px) saturate(220%) brightness(1.08)` — low blur is
>   the point. A lens is clear; frost is not.
> - **five inset shadows** (a bright specular rim top, dimmer bottom, two side
>   rims, one inner body glow) — this is what gives it thickness.
> - **two outer shadows** — a soft lift so it floats above the page. This is
>   elevation-by-shadow and rule 1 does not apply to it.
> - a gloss sheen over the upper half via `.glass::before`.
>
> Scoped to interactive elements ONLY — **content cards, panels and tiles stay
> flat with hairlines.** Verified: every `.glass*` in the tree is on a button,
> a filter pill or a form submit.
> → source: `app/globals.css`, the `LIQUID GLASS` block in `@layer components`,
> which carries the full rationale inline and is authoritative over this
> summary.
>
> Two implementation traps, both hit and fixed — do not reintroduce:
> - **Never hand-write `-webkit-backdrop-filter`.** Lightning CSS collapses the
>   pair and emits *only* the prefixed form, leaving the unprefixed property
>   unset in Chrome so no blur renders. Declare `backdrop-filter` once and let
>   the compiler prefix it.
> - Glass tints change the effective backdrop, so **re-check text contrast
>   against the composited colour**, not against the page ground.

3. **No decorative gradient fills on content surfaces.** Gradients are permitted
   only where they are doing structural work, and all four uses are already
   built — do not invent a fifth:
   - **edge-fade masks** on the marquee and the NFO ticker, and the digit-column
     mask in `<Odometer>` (`mask-image`, not a paint);
   - **scrims** over the hero banner photograph, so type stays legible on it;
   - the **glass gloss** and `<GlassField>`'s two radial accent washes;
   - `<TiltCard>`'s pointer-follow highlight.

   No `bg-gradient-*` on a card, panel, tile or section ground.
4. **`border-hairline` is the ONLY border colour on content surfaces.**
   The glass variants are the exception and ship accent- and ink-tinted borders
   on purpose: a hairline under a translucent lens vanishes, and `.glass-ghost`
   specifically draws its edge in ink at low alpha because a white border
   disappears on warm paper.
5. **Radius is semantic:**
   - `rounded-full` (999px) → interactive only: buttons, pills, badges, avatars,
     icon buttons
   - `rounded-none` (0) → ALL content containers: every card, every tile, every
     panel
   - **`rounded-[4px]` → form controls only** (text inputs, selects, textareas,
     checkboxes). Neither 0 nor 999px is right for a field; this is the one
     small-radius exception and it is scoped to controls.
     → source: `app/contact/ContactForm.tsx`, the `CONTROL` class.
   - `160px`–`400px` on **exactly one corner** → decorative arc, tint/media
     tiles only. Other three corners stay 0.
     → source: `components/sections/ClosingCta.tsx`, `borderRadius: "400px 0 0 0"`.
   - Nothing else. No `rounded-lg`, no `rounded-xl`, no `rounded-2xl`.
6. **No zebra striping.** Rows separate by hairline.
7. **Max 4 type sizes per section.** Hierarchy via colour and weight, not more
   sizes.
8. **Asymmetric grids only.** Never 50/50.
9. **Section rhythm is `py-[100px]`** — use the `<Section>` primitive.
10. **Curves and durations are owned in two places and only two.**
    - CSS gets exactly one curve and one duration:
      `--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1)` and
      `--duration-micro: 200ms`. Anything longer than a hover is choreographed
      in JS, so CSS holds no other duration token — a `--duration-reveal: 700ms`
      once sat there unreferenced while `lib/motion` shipped `DUR.reveal = 0.72`,
      and it was deleted rather than resynced.
    - Everything else comes from the `EASE` and `DUR` scales in `lib/motion.ts`.
      Never hand-roll a number in a component.
11. **Reveals move on Y. Hover moves on X.** Never mix the axes. **Travel
    distance is not yours to pick** — it is owned by the variants in
    `lib/motion.ts` (blocks 14px, table rows 8px). A uniform 32px fade-up is
    banned outright; see §8.1.
12. **Content must be readable with JS disabled.** Never set `opacity: 0` in CSS
    and rely on JS to reveal it. There is a CSS-only safety net
    (`html.reveals-forced`, stamped by `<RevealGuard>` on demonstrated failure)
    — it is a last resort for a broken observer, not a licence to depend on JS.
13. **No fabricated data.** Every number traces to `@/lib/data`. If data is
    missing, render the honest empty state. This is the site's first rule; see
    `README.md`.
14. **Focus via `outline`**, never `box-shadow`. Already global.
15. `prefers-reduced-motion` is handled globally — do not add per-component
    guards, but never build a component whose meaning depends on motion.

### Banned (these are the OLD site's tropes — their presence means the redesign failed)

`#336693` · `#C2A057` · Montserrat · gold headings · blurred orbs ·
`bg-gradient-dark` · body text tinted with a brand hue · success and primary
sharing a colour · perpetually animating icons · mixed arbitrary corner radii.

Verified absent from the tree. Keep it that way.

---

## 2. Tokens

### Colour — Tailwind v4 classes, defined in `app/globals.css` `@theme`

| Class | Role |
|---|---|
| `bg-ground` | page background |
| `bg-surface` | raised panel |
| `bg-surface-2` | nested panel / table row |
| `border-hairline` | **the only border on content** |
| `bg-chip` / `text-chip` | dark plate (inverse blocks) |
| `text-ink` | headings |
| `text-body` | paragraphs |
| `text-muted` | meta, captions, disclaimers |
| `text-accent` / `bg-accent` | eyebrows, primary CTA, live indicators (cool aqua) |
| `bg-accent-dim` | hover/pressed |
| `bg-accent-wash` | tinted surface |
| `text-gain` / `bg-gain` | NAV up |
| `text-loss` / `bg-loss` | NAV down |
| `text-flat` | unchanged |
| `text-pending` | no NAV filed |
| `bg-risk-1` … `bg-risk-5` | risk ramp, low → high |

Each token carries its contrast constraint as a comment beside it in
`globals.css`. Read the constraint before changing a value — several are load
bearing against 4.5:1.

### Type

**The display tier is fluid, not a fixed pixel table.** Every headline is a
`clamp()` and there is no single "H1 size" — the hero and the interior page
header are deliberately different ramps:

| Element | What ships | Leading |
|---|---|---|
| Hero H1 | `clamp(40px, 5.4vw, 80px)` | 1.12 |
| Page-header H1 | `clamp(36px, 4.6vw, 64px)` | 1.12 |
| Section H2 | `clamp(32px, ~3.8–4vw, 48px)` is the common ramp | 1.06–1.24 |
| Card title | `22px` | — |
| Body | `17px / 30px` (the `body` rule; ≈1.76) | 1.76 |
| Dense / table register | `13px`, the single most-used size on the site | — |
| Small meta | `14px / 20px` | 1.43 |
| Eyebrow | `12px / 14px`, `+0.08em`, UPPERCASE, weight 600, `text-accent` | — |

→ source: `app/globals.css` (`body`, the `h1–h5` base rule) and the components
themselves. Do not restate a rendered pixel width here; it changes with the
viewport and with the next section that ships.

**Heading leading is tight (~1.1) against body leading 1.76.** That contrast is
load-bearing — never compress body leading to 1.5. The root font-size is itself
fluid (`clamp(15px, 1.1111vw, 19px)`), so every rem-based spacing scales with
the viewport rather than stepping at breakpoints.

Fonts are wired as CSS vars: `font-sans` (Geist) · `font-mono` (Geist Mono) ·
`font-serif` (Instrument Serif Italic).

- **All figures** (NAV, ratios, minimums, dates, percentages) use the `.tabular`
  class — mono + `tabular-nums`. Columns must align.
- **The serif-italic word swap:** `<em className="swap">word</em>`. **Exactly one
  word per display headline.** It appears **exactly twice site-wide**, both on
  the homepage: once in the Hero H1 and once in the Closing CTA. **Nowhere
  else.** → source: `components/sections/Hero.tsx` and
  `components/sections/ClosingCta.tsx`; the class itself is `em.swap` in
  `globals.css`.

### Spacing / layout

4px base grid; macro tier 80 / 100 / 120.

**`<Shell>` is full-bleed, not a centred column.** It runs edge to edge with a
responsive gutter (`px-6` → `2xl:px-24`) and a `max-w-[2400px]` backstop so an
ultrawide does not stretch a table past the point the eye can track a row.

There is **no container-width token**, deliberately: a 1240px token left in
`globals.css` would be a standing invitation to re-centre something against a
column that no longer exists. Do not add one back.
→ source: `components/primitives.tsx`, the `Shell` docstring, which explains the
`WIDTH IS NOT MEASURE` rule that goes with it: full-bleed widens the
*container*, never a paragraph. Every body block keeps its own `ch`-based cap.

Grid tracks are per-section and mostly `[fixed_1fr]` so the dense half takes the
extra width. The recurring pairs are `420px 1fr` (framing column + table/cards)
and `460px 1fr`. The FAQ and the what-is-SIF explainer keep a fixed
`460px 660px` with a 120px gutter because centred prose is the point there.

> **RECORD — the fixed 804px tracks.** Several sections were once sized to land
> exactly inside the old 1240px shell. When the shell went full-bleed those
> stranded the content on the left with ~670px dead to the right, and they were
> made fluid. If you find another fixed track that assumes a 1240px parent, that
> is the bug.

---

## 3. Primitives and motion components

**This section deliberately lists no signatures.** An API table here goes stale
the first time a prop changes and then actively misleads — that has already
happened. Read the modules; they are commented for exactly this purpose.

| Module | What lives there |
|---|---|
| `@/components/primitives` | `Shell`, `Section`, `Eyebrow`, `Button`, `Delta`, `RiskBand`, `PendingBadge`, `Card`, and the legacy `Stagger` / `StaggerItem` |
| `@/components/motion/Reveal` | The current reveal vocabulary: `Rise`, `Group`, `GroupItem`, `RowGroup`, `RowItem`, `RowListItem`, `Rule`, `Wipe`, `Parallax`, `useRevealed` |
| `@/components/motion/*` | `LineReveal`, `Odometer`, `DrawnPath`, `Magnetic`, `TiltCard`, `GlassField`, `RevealGuard` |
| `@/lib/motion` | `EASE`, `DUR`, `EXIT`, `SPRING`, `ENTER`, `PARALLAX` and the variants |
| `@/lib/cn` | `cn()` — class merge |

Three things about this map that are rules, not trivia:

- **`Stagger` / `StaggerItem` in `primitives` are revision-1 wrappers**, kept
  only so existing sections keep compiling. **New work uses
  `components/motion/Reveal.tsx`** (`Rise`, `Group`, `Rule`, `Wipe`, `Parallax`).
- **There is no `<Reveal>` component.** The file is named `Reveal.tsx`; the
  export you want is `<Rise>`.
- **Entry thresholds come from `ENTER`, never from an IntersectionObserver
  `amount`.** `ENTER` values are bottom root-margins — percentages of the
  *viewport*. An `amount` is a fraction of the *element*, so any element taller
  than `1 / amount` viewports can never satisfy it and stays at opacity 0
  forever. That blanked the AMC index once. → source: `lib/motion.ts`, the
  `Reveal entry lines` comment.

---

## 4. Data — import from `@/lib/data`

**The API and every count live in `lib/data/index.ts`.** That file is
thoroughly commented, its types are the contract, and its `stats` object is the
one place counts are derived. Read it. Nothing numeric is restated here, because
the nightly NAV job rewrites part of that data every weekday and any figure
copied into this document is wrong within a day.

**Interpolate `stats.*` in copy rather than typing a number.** Counts on the
site correct themselves as data lands; a hardcoded one silently rots.
`tests/stats.test.ts` recomputes every count from the raw JSON, so a broken
derivation fails the suite rather than shipping a false claim.

### Data rules you must honour — these do not go stale

- **The face-value trap is absolute.** Two schemes are priced off a
  ~₹1,000 face value while the rest sit near ₹10. That is a different unit, not
  a hundredfold better performance. **Never put absolute NAVs on a shared axis,
  bar width or comparative scale.** Each chart plots ONE scheme against its OWN
  axis. **Percentage change is the only cross-scheme basis you may use.**
  (Which schemes they are, and their current values, are in the data — do not
  hardcode either.)
- **`changePct` is the move since the scheme's PREVIOUS PUBLISHED NAV**, which is
  not always yesterday: weekends and non-dealing days are simply absent from the
  series. `nav.previous` carries that date — state it rather than saying
  "today". It is `null`, never `0`, when only one observation exists; zero would
  claim the fund was unchanged, which we do not know.
- **Risk bands really vary — do not flatten this.** The variation is the
  interesting part. **Take band values from `@/lib/data`, never from a
  document.** This file previously asserted specific bands for named schemes,
  got two of them backwards, and that error propagated into the live site. It no
  longer asserts any. A band is `null` where the scheme's document does not state
  one, and `<RiskBand>` renders that honestly.
- **Debt is genuinely empty** → "Launching soon", not a hidden tab, not a
  placeholder grid.
- **AMC marks have mixed file extensions**, and that is load-bearing rather than
  untidy: every file was taken from the house's own site. `.svg` marks route
  through a plain `<img>` (hence an `@next/next/no-img-element` eslint-disable
  in `AmcMark.tsx` — one of only two in the tree, the other being the YouTube
  thumbnails on `/media`) because `next/image` refuses SVG without
  `dangerouslyAllowSVG`, and turning that on for third-party files is the wrong
  trade — an SVG can carry script. **Always render a mark through `<AmcMark>`**,
  never a bare `<Image>`: it owns the tile geometry, the null-logo text lockup
  and the grayscale→colour hover, and it exists because the PNGs have no alpha
  channel and cannot be flattened to a single ink.
- **A house may have no mark at all.** All of them do today, so that branch is
  currently unreached — it is there for the next house arriving from AMFI's feed
  without artwork. Never a gap; never a stand-in glyph implying a brand we do
  not have.

---

## 5. Compliance — non-negotiable

- SIF Insight is a **distributor**, not an advisor or AMC. Copy stays in
  "discover / learn / compare / consult". **No advice, no guaranteed returns, no
  performance promises.**
- **NEVER claim a refresh cadence.** Not "Updated daily", not "live", not
  "real-time". Nothing in the pipeline guarantees a daily refresh, and
  "Updated daily" shipped beside a NAV file that was already five days old.
  **State the date instead** — `formatUpdated(navLastUpdated)` — because a dated
  statement is the one we can stand behind. Every NAV surface pairs
  *"NAV data fetched from AMFI"* with a **dated** clause and the source. Do not
  replace that with another cadence word.
  → source: the three `No cadence claim` comments in
  `components/sections/NavBoard.tsx`, `app/sif-tracker/TrackerTable.tsx` and
  `app/strategies/[category]/page.tsx`.
- Any fund card must carry **risk band, exit load, expense ratio and minimum
  investment** — that is the material disclosure, not decoration. Where a
  document does not state one, it renders **"Not captured"**, never a default.
- **An expense ratio from an ISID is a CAP, not the ratio charged.** Where
  `expenseRatioIsCap` is true the qualifier must travel with the number; use
  `formatExpense()`, which renders it as a ceiling.
- **The footer disclaimer is owned by `components/sections/SiteFooter.tsx`, and
  parts of it are DERIVED rather than fixed prose.** Do not paste a verbatim
  block from this file — there isn't one any more. The "we hold no document yet"
  clause is counted from `stats.disclosedCount`, so it retires itself the day
  the gap closes and returns the day a scheme arrives without a document.
  Asserted as static text it once shipped on every route claiming AMC documents
  were awaited while the page above it named the documents those fields were
  read from — a contradiction visible from one screen.
- Footer must link the SEBI circular
  (`https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html`)
  and the AMFI SIF Portal (`https://www.amfiindia.com/sif`). Both verified live
  in `SiteFooter.tsx`.
- **`navSource` is a human label, not a URL.** Using it as an `href` resolved it
  against the current page and 404'd on three category routes. Link with
  `navSourceUrl`.

---

## 6. Accessibility

- Contrast ≥ 4.5:1 body, ≥ 3:1 large display.
- Gain/loss never colour-alone — always ▲/▼ + sign (the `<Delta>` primitive does
  this, and derives glyph, sign and digits from **one** rounded value so they
  cannot disagree).
- Risk bands carry a numeric label.
- Radix for the accordion; real `aria-expanded` / `aria-controls`.
- Marquees pause on hover (`.marquee-host` + `.marquee-track` classes already
  exist) and stop under reduced motion.
- Every interactive element keyboard reachable, visible focus ring.
- Decorative SVG gets `aria-hidden="true"`.

---

## 7. Conventions

- Server Components by default. Add `"use client"` **only** where hooks or
  interactivity genuinely require it. Note that `"use client"` still
  server-renders — it means *hydrated*, not *client-only* — so a client section's
  headline is still in the first HTML payload.
- One section per file in `components/sections/`, named export matching the
  filename.
- Sections take **no props** — they import their own data from `@/lib/data`.
  This keeps `page.tsx` a clean list.
- Use `next/image` for the logo and AMC logos, with explicit `width`/`height`
  (CLS). The `.svg` exception is in §4.
- Comment density: match `lib/data/index.ts` and `components/primitives.tsx` —
  brief comments where intent isn't obvious, and a full explanation on anything
  that was once a bug.
- TypeScript strict. No `any`. `npx tsc --noEmit` must pass, and `npm test`
  (Vitest, data integrity) must pass.

---

## 8. MOTION (this is the heart of the rebuild)

Import everything from `@/lib/motion` and `@/components/motion/*`. **Never
hand-roll durations or curves.**

### 8.1 The old system is dead

`opacity 0 → 1, y 32px` on every element is **banned**. It is the specific
failure that made build one feel inert — arbitrary travel through empty space,
applied uniformly, which reads as "no decision was made".

### 8.2 Tokens

```ts
EASE.out      [0.22, 1, 0.36, 1]   // editorial reveal — the workhorse
EASE.outExpo  [0.16, 1, 0.30, 1]   // hero, big travel, image wipes
EASE.outQuart [0.25, 1, 0.50, 1]   // UI state
EASE.inOut    [0.76, 0, 0.24, 1]   // symmetric moves
DUR.micro .14 · ui .26 · reveal .72 · line .85 · wipe .95 · rule .70 · hero 1.10 · odometer 1.4
EXIT 0.15                          // exits are ALWAYS faster than entrances
SPRING.cursor / SPRING.card
ENTER  rule 2 · rows 4 · item 8 · block 12 · lines 18 · chart 25   // §3
```

→ source: `lib/motion.ts`. If the two disagree, that file wins.

**`inherit: true` on a variant's `show` transition is load-bearing.** Motion
resolves an element's `transition` **prop** only as a fallback, so a variant that
carries its own transition silently discards any `delay` passed at the call
site — rows lost their cascade and staggered blocks landed in one frame. Do not
remove it, and do not add a variant without it.

### 8.3 The four techniques that rebuild the tier

| Use | Component | Spec |
|---|---|---|
| **Headlines** | `<LineReveal lines={[...]} as="h2">` | masked lines, `y 100% → 0`, 0.85s, stagger 0.07. **No opacity on the inner span** — the mask does the work |
| **Hairlines** | `<Rule />` | `scaleX 0 → 1`, origin-left, 0.70s, transform only — never `width`. On warm paper *the rules are the design* |
| **Images/media** | `<Wipe>` | `clip-path inset(0 0 100% 0) → 0`, 0.95s, inner counter-translates `y 8% → 0`, `scale 1.06 → 1` |
| **Figures** | `<Odometer value={n} />` | fixed-slot digit columns, 1.4s, per-digit delay `0.045 × indexFromRight` |

Blocks use `<Rise>` (**14px**, not 32). Table rows use `<RowItem>` (**8px**).
Cap any stagger near **10 items**.

### 8.4 Interaction

- `<Magnetic>` on primary CTAs — pull 0.28, cap 10px. **No custom cursor**
  (reads as agency portfolio; costs credibility with investors).
  > **RECORD —** an inner label once counter-translated at 0.45× "for depth". It
  > was removed: the two translations compounded, so the visible control moved
  > 14.5px against a `cap` of 10 and the effective strength came out at 0.219
  > rather than the 0.28 asked for. Geometry is now captured once on
  > `pointerenter`. Do not reintroduce a second moving layer.
- `<TiltCard>` on fund cards — **max 4.5°** (above ~8° it becomes a toy, the
  wrong register for fund disclosure), perspective 1400px, with a
  **pointer-follow radial highlight in the accent hue at ~10% alpha**. Never a
  white glow: invisible on cream, reads as a rendering bug. The lift is a
  pseudo-layer's opacity plus a hairline shift — **never an animated
  `box-shadow`**.
  > *Unverified:* the component's own docstring calls the highlight "a warm
  > amber wash" while the shipped colour is the cool aqua accent (hue 195). One
  > of the two is wrong and it is a code question, not a contract question —
  > resolve it in `components/motion/TiltCard.tsx` rather than here.
- Popovers/accordions: origin-anchored, enter 0.22s, **exit 0.15s**.

### 8.5 Data motion — the credibility layer

- `<DrawnPath>` for every NAV/chart line: `pathLength 0 → 1`, **eased tween,
  never a spring**. Overshoot on a data line implies the value was briefly wrong.
  *Springs are for objects; quantities get tweens.* It animates on a revealed
  flag rather than `whileInView`, because a line stuck at `pathLength: 0` is an
  invisible failure rather than a visible one.
- `<Odometer>` fires **once, lands on the real value, and stops**. It must never
  loop or idle-tick — a figure that keeps moving implies live data, which for SIF
  disclosure is a compliance problem, not a style choice. Always pair with the
  as-of date.

### 8.6 Parallax — substrate only

Rate ladder: substrate `0.06` · watermark `0.12` · framed image `0.18` · card
`0.03` · **body copy, tables and charts `0`, always**. Use
`<Parallax rate={PARALLAX.substrate}>`.

Lenis provides scroll smoothing **only** — no hijacking, no pinning, no
scroll-jacked sections — and is disabled outright under reduced motion.

### 8.7 The hero

**The hero banner is a static image** (`/sif-hero-4k-21x9.png`) under layered
scrims, in a single column. It is not a canvas and there is no bento tile grid
beside it.

> **RECORD — the WebGL hero and the proof-tile bento.**
> The banner replaced a WebGL "Yield Surface" (fBm contour isolines, ink on
> paper, cursor-perturbed, Bayer-dithered). `components/webgl/` and the
> three.js stack have since been **deleted** — the components were dead code and
> the dependencies were shipping for nothing. The bento was removed pending a
> replacement treatment that has not landed. Everything the bento used
> (`Odometer`, `DrawnPath`, the AMC discs) is still available in the motion and
> primitives modules.
> **Do not write against either as though it exists.** If a canvas hero is ever
> wanted back, it is a new build, not a re-import.

### 8.8 Load choreography (hero only, ~1.1s)

Hero headline line 1 starts at **delay 0** — Chrome ignores `opacity: 0` elements
when picking an LCP candidate, so any delay on the H1 is a measured LCP
regression rather than a taste question. **LCP is never deferred.** All luxurious
pacing goes to elements that can never be the LCP candidate: eyebrow 150ms,
standfirst 240ms, CTA row 420ms, trust row 550ms.
→ source: `components/sections/Hero.tsx`, the `CHOREO` constant.

### 8.9 Banned motion

Ticking/looping numbers · text scramble/glitch · custom cursors · scroll-hijack
or horizontal scroll · percentage preloaders · 3D coins/cards/globes · marquees
faster than ~40px/s · confetti · card tilt above 8° · parallax on content ·
glow/bloom (dark-bg idioms; they vanish or look broken on cream) · animating
`box-shadow`/`width`/`height`/`top`/`left` · springs on any value representing a
quantity · sound.
