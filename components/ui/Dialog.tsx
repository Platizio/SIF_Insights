"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { lockPageScroll } from "@/components/ui/scroll-lock";
import { cn } from "@/lib/cn";
import { DUR, EASE, EXIT } from "@/lib/motion";
import { useIsClient } from "@/lib/use-is-client";

/* ============================================================
   The modal dialog. One implementation, generalised from the tracker's
   compare dialog, so the video player, the lead popup and anything after
   them inherit the same guarantees rather than re-deriving them:

   · Portalled to <body>. A dialog mounted inside a section inherits that
     section's stacking context — the compare dialog once lost to the
     sticky header's z-[200] from inside an `isolate` section, with its nav
     links lit and clickable over the backdrop while aria-modal was set.
     As a child of <body>, z-[1000] means what it says.
   · Never server-rendered. `useIsClient` gates the portal (no `document`
     during SSR) and the panel mounts only while open, inside
     AnimatePresence — so there is no hidden overlay in the HTML for the
     reveal safety nets to force visible, or for a crawler to read.
   · Focus moves in on open, is trapped while open, and goes back to the
     control that opened it on close. Escape and a backdrop click close.
   · The page behind is locked (see ./scroll-lock.ts), and the scroll area
     carries `data-lenis-prevent`, because a paused Lenis swallows wheel
     events and the dialog body would otherwise not scroll at all.

   Enter DUR.ui, exit EXIT: exits are always faster than entrances.
   ============================================================ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

/* Literal classes per size — Tailwind scans source text.

   `media` is capped by HEIGHT as well as width. A full-width 16:9 player
   is taller than the scroll area on ordinary laptops (at 1366x657 its
   bottom 138px, where YouTube draws play, seek and fullscreen, sat below
   the fold of the dialog, and wheel input does not leave a cross-origin
   frame to scroll it). So the width is the smaller of 1180px and the width
   at which frame + chrome fit the panel's 92dvh (keep the two in step):
     header  2.5rem padding + 44px (the close button, taller than one
             title line) + 1px rule
     footer  2rem padding + 20px (one caption row, VideoDialog)
     panel   2px border
   The title is clamped to two lines at this size, and a second line
   (+16px) fits inside the footer's share. The frame itself then always
   fits, and a wrapped footer at worst scrolls. */
const SIZES = {
  sm: "max-w-[520px]",
  md: "max-w-[720px]",
  lg: "max-w-[1100px]",
  media: "max-w-[min(1180px,calc((92dvh_-_4.5rem_-_67px)_*_16_/_9))]",
} as const;

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeLabel = "Close",
  initialFocusRef,
  returnFocusRef,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Rendered as the dialog's <h2> and wired to `aria-labelledby`. */
  title: ReactNode;
  /** Optional line under the title, wired to `aria-describedby`. */
  description?: ReactNode;
  children: ReactNode;
  size?: keyof typeof SIZES;
  /** Accessible name of the × button. */
  closeLabel?: string;
  /** What receives focus on open. Defaults to the panel itself, which is
      right for a dialog whose first control is far down its content. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where focus returns on close. Defaults to whatever held focus when the
      dialog opened. Pass the opener where you can: Safari does not focus a
      button on click, so "whatever held focus" is often <body> there. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useIsClient();

  /* The latest onClose, without making the lock effect re-run every time a
     parent re-renders with a fresh arrow function. Written in an effect,
     never during render (react-hooks/refs). */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* `mounted` is a dependency so a dialog that is already open on the
     hydrating render (where the portal returns null) still gets its lock
     and its focus on the pass that actually mounts the panel. */
  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    const opener =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const unlock = lockPageScroll();
    (initialFocusRef?.current ?? panel)?.focus();

    return () => {
      unlock();
      /* Only if focus is still inside the dialog (or nowhere). If the close
         came from a click on something else that took focus, snatching it
         back would be worse than leaving it. */
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) {
        opener?.focus();
      }
    };
  }, [open, mounted, initialFocusRef, returnFocusRef]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      /* Both, because they reach different listeners. stopPropagation
         stops React handlers above the portal; the document-level Escape
         listeners (the mobile menu, the nav dropdowns) sit on the same
         node React delegates from, so they only see defaultPrevented — and
         check it, so one Escape closes the dialog and nothing under it. */
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          /* AnimatePresence tracks children BY KEY — without one the exiting
             overlay is never unmounted and a transparent full-screen layer
             keeps swallowing every click on the page. */
          key="dialog"
          className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: EXIT } }}
          transition={{ duration: DUR.ui, ease: EASE.outQuart }}
          onKeyDown={onKeyDown}
        >
          <div
            aria-hidden="true"
            onClick={() => onCloseRef.current()}
            className="absolute inset-0 bg-ink/55"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, transition: { duration: EXIT } }}
            transition={{ duration: 0.22, ease: EASE.outQuart }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col border border-hairline bg-surface outline-none",
              SIZES[size],
              className,
            )}
          >
            <div className="flex items-start justify-between gap-6 border-b border-hairline px-6 py-5 sm:px-8">
              <div className="min-w-0">
                {/* line-clamp is visual only: the accessible name (and so
                    what a screen reader announces) is still the whole title. */}
                <h2
                  id={titleId}
                  className={cn(
                    "text-[22px] font-medium leading-[30px] text-ink",
                    size === "media" && "line-clamp-2",
                  )}
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-muted"
                  >
                    {description}
                  </p>
                ) : null}
              </div>

              {/* 44px, stated in px: the fluid root makes rem targets
                  shrink on exactly the phones where this matters. */}
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label={closeLabel}
                className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-hairline text-ink transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:bg-accent-wash"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto" data-lenis-prevent="">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
