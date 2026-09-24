"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { SifRow } from "@/lib/data/types";
import { Button, Shell } from "@/components/primitives";
import { compareHref } from "@/lib/screener/url";
import { DUR, EASE, EXIT } from "@/lib/motion";
import { useIsClient } from "@/lib/use-is-client";
import { TEXT_BUTTON } from "./bits";

/* ============================================================
   The shortlist bar (PRD p.44): "3 SIFs Selected | Clear |
   Compare SIFs →", docked to the bottom once two or more are picked.

   An overlay, so it follows the overlay rule: client-only (useIsClient),
   portalled to <body>, mounted conditionally inside AnimatePresence —
   never server-rendered hidden.

   While it is on screen it sets `--float-offset` on <html> to its own
   height, which is the contract components/WhatsAppButton.tsx reads to
   lift itself clear; the property is removed on unmount (after the exit
   animation, when the bar is actually gone). Measured with a
   ResizeObserver, because the bar wraps to two lines on a phone.

   The link carries the codes in PICK ORDER — the order the reader chose
   them is the order Compare lays them out.
   ============================================================ */

export function CompareBar({
  picked,
  notice,
  onClear,
}: {
  picked: SifRow[];
  /** "You can compare up to 4 SIFs", after a refused fifth pick. */
  notice: string;
  onClear: () => void;
}) {
  const mounted = useIsClient();
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {picked.length >= 2 ? <Bar key="compare-bar" picked={picked} notice={notice} onClear={onClear} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

function Bar({ picked, notice, onClear }: { picked: SifRow[]; notice: string; onClear: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--float-offset", `calc(${Math.ceil(el.offsetHeight)}px + 1.25rem)`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--float-offset");
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      role="region"
      aria-label="Compare selection"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%", transition: { duration: EXIT } }}
      transition={{ duration: DUR.ui, ease: EASE.outQuart }}
      className="fixed inset-x-0 bottom-0 z-[140] border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom,0px)] print:hidden"
    >
      <Shell className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] leading-[22px] text-ink">
            <span className="tabular font-medium">{picked.length}</span> SIFs Selected
          </p>
          <p className="hidden truncate text-[12px] leading-[16px] text-muted sm:block sm:max-w-[60vw]">
            {picked.map((r) => r.shortName).join(" · ")}
          </p>
          {/* Present from the moment the bar mounts, so the refusal is announced. */}
          <p role="status" aria-live="polite" className="text-[12px] leading-[16px] text-body">
            {notice}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClear} className={TEXT_BUTTON}>
            Clear
          </button>
          <Button href={compareHref(picked.map((r) => r.code))} className="px-6 py-3">
            Compare SIFs
          </Button>
        </div>
      </Shell>
    </motion.div>
  );
}
