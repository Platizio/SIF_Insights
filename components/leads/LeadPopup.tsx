"use client";

import { useEffect, useState } from "react";
import { LeadForm } from "@/components/leads/LeadForm";
import { Dialog } from "@/components/ui/Dialog";
import { LEAD_SENT_KEY, POPUP_SHOWN_KEY } from "@/lib/leads/schema";

/* ============================================================
   The Home call-back popup (PRD p.8: "after 15 seconds ask users to fill
   the contact us form" — name, mobile, optional email, "what are you
   looking for?").

   Restraint rules, all checked at the moment the timer fires:
     · once per browser session — POPUP_SHOWN_KEY is set when it SHOWS;
     · never after the visitor has already sent a lead (LEAD_SENT_KEY);
     · never over another modal dialog, never over the open mobile nav
       (which locks <html> with overflow: hidden), and never while focus is
       in a field — nobody is interrupted mid-typing;
     · storage unreadable (private mode, blocked site data) ⇒ do not show:
       without the once-per-session guarantee it would nag on every visit.
   A skipped popup is not retried. No urgency copy, a clear "No thanks".

   Rendered through ui/Dialog: portalled, client-only, AnimatePresence,
   focus trap, Escape, backdrop, focus restore, page + Lenis lock — so it
   is never in the server HTML (reveal invariant).
   ============================================================ */

const DELAY_MS = 15_000;

function mayShow(): boolean {
  try {
    const store = window.sessionStorage;
    if (store.getItem(POPUP_SHOWN_KEY) || store.getItem(LEAD_SENT_KEY)) return false;
  } catch {
    return false;
  }
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false;
  if (document.documentElement.style.overflow === "hidden") return false;
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  ) {
    return false;
  }
  return true;
}

export function LeadPopup({ delayMs = DELAY_MS }: { delayMs?: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!mayShow()) return;
      try {
        window.sessionStorage.setItem(POPUP_SHOWN_KEY, "1");
      } catch {
        return;
      }
      setOpen(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  const close = () => setOpen(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title="Talk to SIF Insight"
      description="Leave your name and mobile number and someone from the SIF Insight team will call you back."
      closeLabel="Close — no thanks"
    >
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <LeadForm kind="popup" dismiss={{ label: "No thanks", onClick: close }} />
      </div>
    </Dialog>
  );
}
