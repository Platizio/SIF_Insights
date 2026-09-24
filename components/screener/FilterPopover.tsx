"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { popover } from "@/lib/motion";
import { useIsClient } from "@/lib/use-is-client";
import { Chevron, PILL_BASE, PILL_IDLE, PILL_ON } from "./bits";

/* ============================================================
   A quick-filter menu: a pill that opens a panel of controls.

   Adapted from the tracker's FilterMenu (app/sif-tracker/TrackerTable),
   keeping its three exits and their reasons:
     · pointerdown outside closes (not click — a scrollbar drag that
       ends outside must not shut it);
     · Escape closes and returns focus to the trigger — unless a dialog
       above already took that Escape (it marks it defaultPrevented);
     · focus leaving the menu closes it, so Tab past the last control
       cannot leave a panel announced as expanded. A null relatedTarget
       is the WINDOW losing focus, which is not leaving the menu.

   The panel is an overlay, so it is never server-rendered hidden: it
   mounts only while open, behind useIsClient, inside AnimatePresence
   with the shared `popover` variant — the DisclosureNav precedent. It
   renders IN PLACE rather than portalled, for the same reason as that
   component: the controls must follow the trigger in tab order.
   `aria-controls` exists only while the panel does.

   Positioned in the click handler, never in an effect after paint: the
   panel is clamped inside the viewport's 16px gutter, so on a 390px
   phone a menu opened from a right-hand pill slides left instead of
   being cut off.
   ============================================================ */

const WIDTHS = {
  sm: { className: "w-[min(288px,calc(100vw-32px))]", px: 288 },
  md: { className: "w-[min(360px,calc(100vw-32px))]", px: 360 },
} as const;

const GUTTER = 16;

export function FilterPopover({
  label,
  count = 0,
  width = "sm",
  children,
}: {
  label: string;
  /** Active selections behind this menu; printed on the pill. */
  count?: number;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;

    const onPointerDown = (event: PointerEvent) => {
      if (!root?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !root?.contains(next)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const w = Math.min(WIDTHS[width].px, vw - GUTTER * 2);
      /* Shift left just enough to clear the right gutter, never past the left one. */
      const overflow = rect.left + w - (vw - GUTTER);
      setOffset(overflow > 0 ? Math.max(-overflow, GUTTER - rect.left) : 0);
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(PILL_BASE, "inline-flex items-center gap-2", count > 0 ? PILL_ON : PILL_IDLE)}
      >
        <span>{label}</span>
        {count > 0 ? (
          <span className="tabular text-[12px] text-ink">
            <span className="sr-only">, </span>
            {count}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
        <Chevron open={open} />
      </button>

      {mounted ? (
        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              id={panelId}
              role="group"
              aria-label={label}
              variants={popover}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ left: offset, transformOrigin: offset < 0 ? "top right" : "top left" }}
              className={cn(
                "absolute top-full z-50 mt-2 border border-hairline bg-surface",
                WIDTHS[width].className,
              )}
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}
