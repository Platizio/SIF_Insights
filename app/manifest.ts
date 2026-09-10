import type { MetadataRoute } from "next";
import { stats } from "@/lib/data";

/* ============================================================
   /manifest.webmanifest

   What this is for, narrowly: a phone that adds the site to its home
   screen. Before it existed the only icon on the site was
   `app/favicon.ico`, which Android will scale into a home-screen tile and
   iOS will ignore entirely — iOS wants an `apple-touch-icon`, and without
   one it screenshots the page and uses that. A blurry crop of the hero is
   not a brand mark. `app/apple-icon.png` is the other half of this fix;
   Next emits its <link> from the file convention, so it needs no entry here.

   This is NOT a claim to be an installable app. `display: "browser"`
   deliberately, not "standalone": every page here is a document — a
   disclosure table, a NAV series, a privacy notice — and stripping the
   URL bar off a financial-services site hides the one control a reader
   has for checking they are on sifinsight.com and not a lookalike. The
   manifest is here for the icon and the name, and claims nothing else.

   `description` interpolates the same counts every other surface does,
   for the reason set out in app/layout.tsx: an eighteenth house filing
   must never leave a stale "17" behind on a surface nothing turns red.

   THE COLOURS MUST TRACK app/layout.tsx. `theme_color` here and
   `viewport.themeColor` there are the same decision told to two different
   consumers, and #f9f6f1 is --color-ground (warm off-white paper) from
   app/globals.css resolved to sRGB. If the ground moves, all three move.
   ============================================================ */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIF Insight — India's SIF market, in full view",
    short_name: "SIF Insight",
    description: `Independent coverage of India's ${stats.strategyCount} Specialised Investment Fund schemes from all ${stats.amcCount} asset managers.`,
    start_url: "/",
    display: "browser",
    background_color: "#f9f6f1",
    theme_color: "#f9f6f1",
    lang: "en-IN",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      /* Separate file, not `purpose: "any maskable"` on the one above.
         A maskable icon is cropped to the launcher's shape — a circle on
         most Android skins — so it carries extra padding to keep the mark
         inside the 80% safe zone. Declaring one image as both means it is
         either clipped when used as maskable or floating in dead space
         when used as any. */
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
