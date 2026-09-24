"use client";

import { pauseSmoothScroll, resumeSmoothScroll } from "@/lib/smooth-scroll-control";

/* ============================================================
   Page scroll lock, for anything that sits over the page: the mobile nav
   panel, a dialog, the video player.

   It takes TWO halves, and each covers an input the other misses (the
   full measurement is in lib/smooth-scroll-control.ts):
     · `overflow: hidden` on <html> — native touch and scrollbar drags.
       <html>, not <body>: on <body> alone iOS Safari keeps scrolling.
     · pausing Lenis — which scrolls by SETTING scrollTop from a swallowed
       wheel event, something `overflow: hidden` does not prevent.

   Consequence of the second half that every caller must honour: a PAUSED
   Lenis still swallows wheel events (it preventDefaults them while
   stopped), so any scrollable region inside the overlay needs
   `data-lenis-prevent` or the wheel does nothing there at all.

   COUNTED, so locks compose. The mobile menu can be open when a dialog
   opens over it; with a plain lock/unlock pair the dialog closing would
   unlock the page under a menu that is still open. Only the first lock
   captures the page's previous inline values and only the last unlock
   restores them — restores, not blanks, so this composes with anything
   else that touches the same properties.

   `scrollbar-gutter: stable` while locked, and only when the page has a
   vertical scrollbar to begin with: hiding overflow removes the scrollbar,
   and without the reserved gutter the whole layout jumps sideways by its
   width (10px here, see the ::-webkit-scrollbar rule) every time an
   overlay opens.
   ============================================================ */

let locks = 0;
let previous: { overflow: string; gutter: string } | null = null;

/** Locks the page. Returns the matching unlock, for a useEffect cleanup. */
export function lockPageScroll(): () => void {
  const root = document.documentElement;
  if (locks === 0) {
    previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    const hasScrollbar = window.innerWidth > root.clientWidth;
    root.style.overflow = "hidden";
    if (hasScrollbar) root.style.scrollbarGutter = "stable";
    pauseSmoothScroll();
  }
  locks += 1;

  let released = false;
  return () => {
    /* Idempotent, so a cleanup that runs twice (Strict Mode) cannot drive
       the count negative and unlock a page someone else still holds. */
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0 && previous) {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
      previous = null;
      resumeSmoothScroll();
    }
  };
}
