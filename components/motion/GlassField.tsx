import { cn } from "@/lib/cn";

/* ============================================================
   Texture for glass to bite on.

   backdrop-filter blurs whatever is BEHIND an element. Over flat paper
   there is nothing to blur, so a glass button reads as a tint rather
   than as frost. This puts something there.

   Static — no animation, no WebGL, no requestAnimationFrame. Decorative
   only, always aria-hidden.
   ============================================================ */

/**
 * A soft tinted field sized to a button cluster.
 *
 * Pure radial gradients — the softness is in the colour stops, not in a
 * `filter: blur()`, which would cost a repaint and is banned on content.
 * Place inside a `relative isolate` wrapper around the buttons.
 */
export function GlassField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      /* The horizontal bleed must stay inside the page gutter, or the field
         pushes past the viewport and gives the whole document a scrollbar.
         The mobile gutter is 24px, so 2rem only fits from sm up. */
      className={cn(
        "pointer-events-none absolute -inset-x-4 -inset-y-4 -z-10 sm:-inset-x-8 sm:-inset-y-6",
        className,
      )}
      style={{
        /* Fade to the SAME hue at zero alpha, never to `transparent`.
           `transparent` is rgba(0,0,0,0) — transparent BLACK — so a gradient
           ending there interpolates toward black and renders as a grey box
           with visible rectangular bounds instead of dissolving. */
        background:
          "radial-gradient(60% 120% at 22% 40%, oklch(0.50 0.10 195 / 0.13), oklch(0.50 0.10 195 / 0) 70%)," +
          "radial-gradient(55% 130% at 78% 60%, oklch(0.72 0.09 85 / 0.16), oklch(0.72 0.09 85 / 0) 72%)",
      }}
    />
  );
}
