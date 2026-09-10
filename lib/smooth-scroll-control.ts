"use client";

/* ============================================================
   A pause switch for the Lenis instance <SmoothScroll> owns.

   This exists for exactly one caller: the mobile nav panel in
   components/sections/SiteHeader.tsx, which has to stop the page moving
   underneath it while it is open.

   Why a registry rather than the CSS lock alone. `overflow: hidden` on
   <html> stops a USER scrolling — a touch drag, a scrollbar — but it does
   not stop `scrollTop` being SET, and setting it is precisely what Lenis
   does: it swallows the wheel event and animates `window.scrollTo` itself.
   Measured at 390px with the panel open and the lock applied, a 600px wheel
   still moved the document from 0 to 599. So the two halves cover different
   inputs and both are needed — the CSS lock for native touch scrolling on a
   phone, this for Lenis-driven wheel scrolling on anything with a mouse
   below the 992px breakpoint.

   `instance` stays null when the visitor asked for reduced motion, because
   <SmoothScroll> returns before constructing Lenis in that case. Pausing
   then is correctly a no-op: there is no smoothing to pause, and the CSS
   lock is already doing the whole job.
   ============================================================ */

/** The slice of the Lenis surface this module needs. Narrower than Lenis
    itself on purpose — nothing here should be able to scroll the page. */
type Controllable = { stop: () => void; start: () => void };

let instance: Controllable | null = null;

/**
 * Registers the live Lenis instance. Returns the deregistration function,
 * so the caller can hand it straight back from a `useEffect` cleanup.
 *
 * The identity check in the cleanup matters under React Strict Mode, which
 * mounts effects twice: without it the first unmount would clear the
 * instance the second mount had just registered, and the panel would
 * silently stop pausing anything.
 */
export function registerSmoothScroll(next: Controllable) {
  instance = next;
  return () => {
    if (instance === next) instance = null;
  };
}

export function pauseSmoothScroll() {
  instance?.stop();
}

export function resumeSmoothScroll() {
  instance?.start();
}
