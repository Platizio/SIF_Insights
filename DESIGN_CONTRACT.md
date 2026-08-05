# LEDGER — Design Contract

**Every section agent MUST read this file completely before writing code.** It is the single source of truth. Do not invent values outside it.

Project: `C:\Users\pc\Desktop\SIF_V2\sif-v2-web`
Stack: Next.js 16 (App Router, RSC) · React 19 · TypeScript strict · Tailwind v4 (`@theme`) · Motion v12 (`motion/react`) · Lenis · Radix.

---

## 0. The brief in one line

**A warm-paper editorial research house — alive, tactile, and composed.** Off-white paper ground, near-black ink, structure in hairlines, data in tabular mono. It should read as the place the numbers live — but it must feel *authored and animated*, not like a static document.

> ### ⚠️ REVISION 2 — read this before anything else
> The first build was judged **too flat, too static, and too dark**. It was technically compliant and visually inert: flat boxes that faded up 32px, nothing to engage with. Three things changed:
>
> 1. **The canvas is now LIGHT (warm paper), not dark.** Every colour token below has been re-tuned. Do not carry over dark-theme assumptions.
> 2. **The logo NEVER sits on a plate/chip again.** On the light ground it sits natively. Removing that white box is an explicit client instruction.
> 3. **Motion is now a first-class requirement, not a garnish.** Rich scroll choreography, per-word text reveals, pointer interaction, number roll-ups and a real WebGL hero moment. "Restraint" is no longer the goal — *finesse and character* are. See §8.

---

## 1. HARD RULES — violating any of these fails review

1. **No `box-shadow`** on content surfaces. Elevation = surface tint change + 1px hairline.
2. **No blur** on content surfaces. No `filter: blur()`, no decorative glowing orbs.

> **EXCEPTION — interactive surfaces are tinted translucent glass.** Client instruction, revision 3. Buttons and filter pills use the `.glass` + `.glass-primary` / `.glass-ghost` / `.glass-inverse` / `.glass-active` classes in `globals.css`: a translucent tint, `backdrop-filter: blur(14px) saturate(170%)`, a hairline border and an inset top highlight (the highlight is what reads as glass rather than as a flat tint). This is scoped to interactive elements ONLY — **content cards, panels and tiles stay flat with hairlines.**
>
> Two implementation traps, both hit and fixed — do not reintroduce:
> - **Never hand-write `-webkit-backdrop-filter`.** Lightning CSS collapses the pair and emits *only* the prefixed form, leaving the unprefixed property unset in Chrome so no blur renders. Declare `backdrop-filter` once and let the compiler prefix it.
> - Glass tints change the effective backdrop, so **re-check text contrast against the composited colour**, not against the page ground.
3. **No gradients** except the one photographic texture band (section 7 only).
4. **`border-hairline` is the ONLY border colour.**
5. **Radius is semantic:**
   - `rounded-full` (999px) → interactive only: buttons, pills, badges, avatars, icon buttons
   - `rounded-none` (0) → ALL content containers: every card, every tile, every panel
   - `160px`–`400px` on **exactly one corner** → decorative arc, tint/media tiles only. Other three corners stay 0.
   - Nothing else. No `rounded-lg`, no `rounded-xl`, no `rounded-2xl`.
6. **No zebra striping.** Rows separate by hairline.
7. **Max 4 type sizes per section.** Hierarchy via colour and weight, not more sizes.
8. **Asymmetric grids only.** Never 50/50.
9. **Section rhythm is `py-[100px]`** — use the `<Section>` primitive.
10. **One easing curve everywhere:** `cubic-bezier(0.23, 1, 0.32, 1)`. Two durations: 200ms micro, 700ms reveal.
11. **Reveals move on Y (32px). Hover moves on X.** Never mix the axes.
12. **Content must be readable with JS disabled.** Never set `opacity: 0` in CSS and rely on JS to reveal it.
13. **No fabricated data.** Every number traces to `@/lib/data`. If data is missing, render the honest empty state.
14. **Focus via `outline`**, never `box-shadow`. Already global.
15. `prefers-reduced-motion` is handled globally — do not add per-component guards, but never build a component whose meaning depends on motion.

### Banned (these are the OLD site's tropes — their presence means the redesign failed)
`#336693` · `#C2A057` · Montserrat · gold headings · blurred orbs · `bg-gradient-dark` · body text tinted with a brand hue · success and primary sharing a colour · perpetually animating icons · mixed arbitrary corner radii.

---

## 2. Tokens — Tailwind v4 classes (already defined in `app/globals.css`)

### Colour
| Class | Role |
|---|---|
| `bg-ground` | page background |
| `bg-surface` | raised panel |
| `bg-surface-2` | nested panel / table row |
| `border-hairline` | **the only border** |
| `bg-chip` / `text-chip` | light plate (logo, inverse blocks) |
| `text-ink` | headings |
| `text-body` | paragraphs |
| `text-muted` | meta, captions, disclaimers |
| `text-accent` / `bg-accent` | eyebrows, primary CTA, live indicators (cool aqua) |
| `bg-accent-dim` | hover/pressed |
| `bg-accent-wash` | tinted surface |
| `text-gain` / `bg-gain` | NAV up |
| `text-loss` / `bg-loss` | NAV down |
| `text-flat` | unchanged |
| `text-pending` | awaiting launch |
| `bg-risk-1` … `bg-risk-5` | risk ramp, low → high |

### Type scale (rendered @1440px — use `clamp()` for fluid)
| Element | Size / leading | Weight | Colour |
|---|---|---|---|
| H1 | 68px / 90px | 500 | `text-ink` |
| H2 | 64px / 72px | 500 | `text-ink` |
| H3 | 40px / 58px | 500 | `text-ink` |
| Stat numeral | 72px / 80px | 500 | `text-ink` |
| Card title | 22px / 30px | 500 | `text-ink` |
| Body | 17px / 30px | 400 | `text-body` |
| Small meta | 14px / 20px | 400 | `text-muted` |
| Eyebrow | 12px / 14px, `+0.08em`, UPPERCASE | 600 | `text-accent` |

**Heading leading ~1.2, body leading ~1.76.** That contrast is load-bearing — never compress body leading to 1.5.

Fonts are wired as CSS vars: `font-sans` (Geist) · `font-mono` (Geist Mono) · `font-serif` (Instrument Serif Italic).

- **All figures** (NAV, ratios, minimums, dates, percentages) use the `.tabular` class — mono + `tabular-nums`. Columns must align.
- **The serif-italic word swap:** `<em className="swap">word</em>`. **Exactly one word per display headline.** Used in the Hero H1 and repeated once in the Closing CTA. **Nowhere else on the page.**

### Spacing / layout
4px base grid; macro tier 80 / 100 / 120. Container 1240px (`<Shell>`).
Named grids: hero `552px 80px 608px` · features `420px 16px 804px` · FAQ `460px 120px 660px` · thirds `3 × 402.66px gap 16px`.

---

## 3. Primitives — import from `@/components/primitives`

```tsx
<Shell>          // 1240px container, correct gutters
<Section id>     // py-[100px] + scroll-mt
<Reveal delay>   // opacity 0→1, y 32→0, once, at 30% in view
<Stagger>        // staggers children 100ms in reading order
<StaggerItem>    // child of <Stagger>
<Eyebrow>        // 12px uppercase accent label
<Button href variant="primary|ghost|inverse">  // pill + X-sliding arrow
<Delta pct size="sm|lg" />   // ▲/▼ + signed % + gain/loss colour
<RiskBand band={1..5} />     // 5-pip ramp + "Band N" label
<PendingBadge />             // honest "Awaiting launch"
<Card>           // sharp-cornered, hairline, surface. NO shadow.
```

Motion tokens: `import { reveal, stagger, VIEWPORT, EASE, DUR_MICRO, DUR_REVEAL } from "@/lib/motion"`
Class merge: `import { cn } from "@/lib/cn"`

---

## 4. Data — import from `@/lib/data`

```ts
amcs: Amc[]                      // 8. { id, name, sifName, description, logo }
strategies: Strategy[]           // 13
strategiesByCategory             // { equity: 7, hybrid: 6, debt: 0 }
getNav(id): NavQuote             // { status:'live', today, yesterday, change, changePct } | { status:'pending' }
liveQuotesByMove()               // live only, biggest absolute % move first
navLastUpdated: string           // "2026-05-07"
activeNfos: Nfo[]                // 3
faqs: Faq[]                      // 5
stats                            // { amcCount:8, strategyCount:13, equityCount:7, hybridCount:6,
                                 //   debtCount:0, liveNavCount:8, minInvestment:1000000,
                                 //   maxUnhedgedShortPct:25 }
formatInr(n, {compact})  formatNav(n)  formatPct(n)
riskBandNumber("Risk Band 5") -> 5
formatUpdated(iso)
```

`Strategy` fields: `id, amcId, name, category, type, amfiSchemeCode, overview, minInvestment (number, 1000000), expenseRatio (number, 2.25), exitLoad, riskBand ("Risk Band 5"), benchmark, redemptionFrequency, taxation, dividend`.

### Data truths you must honour
- **8 of 13 funds have live NAV. 5 are `null`** → render `<PendingBadge />`, never a fake number.
- **`iti-equity` NAV is ₹948.29 — ~1000× every other fund.** Never put absolute NAVs on a shared axis or bar scale. Compare by **percentage change** only.
- **Debt category is genuinely empty** → "Launching soon", not a hidden tab.
- Risk bands really vary: most are Band 5, but `edelweiss-hybrid` and `sbi-hybrid` are Band 1, `bandhan-hybrid` is Band 2. Don't flatten this — the variation is the interesting part.
- AMC logos are at `/amc/{id}.png` (already resolved on the `Amc` object as `.logo`). They are colourful PNGs on transparent — render them at a **consistent ~28px optical height**, and desaturate/normalise them (`grayscale` + `opacity`, lifting on hover) so the strip reads as one typographic rule, not a sponsor page.

---

## 5. Compliance — non-negotiable copy

- SIF Insight is a **distributor**, not an advisor or AMC. Copy stays in "discover / learn / compare / consult". **No advice, no guaranteed returns, no performance promises.**
- Whenever NAV appears: *NAV data fetched from AMFI. Updated daily.* plus the `navLastUpdated` date.
- Any fund card must carry **risk band, exit load, expense ratio and minimum investment** — that is the material disclosure, not decoration.
- Footer disclaimer verbatim (Footer agent owns this):
  > **Disclaimer:** The content shared on this website is prepared using information currently available in the public domain, primarily through news reports and secondary sources. At present, the official documents and disclosures from Asset Management Companies (AMCs) regarding the particulars of Specialized Investment Funds (SIFs) are still awaited.
- Footer must link the SEBI circular (`https://www.sebi.gov.in/legal/circulars/feb-2025/regulatory-framework-for-specialized-investment-funds-sif-_92299.html`) and the AMFI SIF Portal (`https://www.amfiindia.com/sif`).

---

## 6. Accessibility

- Contrast ≥ 4.5:1 body, ≥ 3:1 large display.
- Gain/loss never colour-alone — always ▲/▼ + sign (the `<Delta>` primitive does this).
- Risk bands carry a numeric label.
- Radix for the accordion; real `aria-expanded` / `aria-controls`.
- Marquees pause on hover (`.marquee-host` + `.marquee-track` classes already exist) and stop under reduced motion.
- Every interactive element keyboard reachable, visible focus ring.
- Decorative SVG gets `aria-hidden="true"`.

---

## 8. MOTION — revision 2 (this is the heart of the rebuild)

Import everything from `@/lib/motion` and `@/components/motion/*`. **Never hand-roll durations or curves.**

### 8.1 The old system is dead
`opacity 0 → 1, y 32px` on every element is **banned**. It is the specific failure that made build one feel inert — arbitrary travel through empty space, applied uniformly, which reads as "no decision was made".

### 8.2 Tokens
```ts
EASE.out      [0.22, 1, 0.36, 1]   // editorial reveal — the workhorse
EASE.outExpo  [0.16, 1, 0.30, 1]   // hero, big travel, image wipes
EASE.outQuart [0.25, 1, 0.50, 1]   // UI state
DUR.micro .14 · ui .26 · reveal .72 · line .85 · wipe .95 · rule .70 · hero 1.10 · odometer 1.4
EXIT 0.15                          // exits are ALWAYS faster than entrances
SPRING.cursor / SPRING.card
```

### 8.3 The four techniques that rebuild the tier
| Use | Component | Spec |
|---|---|---|
| **Headlines** | `<LineReveal lines={[...]} as="h2">` | masked lines, `y 100% → 0`, 0.85s, stagger 0.07. **No opacity on the inner span** — the mask does the work |
| **Hairlines** | `<Rule />` | `scaleX 0 → 1`, origin-left, 0.70s. On warm paper *the rules are the design* |
| **Images/media** | `<Wipe>` | `clip-path inset(0 0 100% 0) → 0`, 0.95s, inner counter-translates `y 8% → 0`, `scale 1.06 → 1` |
| **Figures** | `<Odometer value={n} />` | fixed-slot digit columns, 1.4s, per-digit delay `0.045 × indexFromRight` |

Blocks use `<Rise>` (**14px**, not 32). Table rows use `<RowItem>` (**8px**). Cap any stagger near **10 items**.

### 8.4 Interaction
- `<Magnetic>` on primary CTAs — pull 0.28, cap 10px, inner label at 0.45×. **No custom cursor** (reads as agency portfolio; costs credibility with investors).
- `<TiltCard>` on fund cards — **max 4.5°**, perspective 1400px, warm amber follow-highlight. Never white glow: invisible on cream, reads as a rendering bug.
- Popovers/accordions: origin-anchored, enter 0.22s, **exit 0.15s**.

### 8.5 Data motion — the credibility layer
- `<DrawnPath>` for every NAV/chart line: `pathLength 0 → 1`, **eased tween, never a spring**. Overshoot on a data line implies the value was briefly wrong. *Springs are for objects; quantities get tweens.*
- `<Odometer>` fires **once, lands on the real value, and stops**. It must never loop or idle-tick — a figure that keeps moving implies live data, which for SIF disclosure is a compliance problem, not a style choice. Always pair with the as-of date.

### 8.6 Parallax — substrate only
Rate ladder: substrate `0.06` · watermark `0.12` · framed image `0.18` · card `0.03` · **body copy, tables and charts `0`, always**. Use `<Parallax rate={PARALLAX.substrate}>`.

### 8.7 WebGL
`<HeroCanvas />` renders the **Yield Surface** — fBm contour isolines, ink on paper, cursor-perturbed, Bayer-dithered. Poster-first: a static CSS field owns first paint, the canvas mounts only after it is in view + idle + the device passes capability gates, then cross-fades over 900ms. **LCP is never deferred.** Under reduced motion the canvas mounts **frozen** at a fixed seed — we freeze it, we do not remove it.

### 8.8 Load choreography (hero only, ~1.1s)
Hero headline line 1 starts at **delay 0** — Chrome ignores `opacity: 0` elements for LCP, so a staggered hero would directly regress it. All luxurious pacing goes to non-LCP elements: standfirst 240ms, CTA row 420ms, bento tiles 550ms+ entering from four directions at 300ms intervals.

### 8.9 Banned motion
Ticking/looping numbers · text scramble/glitch · custom cursors · scroll-hijack or horizontal scroll · percentage preloaders · 3D coins/cards/globes · marquees faster than ~40px/s · confetti · card tilt above 8° · parallax on content · glow/bloom/glassmorphism (dark-bg idioms; they vanish or look broken on cream) · animating `box-shadow`/`width`/`height`/`top`/`left` · springs on any value representing a quantity · sound.

---

## 7. Conventions

- Server Components by default. Add `"use client"` **only** where hooks/interactivity genuinely require it.
- One section per file in `components/sections/`, named export matching the filename.
- Sections take **no props** — they import their own data from `@/lib/data`. This keeps `page.tsx` a clean list.
- Use `next/image` for the logo and AMC logos, with explicit `width`/`height` (CLS).
- Comment density: match the primitives file — brief comments only where intent isn't obvious from the code.
- TypeScript strict. No `any`. `npx tsc --noEmit` must pass.
