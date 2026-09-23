import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/* ============================================================
   The site-wide share card, generated at build time.

   It replaced a hand-made PNG whose headline was baked into the pixels —
   "India's SIF market, in full view", the tagline the client's review
   retired. A picture of a sentence cannot be grepped for, so the old line
   outlived its removal from every text file. Drawn from code, the card's
   words sit in source next to lib/site.ts, where the next copy change will
   find them.

   Statically optimised: no request-time API is read, so Next renders this
   once at build and serves the PNG from the cache like the file it
   replaced.

   Colours are the design tokens resolved to sRGB, because Satori does not
   read CSS variables (and parses no oklch):
     ground #f9f6f1 (the value app/layout.tsx and the manifest already use),
     ink #111419, body #585c64, hairline #e0ddd7, accent #007475.
   The font is the Geist Regular that next/og bundles — the site's own sans,
   so the card matches the page without shipping a font file of our own.
   ============================================================ */

export const alt = "SIF Insight — Understand and invest in SIFs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GROUND = "#f9f6f1";
const INK = "#111419";
const BODY = "#585c64";
const HAIRLINE = "#e0ddd7";
const ACCENT = "#007475";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GROUND,
          padding: "84px 88px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 14, height: 44, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 44, color: INK, letterSpacing: -0.5 }}>
            <span>SIF</span>
            <span style={{ color: ACCENT, marginLeft: 12 }}>Insight</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Hand-split, like every headline on the site: left to wrap, the
              line broke before "SIFs" and stranded the one word that says
              what the card is about. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 88,
              lineHeight: 1.06,
              color: INK,
              letterSpacing: -2,
            }}
          >
            <span>Understand and</span>
            <span>invest in SIFs</span>
          </div>
          <div style={{ marginTop: 36, height: 1, width: "100%", background: HAIRLINE }} />
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              lineHeight: 1.45,
              color: BODY,
              maxWidth: 940,
            }}
          >
            {SITE.tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: ACCENT }}>
          sifinsight.com
        </div>
      </div>
    ),
    { ...size },
  );
}
