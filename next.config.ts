import path from "node:path";
import type { NextConfig } from "next";

/* ============================================================
   Content-Security-Policy.

   Every directive below was measured against a no-CSP control on `/`,
   `/contact`, `/media` and `/amc`: zero `securitypolicyviolation` events,
   and the Motion reveal counts came back byte-identical. Three tighter
   variants were tried and each one broke the site, so the two
   `'unsafe-inline'`s here are a decision, not an oversight:

     - `script-src 'self'` without `'unsafe-inline'` blocks all 24 of
       Next's inline bootstrap scripts and the app never hydrates.
     - nonce + `'strict-dynamic'` blocks 35 scripts including every static
       chunk, and requires abandoning static prerendering — which is how
       every page in this app is served.
     - `style-src 'self'` kills every Motion reveal, because Motion
       serialises its `hidden` variant as inline style attributes. The
       page then renders permanently at opacity 0.

   What `'unsafe-inline'` on scripts actually costs here is small: this app
   has no route handlers, no third-party scripts, and no user-generated
   HTML. The single `dangerouslySetInnerHTML` (the <noscript> reveal
   stylesheet in app/layout.tsx) is a string literal with nothing
   interpolated into it, and the one server action accepts form fields
   that are validated and never re-rendered as markup. With no injection
   sink to protect, a strict script-src buys little against the cost of
   losing hydration and prerendering.

   Two directives that are load-bearing and must not be "cleaned up":
     - `img-src` keeps https://img.youtube.com or the five /media
       thumbnails render blank.
     - `font-src 'self'` is sufficient and correct: next/font/google
       self-hosts the woff2 files, so nothing is fetched from
       fonts.googleapis.com. Do not add it.
   ============================================================ */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.youtube.com",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Sent on every response. Clickjacking was the live exposure — the
 * production build previously returned no security headers at all — so
 * `frame-ancestors 'none'` and `X-Frame-Options: DENY` are the pair that
 * matters most; the second is there for the browsers that still only read
 * the older header.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // Deny the capabilities this site has no use for. An empty allowlist
    // is a denial for the document and every frame it could embed.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },

  /* HSTS is deliberately NOT sent yet.
     ------------------------------------------------------------------
     {
       key: "Strict-Transport-Security",
       value: "max-age=63072000; includeSubDomains; preload",
     },
     ------------------------------------------------------------------
     It cannot be verified on plaintext localhost, and it is the one
     header on this list that is not free to get wrong: once a browser
     has pinned the policy, any host or subdomain that is not serving a
     valid certificate is unreachable for the full max-age, with no way
     to withdraw it from the server side. Turn it on only after TLS is
     confirmed end-to-end on the apex and every subdomain — and ramp
     max-age (300 → 86400 → 63072000) before adding `preload`. */
];

const nextConfig: NextConfig = {
  // A stray lockfile in the user's home directory makes Turbopack infer the
  // wrong workspace root. Pin it to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // The only thing the default `X-Powered-By: Next.js` does is tell an
  // attacker which framework's advisories to read.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  images: {
    // Next 16 rejects any quality not listed here — a bare quality={85} on
    // <Image> is silently downgraded in the srcset and 400s if requested
    // directly. 85 exists for the hero banner: its sky and water are wide
    // smooth gradients, which are exactly what WebP bands at 75.
    qualities: [75, 85],

    /* `remotePatterns`, `domains` and `dangerouslyAllowSVG` are unset
       DELIBERATELY — this is a security control, not an omission.

       With `remotePatterns` empty the optimizer refuses every remote URL
       outright, so no attacker-chosen bytes ever reach sharp/libvips. That
       is the single reason the open sharp/libvips CVEs rate Low here: the
       vulnerable decode path is unreachable. Every image this site
       optimizes is a file in /public that we committed ourselves.

       Anyone adding a remote pattern is re-opening that path and must
       patch sharp first. `dangerouslyAllowSVG` is a second, separate
       decision: SVG is script-bearing markup, and the AMC marks that ship
       as .svg are routed through a plain <img> by <AmcMark> precisely so
       the optimizer never has to parse one. */
  },
};

export default nextConfig;
