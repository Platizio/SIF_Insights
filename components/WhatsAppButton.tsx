import { WhatsAppIcon } from "@/components/icons";
import { whatsappHref } from "@/lib/site";

/**
 * The floating WhatsApp link (PRD p.8), bottom-right on every route.
 *
 * A plain link and a Server Component: nothing about it needs JavaScript,
 * so it works with scripting off and costs no hydration.
 *
 * STATIC. No pulse, no bounce, no badge. A perpetually animating icon is on
 * the contract's banned list, and on a financial-services page a throbbing
 * chat bubble reads as a sales tactic.
 *
 * Layering: z-[150] — above page content, BELOW the sticky header (200)
 * and every dialog (1000), so it never sits on top of the nav or a modal.
 *
 * `--float-offset` is the lift. Anything that docks to the bottom edge (the
 * screener's sticky compare bar) sets it on <html> to its own height and
 * the button rises above it instead of covering it. Defaults to 1.25rem.
 * Both offsets add the safe-area insets, so on a notched phone it clears
 * the home indicator rather than sitting under it.
 *
 * `glass-inverse` rather than WhatsApp green: tokens only, and the dark lens
 * keeps the white glyph legible over whatever scrolls beneath it — the hero
 * photograph, a pale table, the ground.
 *
 * 56px, stated in px, so the fluid root cannot shrink the target on phones.
 */
export function WhatsAppButton() {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SIF Insight on WhatsApp"
      title="Chat with SIF Insight on WhatsApp"
      className="glass glass-inverse fixed bottom-[calc(var(--float-offset,1.25rem)_+_env(safe-area-inset-bottom,0px))] right-[calc(1.25rem_+_env(safe-area-inset-right,0px))] z-[150] inline-flex h-[56px] w-[56px] items-center justify-center rounded-full text-ground print:hidden"
    >
      <WhatsAppIcon size={26} />
    </a>
  );
}
