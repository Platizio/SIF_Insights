"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { Magnetic } from "@/components/motion/Magnetic";
import { Button, Shell } from "@/components/primitives";
import { DisclosureNav } from "@/components/ui/DisclosureNav";
import { lockPageScroll } from "@/components/ui/scroll-lock";
import { cn } from "@/lib/cn";
import { DUR, EASE } from "@/lib/motion";
import { PRIMARY_CTA, PRIMARY_NAV, isPathActive } from "@/lib/nav";

/**
 * Sticky navigation.
 *
 * No border and no shadow at rest — the header separates from content by
 * whitespace alone. It is opaque `bg-ground`, so scrolled content passes
 * cleanly beneath it; past ~40px a single hairline fades in to ground it.
 *
 * The tree is lib/nav.ts (the PRD's order: Home · SIF Tracker ▾ · SIF
 * Screener · Compare · AMCs · Learn ▾ · About Us). Items with children
 * render through <DisclosureNav>: the label is a link to the hub page and a
 * separate chevron opens the list, so every hub is still one click away —
 * and reachable with JavaScript off.
 */

/** The nav collapses at 992px, which is between Tailwind's md and lg stops.
    Re-measured for the PRD's labels (two chevrons and a longer CTA) at
    992 / 1024 / 1120 / 1280: logo, nav and CTA hold one row with clear
    space at every width from 992 up. */
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

     Both halves of the lock — the CSS one for native touch, the Lenis pause
     for wheel on anything with a mouse under the breakpoint — now live in
     components/ui/scroll-lock.ts, shared with the dialogs, and are counted
     so a dialog opened over the menu cannot unlock the page under it. */
  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
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
          className="hidden justify-self-center min-[992px]:block"
        >
          {/* A list, as the disclosure pattern expects: the dropdowns are
              list items whose children are a nested list of links. The gap
              tightens at the breakpoint so the row does not collide with the
              logo or the CTA, and opens up once there is room for it. */}
          <ul className="flex items-center gap-4 xl:gap-7">
            {PRIMARY_NAV.map((item) =>
              item.children ? (
                <DisclosureNav key={item.href} item={item} />
              ) : (
                <li key={item.href}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <Magnetic className="hidden justify-self-end min-[992px]:block">
          {/* Trimmed from the shared 15px/px-7/py-3.5 so the CTA sits inside a
              64px band with air around it. tailwind-merge resolves these
              against Button own classes, so this is an override, not a
              duplicate. The arrow comes from <Button>; the label carries none. */}
          <Button
            href={PRIMARY_CTA.href}
            variant="primary"
            className="px-5 py-2.5 text-[14px]"
          >
            {PRIMARY_CTA.label}
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
          {open ? <CloseIcon size={16} /> : <MenuIcon size={16} />}
        </button>
      </Shell>

      {/* Always rendered so `aria-controls` always resolves; `hidden` does
          the hiding. This is the one panel that is NOT an AnimatePresence
          overlay, deliberately: it is the whole mobile nav, it has always
          shipped in the HTML, and `hidden` is not an opacity — nothing here
          waits on JavaScript to become visible, it waits on a tap.

          `max-h`/`overflow-y-auto` so the panel is reachable on a short
          viewport — a landscape phone is ~375x400, and seven links plus two
          expanded sections and the CTA do not fit. `overscroll-contain`
          keeps a scroll that reaches the panel's end from chaining to the
          document behind it. `data-lenis-prevent` because the lock above
          pauses Lenis, and a paused Lenis still swallows wheel events — so
          without it the panel could not be wheel-scrolled at all. */}
      <div
        id={PANEL_ID}
        hidden={!open}
        data-lenis-prevent=""
        className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-b border-hairline bg-surface min-[992px]:hidden"
      >
        <Shell>
          <nav aria-label="Primary, mobile" onClick={closeOnLink}>
            <ul className="flex flex-col">
              {PRIMARY_NAV.map((item) =>
                item.children ? (
                  <DisclosureNav key={item.href} item={item} variant="accordion" />
                ) : (
                  <li key={item.href} className="border-b border-hairline">
                    <NavLink href={item.href} className="block py-4">
                      {item.label}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
            <Button href={PRIMARY_CTA.href} variant="primary" className="my-6">
              {PRIMARY_CTA.label}
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
 * would turn the nav into seven competing rules on a page whose whole
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
  // Section-aware: /amc/icici should still light "AMCs".
  const active = isPathActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={pathname === href ? "page" : undefined}
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
 * Always links to "/" — the PRD asks for exactly that, and it is the one
 * element a visitor clicks expecting to be taken home.
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
