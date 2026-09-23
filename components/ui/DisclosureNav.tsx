"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { ChevronIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { popover } from "@/lib/motion";
import { isNavItemActive, isPathActive, type NavItem } from "@/lib/nav";
import { useIsClient } from "@/lib/use-is-client";

/* ============================================================
   A nav item with children — "SIF Tracker ▾", "Learn ▾".

   SPLIT CONTROL, per the WAI-ARIA disclosure-navigation pattern:
     · the label is a real <Link> to the hub page, so /sif-tracker and
       /learn stay one click away, and reachable with JavaScript off;
     · the chevron is a separate <button aria-expanded> that shows and
       hides a plain list of links.

   NOT role="menu". A menu promises application semantics — arrow keys,
   typeahead, focus held inside until Escape — and screen readers switch
   modes to deliver them. Site navigation is a list of links, and the
   disclosure pattern announces it as exactly that; APG itself recommends
   it over a menu for this case.

   Dismissal follows the filter menus on the tracker (the same three
   exits, the same reasons):
     · Escape closes and returns focus to the chevron, so a keyboard user
       is not dropped at the top of the document;
     · a pointerdown outside closes (pointerdown, not click, so a drag
       that ends outside does not count);
     · focus leaving the item closes, so Tab past the last link cannot
       leave a panel announced as expanded while the reader is elsewhere.
       A null relatedTarget is focus leaving the WINDOW, which is not
       leaving the menu, so it stays open.

   The panel is an overlay, so it is never server-rendered hidden: it
   mounts only while open, behind `useIsClient`, inside AnimatePresence
   with the shared `popover` variant (origin-anchored, 0.22s in, EXIT out).
   `aria-controls` is set only while the panel exists, so it never points
   at an id that is not in the document.

   It renders IN PLACE, not portalled — unlike a dialog. The links have to
   follow the chevron in tab order, and a portal at the end of <body> would
   send Tab from the chevron to the footer. The header is a z-[200]
   stacking context above all page content, so in place is also enough.

   `variant="accordion"` is the same item inside the mobile panel: the
   children expand inline under the row instead of floating.
   ============================================================ */

const LINK_CLASS =
  "group text-[15px] text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink";

export function DisclosureNav({
  item,
  variant = "bar",
  onNavigate,
}: {
  item: NavItem;
  variant?: "bar" | "accordion";
  /** Called after any link inside is followed — the mobile panel closes on it. */
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const isClient = useIsClient();
  const active = isNavItemActive(pathname, item);
  const accordion = variant === "accordion";
  const children = item.children ?? [];

  /* The three dismissals are for the floating panel only. An accordion row
     is part of the page it sits in: closing it on an outside touch would
     snap it shut the moment a reader drags to scroll the mobile panel, and
     Escape there already belongs to SiteHeader, which closes the whole
     panel. */
  useEffect(() => {
    if (!open || accordion) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !rootRef.current?.contains(next)) setOpen(false);
    };

    const root = rootRef.current;
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open, accordion]);

  /** Following any link inside closes the panel — including a hash link to
      the page already on screen, where no route change would close it. */
  const onLinkClick = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target as HTMLElement).closest("a")) return;
    setOpen(false);
    onNavigate?.();
  };

  return (
    <li
      ref={rootRef}
      className={cn("relative", accordion && "border-b border-hairline")}
      onClick={onLinkClick}
    >
      {/* gap-2 on the bar, not less: the chevron's focus ring (2px, offset
          2px) reaches 4px past its box, and at gap-1 it touched the label. */}
      <div className={cn("flex items-center", accordion ? "justify-between" : "gap-2")}>
        <Link
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={cn(
            LINK_CLASS,
            active && "text-ink",
            accordion && "flex-1 py-4",
          )}
        >
          <span className="relative inline-block">
            {item.label}
            {/* Same hover rule as the plain nav links: drawn for the current
                section, wiped in on hover and focus otherwise. */}
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

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`${item.label} sections`}
          /* 24px on the bar (WCAG 2.5.8 minimum, and all the row can spare
             between two labels), 44px in the accordion, where it is the only
             way to reach the children on a phone. Both in px — see the
             hamburger note in SiteHeader. */
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-body transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-accent-wash hover:text-ink",
            accordion
              ? "h-[44px] w-[44px] border border-hairline"
              : "h-[24px] w-[24px]",
            open && "text-ink",
          )}
        >
          <ChevronIcon
            size={accordion ? 14 : 12}
            className={cn(
              "transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {isClient ? (
        <AnimatePresence>
          {open ? (
            <motion.ul
              key="panel"
              id={panelId}
              variants={popover}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ transformOrigin: "top left" }}
              className={
                accordion
                  ? "flex flex-col pb-3 pl-4"
                  : "absolute left-0 top-full z-10 mt-4 min-w-[240px] border border-hairline bg-surface py-2"
              }
            >
              {children.map((child) => {
                const current =
                  !child.href.includes("#") && isPathActive(pathname, child.href);
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "block text-[15px] leading-[22px] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink",
                        current ? "text-ink" : "text-body",
                        accordion
                          ? "py-3"
                          : "whitespace-nowrap px-5 py-2.5 hover:bg-accent-wash",
                      )}
                    >
                      {child.label}
                      {child.description ? (
                        <span className="mt-0.5 block text-[13px] leading-[20px] text-muted">
                          {child.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      ) : null}
    </li>
  );
}
