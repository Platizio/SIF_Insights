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

## 9. Amendments — PRD rebuild (September 2026)

The client review of 21 Sep 2026 (`SIF Insight review 21-09.pdf`) replaced the
information architecture: Home · SIF Tracker · SIF Screener · Compare · AMCs ·
Learn · About Us, with a persistent Book a Consultation CTA, a lead popup and a
WhatsApp button. Where it conflicted with the rules above, **the client brief
won and the conflict is recorded here**, per area. Everything not amended below
still binds. Items the brief itself marks for compliance approval (legal pages,
footer disclaimer, the trust line, popup consent) are drafts until approved.

Standing amendments that cut across areas:

- **Client islands never value-import `@/lib/data`.** They take serialisable props
  from a server wrapper; `tests/client-imports.test.ts` enforces it. (Before the
  rebuild every page shipped the full NAV history via the layout.)
- **Retired routes redirect (308)**: `/nav-tracker` → `/sif-tracker#latest-navs` (or
  `/sif/{id}` for `?scheme=`), `/media` → `/learn#videos`, and the legacy Wix paths.
- **Costs since 1 April 2026**: SEBI caps the *base* expense ratio; the charged total
  TER adds brokerage, transaction costs and statutory levies and routinely exceeds
  the cap. Show Total TER, Base expense ratio and the cap as three labelled
  figures — never substitute one for another.
- **Post-build HTML check**: `scripts/verify-static-html.mjs` runs in CI after the
  build (reveal invariant, dead links, banned copy).

### 9.1 Data foundation (lib/data, lib/screener, tests)

For the integrator to fold into `DESIGN_CONTRACT.md` / the shared spec. None of
these change a visual rule. They record where F1 had to settle something the
spec left open, or added to it, so the W2 pages build on the same reading.

#### Design contract

- **No visual amendments.** F1 ships no UI. The server-wrapper and client-island
  splits of Hero, AmcMarquee, Faq, StrategyGrid and NfoBar change no markup or
  class.

#### Data contract (spec §5–§9): clarifications and additions

- **`withheld` prints the insufficient-history phrase.** `ABSENT_LABEL.withheld`
  is "N/A — Insufficient history", so the site still uses exactly three
  missing-value texts. `absentLabel(reason)` in `lib/format.ts` is the one
  mapping. Pages should call it rather than switching on the reason.
- **`SifRow` has five fields beyond §5.** All are serialisable:
  - `benchmarkText`: the ISID's own words.
  - `subscriptionBucket`: bucketed from scheme-facts, backing the `sub` field.
  - `options`: plan and option names, backing the `opt` field.
  - `returnsMeta[p]`: `{}` whenever the return is absent.
  - `faceValueBasis`: `"sourced" | "inferred"`, the `basis` of `faceValue()`,
    so a page can say that a face value was inferred.
- **A field's label and source can depend on the row (§7 `Base`).** `Base`
  gains optional `labelFor(r)` and `sourceFor(r)`. The static `label` and
  `source` must now be true of every row, so where the truth varies they carry
  the weaker claim.
  - Pages resolve labels and sources through `fieldLabel(field, rows)` and
    `fieldSource(field, rows)` in `lib/screener/fields.ts`. Pass the table's
    rows for a column header, the picked schemes for a Compare row, and `[row]`
    on a scheme page. The exact value is returned when every row agrees,
    otherwise the static one. W2 must not print `field.label` or
    `field.source` for rows it could name.
  - Scheme-facts is still empty, so today every inception is the first NAV
    date, every SI return runs from the first NAV, and every face value is
    inferred. The affected fields:

    | Field | Static label / source | Per row |
    |---|---|---|
    | `rsi` | "Since inception / first NAV" | "Since inception" only when SI runs from face value at a sourced allotment; otherwise "Since first published NAV" (the plan's wording) |
    | `inc` | "Inception / first NAV", SIF Insight calculation | "Inception", Scheme document (allotment); "First published NAV", AMFI (first NAV) |
    | `fv` | "Face value", SIF Insight calculation | Scheme document only when `faceValueBasis` is `sourced` |
  - `age` is measured from the same date as `inc`. Its source is already
    "SIF Insight calculation", and the `#inception` methodology note covers the
    basis.
- **Optional `asOf` on the returns engine.** `volatility`, `maxDrawdown` and
  `monthlyReturns` also take `{ asOf }`, like `trailingReturn`. `trailingReturn`
  also takes `minAgeDays`, but only so tests can exercise `withheld` while
  `PERFORMANCE_MIN_AGE_DAYS` is 0. Pages never pass it.
- **`faceValue` infers from the first published NAV.** The rule is first NAV
  > 200 ⇒ ₹1,000, otherwise ₹10. It does not use the latest NAV, because a ₹10
  unit could compound past 200 but its first print cannot. `basis` says
  whether the value is sourced or inferred.
- **`nfoStatus` covers two cases §5 leaves unsaid:**
  - A legacy entry with only `closesOn` counts as already open. This keeps the
    old `isOpenNfo` behaviour.
  - An entry with `opensOn` but no `closesOn` is `closed` once it has opened.
    Without a stated end date it cannot be asserted open.
  - `nfoStatus` and `isOpenNfo` live in `lib/format.ts` so the client ticker can
    re-run them against the reader's clock. `lib/data` re-exports both.
- **The client's "today" is the date in India (rule 9).** NFO windows and
  `navLastUpdated` are Indian calendar dates.
  - `useTodayIso` and `isOpenNfo` turn an instant into a date with
    `indianIsoDate` (`lib/format.ts`), which uses a fixed +05:30 because India
    has no daylight saving.
  - Using the UTC date meant the ticker rolled over at 05:30 IST. It kept a
    closed offer "Live" for up to 5½ hours and held back one that had opened.
  - Any other client surface comparing the wall clock with a data date must
    use `indianIsoDate` too.
- **`heatGrade` boundaries follow §9 literally.** Grade 1 is `< a`, grade 2 is
  `a–b`, grade 3 is `(b, c]` and grade 4 is `> c`. So exactly 1% is grade 2,
  exactly 3% is grade 2, and exactly 7% is grade 3. `0` is reserved for an
  exactly unchanged value, and a `+0.00%` cell grades +1 so its colour never
  contradicts the printed sign.
- **Exit-load figures are for filtering and sorting only.** The page prints
  `exitLoad.text`.
  - Months are counted as 365/12 days, rounded: 3M = 91, 6M = 183, 12M = 365.
  - `pct` is the highest rate charged.
  - `periodDays` is the last day on which any load still applies. So SIF-13
    reads as 0.50% for 30 days, `tiered`.
  - SIF-21's "first 10% of units free" is treated as an allowance, not a rate.
- **Benchmarks resolve to 10 canonical ids today.** The 18 spellings on file
  map to 7 indices plus 3 weighted blends. Each blend keeps its own words and
  gets its own `blend-…` id.
  - Hybrid composites carry no TRI suffix because they have no separate price
    variant.
  - An unrecognised benchmark gets an `other-…` id, and
    `tests/taxonomy.test.ts` fails on it.
- **AUM totals are summed over the best-covered month.** That is the month in
  which the most schemes report, with the latest month winning a tie. It is
  not simply the newest month.
  - `SifRow.amcAumCr` is filled only when the house is `complete`. A partial
    sum is not the house's AUM.
  - `aumByStrategy()` uses the industry's month, so its slices add up to
    `industryAum().cr`.
- **Unapproved FAQs are not exported.** `faqs` leaves out entries marked
  `approved: false`. Entries with no flag were already live and stay live.
  This matches the articles gate in `lib/content`.
- **An encoded comma separates, in Compare ids and in every Screener list.**
  `parseCompareIds` and `decodeScreen` both treat `%2C` as a separator, for
  sets and for `sort`, `cols` and `pick`.
  - No set id can hold a comma: ids are slugs, AMFI codes and digits.
  - `URLSearchParams` writes commas as `%2C`.
  - The already-decoded inputs (Next's `searchParams`, a URLSearchParams)
    cannot tell a `%2C` from a raw comma. Reading it literally in the string
    form made the server page and the client read one URL two ways.
  - `normaliseScreen` splits a set id containing a comma the same way, so
    `decode(encode(s))` stays `normaliseScreen(s)`.
  - Encoding is unchanged, as §7 specifies: values are encoded with
    `encodeURIComponent` and joined with raw commas.
- **The URL codec keeps two more invariants.**
  - `q` is cut to 120 code points, not UTF-16 units, and trimmed after the
    cut. Lone surrogates are dropped from `q` and from set ids. So
    `encodeScreen` cannot throw `URIError`, and normalising is idempotent.
  - Range bounds are rounded to 6 decimals, with `−0` folded to `0`. `String()`
    therefore never prints an exponent, and a tiny bound survives the link as
    `0`. The finest filter step on the site is 0.05.
- **Screener date-range filters hold UTC epoch days.** The `inc` and `navdate`
  filters store their bounds as epoch days inside `FilterValue`, so it stays
  numeric. The URL carries them as ISO dates.
- **The client-bundle guard is transitive.** It follows value imports from
  every `"use client"` module under `app/`, `components/` and `lib/`. Only
  `lib/data/types.ts` is reachable, and that file must stay import-free.
  - Allowlisted for now: `app/sif-tracker/TrackerTable.tsx` and
    `app/nav-tracker/NavExplorer.tsx` (retired in W3).
  - The test fails on a stale allowlist entry, so W3 must delete the entry
    along with the file.
- **The W1 exit gate "no NAV history left in client chunks" is DEFERRED, not
  passed.** The two allowlisted files still import values from `@/lib/data`.
  - Their routes, `/sif-tracker` and `/nav-tracker`, still ship the full
    series in a client chunk: the `"SIF-3":[[` string, about 140 KB.
  - Every other route is clean. That includes the layout's NfoBar, so `/` and
    `/privacy` no longer carry it.
  - The gate closes when 2B's server-fed tracker replaces `TrackerTable.tsx`
    and W3 retires `app/nav-tracker`. Both allowlist entries go with them.
  - The integrator should record the gate as deferred until then. The plan's
    Playwright bundle check (no `"SIF-3":[[` on `/` or `/privacy`) passes today.

### 9.2 Site chrome, UI kit and constants

These are the places where the PRD or the rebuild needed something `DESIGN_CONTRACT.md` does not allow yet, or says differently. The integrator folds each one into the contract. Every item points at the file that now owns the rule.

#### Navigation

- **Dropdown navigation (split disclosure).** The header now has two items with children, "SIF Tracker ▾" and "Learn ▾" (PRD p.8).
  - Each one is a split control: a real `<Link>` to the hub page, plus a separate chevron `<button aria-expanded>`. This follows the WAI-ARIA disclosure-navigation pattern and is **not** `role="menu"`.
  - Hubs stay reachable with JS off.
  - The panel closes on Escape (focus goes back to the chevron), on an outside pointerdown, and when focus leaves it.
  - `aria-controls` is set only while the panel exists.
  - The panel is an overlay (`AnimatePresence` + `useIsClient`, shared `popover` variant). **It renders in place, not portalled.** This deliberately departs from the "overlays portal to `<body>`" rule, because the child links must follow the chevron in tab order. The header's `z-[200]` stacking context already puts the panel above the page.
  - On mobile the same items are an inline accordion, with no outside-click or focus-out dismissal.
  - The accordion is **not** an overlay, so it is server-rendered and toggled with `hidden`, like the mobile panel it sits in. This keeps a site-wide link in the HTML to the Learn children (`/what-is-sif`, `/strategies`, `/downloads`) and the hub anchors, which nothing else in the header or footer links to.
  - `aria-current="page"` marks an exact match only; section-awareness (e.g. `/strategies/equity`) sets the ink colour, not the announcement.
  - → source: `components/ui/DisclosureNav.tsx`, `lib/nav.ts`.
- **Header breakpoint stays at 992px.** It was re-measured with the PRD labels (two chevrons, "Book a Consultation") in headless Chromium against `next start`:
  - At 992 / 1024 / 1120 / 1280 / 1440 the logo, nav and CTA sit on one row with no wrap and no horizontal scroll.
  - The smallest gaps are logo↔nav 32px and nav↔CTA 32px, both at 992 with the 10px scrollbar showing. Every label stays on one line.
  - The nav gap is now `gap-4 xl:gap-7` (was `gap-5 xl:gap-8`). The label↔chevron gap is `gap-2`: at `gap-1` the chevron's focus ring (2px, offset 2px) touched the label.
- **Escape order across overlays.** `ui/Dialog` marks its Escape `preventDefault()`, and the document-level Escape listeners (mobile menu, dropdowns) skip a prevented event. One Escape closes only the topmost layer. Escape on the mobile panel returns focus to the menu toggle; before this, focus fell to `<body>`.
- **The mobile nav panel carries `data-lenis-prevent`.** A paused Lenis still preventDefaults wheel events, so without the attribute the panel could not be wheel-scrolled. This was an existing bug.
- **The mobile nav panel closes itself in two more cases.** Both were existing bugs.
  - When the viewport crosses 992px (a `matchMedia` change listener). Before, CSS hid the panel and the toggle, but the page stayed scroll-locked with nothing on screen to release it; a tablet rotating to landscape did this.
  - When focus leaves the header, following DisclosureNav's rule: a null `relatedTarget` (window blur) and focus moving into an `aria-modal` dialog keep it open. Before, Tab past the CTA moved focus onto page links hidden behind the panel (WCAG 2.4.11).
  - → source: `components/sections/SiteHeader.tsx`.

- **Deep links from the retired NAV page.** `/nav-tracker?scheme=<id>` redirects (308) to `/sif/<id>` only when `<id>` is a scheme `id` in `schemes.json`; the alternation is built from that file at build time. Anything else falls through to `/sif-tracker#latest-navs`, so a typo is never a permanent redirect to a 404. This relies on `/sif/[id]` (W2-D) being keyed by the scheme `id` slug (`SifRow.id`), not the AMFI code.
  - → source: `next.config.ts`.

#### Floating and overlay chrome

- **WhatsApp float (PRD p.8).** A fixed bottom-right link on every route, in `z-[150]`: above content, below the header (200) and dialogs (1000).
  - Static, with no pulse, so the ban on perpetual animation holds.
  - Uses `glass-inverse` rather than WhatsApp green. This keeps to tokens only, and the dark lens stays legible over any backdrop. It is the first shipped use of `glass-inverse`.
  - It is lifted by the CSS variable `--float-offset` (default 1.25rem) plus the safe-area insets.
  - Hidden in print. The footer's bottom padding grew to `pb-28` so the button never covers the bottom-bar links.
  - Its accessible name and title say "(opens in a new tab)", like every other `target="_blank"` link.
  - → source: `components/WhatsAppButton.tsx`.
- **Shared page scroll lock.** Dialogs and the mobile menu now share one counted lock: html `overflow:hidden`, plus `scrollbar-gutter: stable` when a scrollbar exists, plus a Lenis pause. Because it is counted, nested overlays compose.
  - → source: `components/ui/scroll-lock.ts`.
- **Dialog.** Every modal uses one component: portal to `<body>`, `z-[1000]`, focus trap, Escape, backdrop click, `aria-modal`/`aria-labelledby`, focus returned to the opener, `DUR.ui` in and `EXIT` out.
  - The backdrop is the token `bg-ink/55` instead of the inline oklch in the tracker's CompareDialog.
  - Size `media` is capped by height as well as width: `min(1180px, (92dvh − chrome) × 16/9)`, with the header, the one caption row and the borders as the chrome, and the title clamped to two lines. The whole 16:9 player, including YouTube's control bar, then stays inside the panel. Measured against `next start`, nothing of the frame is cut off at 1280×720, 1366×657, 1440×789, 1920×960, 1024×768, 768×1024, 390×844, 844×390 or 568×320. Before, 79–138px of it was cut off on laptop screens.
  - → source: `components/ui/Dialog.tsx`.

#### Media

- **YouTube embeds (click-to-load).** CSP `frame-src` changes from `'none'` to exactly `https://www.youtube-nocookie.com`; nothing else was loosened.
  - The iframe exists only while the video dialog is open.
  - Thumbnails stay on `img.youtube.com` through a plain `<img>`. This is the sanctioned second `no-img-element` exception, now living in `components/video/VideoCard.tsx`, which replaces the one in `app/media/page.tsx`.
  - Known limit: while focus is inside the cross-origin player, Escape goes to the player, not the dialog.
  - → source: `components/video/*`, `next.config.ts`.
- **Share card is generated.** `app/opengraph-image.tsx` (next/og, Geist, token colours resolved to hex) replaces the PNG, which had the retired tagline baked into its pixels.
  - `/opengraph-image.png` is **rewritten** (not redirected) to the generated card. This keeps working the page modules that name that path and every share already cached by WhatsApp, LinkedIn and X.
  - → source: `next.config.ts` `rewrites()`.

#### Tokens (`app/globals.css`)

- **Heat tokens.** `--color-heat-pos-1..4` (hue 152), `--color-heat-neg-1..4` (hue 26) and `--color-heat-na`. Each grade is paired with a text colour:
  - grades 1–2 use `text-ink`;
  - grades 3–4 use `text-surface` (white);
  - N/A uses `text-muted`.
  - Every pair is ≥ 4.5:1: the lowest is pos-3 at 4.78, and N/A is 4.62. Ratios were computed from oklch and re-sampled in Chromium; they are recorded beside the tokens.
  - Colour is never the only signal, because cells print the signed %.
  - The heat and series blocks are declared `@theme static`, so all 13 variables always ship. Tailwind v4 otherwise emits a theme variable only when a scanned file names it in full, and series-2 and heat grades 2–4 were missing from the built CSS. **Composing the variable is safe** (`var(--color-heat-pos-${grade})`, getComputedStyle for a canvas swatch). **Utility classes still are not**: `bg-heat-pos-3` is generated only if written out in full, so classes stay in literal lookup maps.
- **Series tokens.** `--color-series-1..4`: accent, ink, violet (h300), ochre (h70). They are kept off the gain and loss hues.
  - Line contrast is ≥ 3:1 on ground, surface and surface-2.
  - **Series 4 (ochre) is a line colour only** (3.55–4.04:1), so its direct label is set in ink.
- **`.asof` synthesised italic.** 13px/20px, `--color-muted`, `font-style: italic` synthesised on Geist (Geist has no italic face), with tabular digits.
  - This is a deliberate exception to "all figures use `.tabular`": a mono date inside an italic sentence reads as code.
  - It is in `@layer components`, so utilities can override it.
  - → used by `components/ui/AsOf.tsx`.

#### Brand marks

- **Colour marks at rest.** `<AmcMark>` gains `tone`:
  - `"colour"` is the new default: native colours, always (PRD p.4/p.12: marks "adopt clearly to the color of the respective brands").
  - `"hover-reveal"` is the old greyscale-until-hover behaviour.
  - The legacy `hover` prop still maps to `"hover-reveal"`, so existing callers look unchanged until their owners switch.
  - New size `xl` (`h-20 w-[184px]`).
  - The unreached null-logo lockup now renders in ink. It used to be `text-ground/80` on a white tile, which made it invisible.
  - → source: `components/AmcMark.tsx`.

#### Footer and copy

- **The footer disclaimer is split.** The footer carries the PRD's short disclaimer verbatim (`SITE.disclaimerShort`) and a "Read the full disclaimer" link to `/disclaimer`.
  - The long, partly derived disclaimer (the `stats.disclosedCount` "we hold no document yet" clause and the data-provenance sentences) moves to `/disclaimer`, which W2-F owns.
  - The footer no longer imports `@/lib/data`.
  - The contract text in §5 ("The footer disclaimer is owned by SiteFooter, and parts of it are DERIVED") needs rewriting to match.
  - `SITE.disclaimerShort` duplicates `FOOTER_DISCLAIMER_SHORT` in `lib/compliance.ts` (F1). It is byte-identical today, but `lib/compliance.ts` is not on this branch, so the footer cannot import it yet. **Integration step:** delete `SITE.disclaimerShort`, have `SiteFooter` import `FOOTER_DISCLAIMER_SHORT` from `@/lib/compliance` (client-safe under spec rule 7), and add a test in `tests/` that the rendered footer string equals the compliance constant. Otherwise a wording change that compliance makes in `lib/compliance.ts` never reaches the footer.
- **Footer layout (PRD pp.18–20).**
  - Four unequal columns: SIF Insight · Quick Links · Contact Us · Legal & Policies.
  - Below them: a regulatory row (Platizio Services LLP, ARN line, the SEBI SIF circular and the AMFI SIF portal, both still required by §5), the short disclaimer, and the bottom bar "© {year} SIF Insight by Platizio Services LLP. All Rights Reserved." with Terms | Privacy | Disclaimer.
  - The legal pages get real hrefs even though they are built in W2. This retires the "unpublished destinations render as titled text" rule.
- **Distributor voice in `ConsultCta`.** The default body no longer promises to "map" goals "to the SIFs that fit", which is a suitability call. The default label and href now come from `PRIMARY_CTA`.

#### Constants

- **The `www` origin is centralised.** `SITE.origin = "https://www.sifinsight.com"` in `lib/site.ts` is now the one place it is written.
  - Layout, sitemap and robots read it.
  - `app/amc/[id]/page.tsx` (owned by W2-D) still declares its own `ORIGIN` and should switch to `SITE.origin`.
- **Canonical contact details.** `sifinsights@gmail.com`, +91 92055 23100, `wa.me/919205523100` with the PRD prefill, the Noida office address, and socials (YouTube, Instagram, X; LinkedIn and Facebook are `null` until supplied and are then skipped everywhere). They come only from `lib/site.ts`.
  - `info@sifinsight.com` no longer appears in any file F2 owns.

#### Primitives

- **`ActionButton`** in `components/primitives.tsx` is a `<button type="button">` with the same glass variants as `<Button>` and no arrow, since the arrow means navigation.
  - Disabled drops the glass rather than dimming it.

### 9.3 Home

- **Home order (PRD p.16):** Hero → AmcMarquee → WhatIsSif → VideoLibrary → WhyUs → ClosingCta. CategoryComparison, NavBoard, StrategyGrid, NumbersBand, TrustLoop and Faq are no longer on `/`. Their files stay, because other routes use them. → `app/page.tsx`
- **Hero carries no market figures.** The AMC and strategy counts and the NAV date are gone (PRD p.4). The hero closes on `SITE.trustLine` instead: three `<strong>` labels separated by hairlines. The eyebrow is the brand line `SITE.name`. The swap word is "Understand", and the H1 still runs at delay 0. The banner uses `preload` + `loading="eager"` (not `priority`). → `components/sections/HeroClient.tsx`
- **ClosingCta no longer repeats the hero headline word for word.** The old rule ("the hero headline returns verbatim") is retired. The new headline is "Have questions about SIFs? *Speak* with our team." The site still has exactly two `em.swap`. The primary CTA is `PRIMARY_CTA` (/contact); WhatsApp (`whatsappHref()`) is the secondary; email and phone come from `SITE`. The section id is now `consultation`; `#consult` stays reserved for `ConsultCta` on interior pages. → `components/sections/ClosingCta.tsx`
- **AMC marquee:** runs at 23 px/s (the ceiling stays 40). Marks are `size="xl"` in `tone="colour"` (brand colours at rest, no grayscale hover-reveal), per PRD p.4/p.12. Each item links to `/amc/{id}`. The heading is "SIFs We Offer". → `components/sections/AmcMarqueeClient.tsx`
- **Carousel pattern (new):** the carousel is driven by buttons. The track translates, and the page never scrolls sideways or captures the wheel. A touch swipe moves it too, with `touch-action: pan-y`. Cards outside the window are `inert`. An `aria-live` line reports the position ("Videos 1–3 of 4"). It shows 1 card per view below md, 2 from md, and 3 from lg. With fewer than 2 featured videos it becomes a static grid. The island is `VideoLibraryClient.tsx`, split from its server wrapper. → `components/sections/VideoLibrary*.tsx`
- **Home section ids:** `#amcs`, `#what-is-sif`, `#videos`, `#why-sif-insight`, `#consultation`. Nothing in the chrome links to them.

### 9.4 SIF Tracker

For the integrator to fold into `DESIGN_CONTRACT.md` and the spec. Each item names the file that owns it.

#### Copy and missing values

- **The eyebrow and the H1 are both "SIF Tracker".** The PRD (p.22) names the page heading, and the brief fixes the eyebrow. → `app/sif-tracker/page.tsx`.
- **"Not announced" is a fourth missing-value text, for upcoming NFO dates only.** An announced SIF with no stated window is not "Not captured": the AMC has not published a date, so there is nothing for us to capture. A gap in an *open* offer's record still says "Not captured". → `components/tracker/NfoList.tsx`.
- **Benchmark Return renders "Not captured" on every Top 5 row.** `SifRow` has no benchmark returns yet. The column stays because the PRD lists it (p.25). The tooltip names the benchmark. → `components/tracker/TopPerformers.tsx`.
- **An AUM strategy with no SIF filed says "Not applicable"; one with SIFs but no figure for the month says "Not captured".** Neither gets a bar. An empty track next to a strategy that holds money would read as zero. → `components/tracker/AumIntelligence.tsx`.

#### Layout and visuals

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

#### Data and derivation

- **The NFO clock never runs behind the build.** `useNfoToday` takes the later of the reader's Indian date and `navLastUpdated`. On the hydrating render it prints the server-formatted date label, so ICU "Sep"/"Sept" differences cannot cause a mismatch. → `components/tracker/NfoClock.ts`.
- **Only open and upcoming offers are shipped to the islands.** An offer closed on the build date cannot reopen on a later date. → `components/tracker/data.ts`.
- **Heatmap legend edges are a copy of spec §9** (`HEAT_EDGES` in `components/tracker/model.ts`), because `lib/format.ts` keeps its bounds private.

### 9.5 SIF Screener

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

### 9.6 Compare

For the integrator to fold into `DESIGN_CONTRACT.md` / the shared spec.

#### Design contract

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

#### Data / compliance

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

#### Requested shared-file changes

- `lib/screener/fields.ts` (F1): give `mdd` a compare note with magnitude
  semantics, e.g. `compare: { section: "risk", note: "lowest", by: "magnitude" }`.
  Compare can then drop its local override.
- Portfolio exposure: `portfolio.json` has no loader. Once F1 adds one and
  live `portfolio` fields, Compare renders them automatically: it reads
  `FIELDS` with `compare.section === "portfolio"`.

### 9.7 Individual SIF page and AMC pages

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

### 9.8 Learn, About, legal pages and methodology

- **Legal layout (`components/legal/LegalDocument.tsx`)**: /terms, /disclaimer, /regulatory-disclosures and /methodology share one layout — numbered clauses at 68ch, a sticky anchor TOC on `lg+` (static above the clauses on mobile), "Last updated" under the TOC (`LEGAL_UPDATED`, 2026-09-23). Clause `aliases` give extra anchor ids (e.g. `#drawdown` → `#max-drawdown`, `#planned` → `#not-yet-calculated`).
- **/methodology anchors**: every `methodology` anchor in `lib/screener/fields.ts` resolves (`#sources #face-value #returns #monthly-returns #inception #volatility #max-drawdown #risk-band #benchmarks #aum #ter #exit-load #liquidity #heatmap #missing-values #not-yet-calculated`) plus aliases `#drawdown #planned #one-day-change`.
- **Heatmap bounds are restated on /methodology** (0.25/1/2.5 and 1/3/7). Request: F1 exports the bounds from `lib/format.ts` so the page reads them.
- **/about Vision & Mission**: the section label (eyebrow style) is the `h2`; the statement is set at 22–28px. Icon cards use a square hairline chip (not `rounded-full`, since it is not interactive).
- **/about #connect** is a ConsultCta-shaped panel with three actions (Book a Consultation / WhatsApp Us / Email Us); the two off-site actions are `<a>` pills with the same glass classes as `<Button>`.
- **/learn**: the Learn sub-nav is read from `PRIMARY_NAV` so it cannot drift from the header dropdown. Every hub section (`#videos #experts #articles #faqs`) always renders; empty states are one line plus a real link.
- **Faq** takes props (`items, id, eyebrow, lines, intro, cta`); defaults keep the home page unchanged; CTA default is `/contact` (was `#consult`).

### 9.9 Leads, consultation and privacy

- Lead delivery is Resend (REST, no SDK) configured by env: `RESEND_API_KEY`, `LEAD_FROM_EMAIL` (required), `LEAD_TO_EMAIL` (optional, defaults to `SITE.email`). Missing ⇒ forms render an honest "not sent" state with direct channels. `.env.example` (F2) should list these three.
- `server-only` is not installed and new deps are out of scope, so `lib/leads/deliver.ts` guards with a runtime `typeof window` throw; it is imported only from `lib/leads/actions.ts`.
- The rate limit (`lib/leads/rate-limit.ts`) is per-instance and not durable; a shared counter or edge WAF rule is the durable control.
- Two sessionStorage keys are sanctioned site-wide: `sif:lead-popup:v1`, `sif:lead:sent` (disclosed on /privacy, names imported from `lib/leads/schema`).
- /privacy states a 24-month retention period and DPDP Act 2023 consent basis — operator to confirm.
- TrustLoop now lives on /contact ("How we work"); remove it from `app/page.tsx` and mount `<LeadPopup />` there (integrator).
