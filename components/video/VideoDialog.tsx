"use client";

import type { RefObject } from "react";
import { ExternalIcon } from "@/components/icons";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The on-site player. CLICK-TO-LOAD: the <iframe> exists only while this
 * dialog is open, so a page listing six videos ships six thumbnails and no
 * YouTube JavaScript at all until a reader asks for one.
 *
 * youtube-nocookie.com, the privacy-enhanced host — the only frame origin
 * the CSP admits (next.config.ts). `autoplay=1` is honoured because the
 * iframe is created by the reader's own click; `rel=0` keeps the
 * end-screen to this channel rather than whatever YouTube recommends.
 *
 * `referrerPolicy` is stated rather than inherited: YouTube refuses to play
 * an embed that arrives with no Referer at all, and a future tightening of
 * the site-wide Referrer-Policy would otherwise break every player at once.
 *
 * One limit no page can lift: while keyboard focus is INSIDE the player,
 * keystrokes belong to youtube-nocookie.com's document, so Escape reaches
 * the player (it leaves fullscreen) and not this dialog. Tab still walks out
 * of the frame onto the close button or the link below it, and Escape works
 * again from there — measured, the trap holds across the frame boundary.
 */
export function VideoDialog({
  id,
  title,
  open,
  onClose,
  returnFocusRef,
}: {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="media"
      closeLabel="Close video"
      returnFocusRef={returnFocusRef}
    >
      <div className="relative aspect-video w-full bg-chip">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <p className="text-[13px] leading-[20px] text-muted">
          Educational content, not investment advice or a recommendation.
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 text-[14px] leading-[20px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
        >
          Watch on YouTube
          <ExternalIcon size={12} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </Dialog>
  );
}
