"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Magnetic } from "@/components/motion/Magnetic";
import { Button, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { pauseSmoothScroll, resumeSmoothScroll } from "@/lib/smooth-scroll-control";

/**
 * Sticky navigation.
 *
 * No border and no shadow at rest — the header separates from content by
 * whitespace alone. It is opaque `bg-ground`, so scrolled content passes
 * cleanly beneath it; past ~40px a single hairline fades in to ground it.
 */

/* Real routes now, not homepage anchors. The old site's URLs are preserved
   exactly so inbound links and rankings survive the redesign. */
const NAV_LINKS = [
  { label: "What is a SIF", href: "/what-is-sif" },
  { label: "Strategies", href: "/strategies" },
  { label: "SIF Tracker", href: "/sif-tracker" },
  { label: "NAV", href: "/nav-tracker" },
  { label: "AMCs", href: "/amc" },
  { label: "Media", href: "/media" },
  { label: "About", href: "/about" },
] as const;

/** The nav collapses at 992px, which is between Tailwind's md and lg stops. */
const PANEL_ID = "site-nav-panel";

/** Scroll depth at which the header stops floating and gains its hairline. */
const GROUND_AT = 40;

const LINK_CLASS =
  "group text-[15px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [grounded, setGrounded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /* Scroll lock while the panel is open.

     The panel is pinned inside a `sticky` header, so without this the page
     scrolls underneath it: measured at 390px, a wheel of 600px moved the
     document from 0 to 599 while the panel sat still at top:53. The menu
     ends up floating over content it has no relationship to.

     It has to be a CSS lock on the root, not `lenis.stop()`. Lenis is
     configured with `smoothWheel` only and no `syncTouch`, so TOUCH scrolling
     — the only kind that matters for a menu that exists below 992px — never
     passes through Lenis at all and is untouched by stopping it.

     `overflow: hidden` goes on <html> rather than <body>: on <body> alone iOS
     Safari has historically kept scrolling anyway. The previous inline value
     is captured and restored rather than blanked, so this composes with
     anything else that touches it instead of clobbering it.

     And the CSS lock is not sufficient by itself. `overflow: hidden` stops a
     user scrolling but not `scrollTop` being SET, which is exactly what Lenis
     does when it swallows a wheel event — with the lock alone, a 600px wheel
     still moved the document 599px. So the two calls cover two different
     inputs: the CSS for native touch on a phone, `pauseSmoothScroll` for
     Lenis-driven wheel on anything with a mouse under 992px. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    pauseSmoothScroll();
    return () => {
      root.style.overflow = previousOverflow;
      resumeSmoothScroll();
    };
  }, [open]);

  useEffect(() => {
    // Lenis scrolls the window for real, so the native event is authoritative.
    const onScroll = () => setGrounded(window.scrollY > GROUND_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Any link inside the panel — including the CTA — dismisses it. */
  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <motion.header
      /* data-reveal is load-bearing: Motion serialises `initial` into the
         server render, so without it the header ships as opacity:0 when
         scripting is off. The noscript rule in layout.tsx keys off this. */
      data-reveal=""
      initial={{ y: "-100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DUR.hero, ease: EASE.outQuart, delay: 0.2 }}
      className="sticky top-0 z-[200] bg-ground"
    >
      {/* 56/64px, down from 64/80. The header is sticky, so its height is
          rent charged against every screen of the site for the whole visit —
          on a 16:9 laptop the old 80px band took 7.4% of the viewport before
          any content. The logo and CTA shrink with it so the proportions
          hold rather than the row just getting tighter around them. */}
      <Shell className="grid h-14 grid-cols-[auto_1fr_auto] items-center min-[992px]:h-16">
        <Logo className="h-6 min-[992px]:h-7" />

        <nav
          aria-label="Primary"
          /* Seven items: the gap tightens at the 992px breakpoint so the row
             does not collide with the logo or the CTA, and opens up again
             once there is room for it. */
          className="hidden justify-self-center min-[992px]:flex min-[992px]:items-center min-[992px]:gap-5 xl:gap-8"
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Magnetic className="hidden justify-self-end min-[992px]:block">
          {/* Trimmed from the shared 15px/px-7/py-3.5 so the CTA sits inside a
              64px band with air around it. tailwind-merge resolves these
              against Button own classes, so this is an override, not a
              duplicate. */}
          <Button
            href="/contact"
            variant="primary"
            className="px-5 py-2.5 text-[14px]"
          >
            Book a consultation
          </Button>
        </Magnetic>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          /* An absolute 44px, not a rem step. h-10 measured 38px of real
             target and h-11 measured 41px — both under the 44px floor — and
             the reason h-11 misses is that app/globals.css sets the root to
             `clamp(15px, 1.1111vw, 19px)`, so 1rem is 15px at phone widths
             and Tailwind's 2.75rem resolves to 41.25px, not 44. Every rem
             utility on this site shrinks the same way; a touch target is one
             of the few things that must not, so it is stated in pixels.
             This is the only control on a phone that opens the nav. */
          className="col-start-3 inline-flex h-[44px] w-[44px] items-center justify-center justify-self-end rounded-full border border-hairline text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:bg-accent-wash min-[992px]:hidden"
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="m2 1 12 10M14 1 2 11"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M0 1.5h16M0 10.5h16"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </Shell>

      {/* Always rendered so `aria-controls` always resolves; `hidden` does the hiding. */}
      {/* `max-h`/`overflow-y-auto` so the panel is reachable on a short
          viewport — a landscape phone is ~375x400, and seven links plus the
          CTA do not fit. `overscroll-contain` keeps a scroll that reaches the
          panel's end from chaining to the document behind it. */}
      <div
        id={PANEL_ID}
        hidden={!open}
        className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-b border-hairline bg-surface min-[992px]:hidden"
      >
        <Shell>
          <nav aria-label="Primary, mobile" onClick={closeOnLink} className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                className="border-b border-hairline py-4"
              >
                {link.label}
              </NavLink>
            ))}
            <Button href="/contact" variant="primary" className="my-6 self-start">
              Book a consultation
            </Button>
          </nav>
        </Shell>
      </div>

      {/*
        The grounding hairline. It fades rather than slides so it never
        competes with the content moving underneath it — the point is that
        you notice the page has moved, not the rule itself.
      */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-hairline",
          "transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          grounded ? "opacity-100" : "opacity-0",
        )}
      />
    </motion.header>
  );
}

/**
 * Nav link with a hairline that wipes in from the left on hover.
 * scaleX on a child span, never a border toggle: a permanent underline
 * would turn the nav into five competing rules on a page whose whole
 * structure is already drawn in hairlines.
 */
function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  // Section-aware: /strategies/equity should still light "Strategies".
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(LINK_CLASS, active && "text-ink", className)}
    >
      <span className="relative inline-block">
        {children}
        {/* The current route keeps its rule drawn; others draw it on hover. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-[3px] left-0 h-px w-full origin-left bg-current transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            active
              ? "scale-x-100"
              : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100",
          )}
        />
      </span>
    </Link>
  );
}

/**
 * The lockup is deep-blue "SIF" + gold italic "insight" on transparency.
 * On the warm-paper ground it reads natively, so there is NO plate behind
 * it — removing that white box was an explicit client instruction. Hover
 * is opacity only; tinting or boxing the mark is off the table.
 *
 * Explicit intrinsic dimensions (the PNG is 1024×313) keep CLS at zero.
 * `loading="eager"` rather than `priority`, which Next 16 deprecated.
 */
function Logo({ className }: { className: string }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-70"
    >
      {/* `sizes` is load-bearing, not decoration. Without it Next builds the
          srcset around the declared 1024px width and a 2x phone picks the
          w=2048 candidate — 17KB of WebP, on every route, to paint a mark
          that is 78px wide. The rendered widths below are h-6/h-7 against
          the PNG's 1024x313 (3.27:1). Declared width/height stay as they
          are: they set the aspect ratio that keeps CLS at zero, and `sizes`
          does not disturb them. */}
      <Image
        src="/sif-insight-logo.png"
        alt="SIF Insight"
        width={1024}
        height={313}
        sizes="(min-width: 992px) 92px, 78px"
        loading="eager"
        className={cn("w-auto", className)}
      />
    </Link>
  );
}
