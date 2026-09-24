import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ============================================================
   The icon set. Inline SVG, no icon font and no package — the site ships
   no third-party UI dependency beyond Radix's accordion, and a font of
   2,000 glyphs to draw fifteen would be the wrong trade.

   EVERY icon is decorative (`aria-hidden`, `focusable="false"`). The
   control that holds one carries the name — visible text beside it, or an
   `aria-label` on an icon-only link or button. An icon that tries to be
   its own label ends up announced twice or not at all.

   Stroke icons draw in `currentColor` at 1.5px on a 24px grid, so they
   take the colour and hover state of the text around them. Brand marks
   (YouTube, WhatsApp …) are simplified solid glyphs in the same colour:
   they sit in a warm-paper UI, not a sticker sheet, so none of them is
   painted in its platform's own brand colour.

   Server-safe: no hooks, no directive, so both server and client
   components may import it.
   ============================================================ */

type IconProps = {
  className?: string;
  /** Rendered px. Stated in pixels, not rem, so icons do not shrink with
      the fluid root on phones. */
  size?: number;
};

function Svg({
  size = 16,
  className,
  children,
  viewBox = "0 0 24 24",
  stroke = true,
}: IconProps & { children: ReactNode; viewBox?: string; stroke?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...(stroke
        ? {
            stroke: "currentColor",
            strokeWidth: 1.5,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          }
        : {})}
    >
      {children}
    </svg>
  );
}

/* ---------- UI ---------- */

/** Points down. Rotate 180° for the open state rather than swapping glyphs. */
export function ChevronIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </Svg>
  );
}

/** "Leaves the site." Pair with an sr-only "(opens in a new tab)". */
export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 3h11.5v11.5M21 3 10.5 13.5M18 14v7H3V6h7" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </Svg>
  );
}

/** Two bars, matching the header's original 16×12 hamburger proportions. */
export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 7.5h20M2 16.5h20" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path d="M7 4.5v15l12.5-7.5L7 4.5Z" fill="currentColor" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
    </Svg>
  );
}

/* ---------- Contact ---------- */

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5h3.2l1.6 4.2-2.2 1.5a11.5 11.5 0 0 0 6.7 6.7l1.5-2.2 4.2 1.6v3.2a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3.5 5.5a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 5.5h18v13H3z" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </Svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.5s-7-6.1-7-11.8a7 7 0 0 1 14 0c0 5.7-7 11.8-7 11.8Z" />
      <circle cx="12" cy="9.7" r="2.6" />
    </Svg>
  );
}

/* ---------- Brands (solid, currentColor) ---------- */

export function WhatsAppIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2.25a9.75 9.75 0 0 0-8.4 14.7L2.25 21.75l4.93-1.3A9.75 9.75 0 1 0 12 2.25Zm0 1.8a7.95 7.95 0 1 1-4.05 14.79l-.29-.17-2.86.75.77-2.79-.19-.3A7.95 7.95 0 0 1 12 4.05Z"
      />
      <path
        fill="currentColor"
        d="M9.1 7.6c-.19-.42-.39-.43-.57-.44h-.49a.94.94 0 0 0-.68.32c-.23.25-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.17 1.78 2.84 4.39 3.87 2.17.86 2.61.69 3.08.64.47-.04 1.52-.62 1.73-1.22.21-.6.21-1.11.15-1.22-.06-.1-.23-.17-.49-.3l-1.73-.85c-.23-.08-.4-.13-.57.13-.17.25-.66.84-.8 1-.15.17-.3.19-.55.06a6.9 6.9 0 0 1-2.04-1.26 7.6 7.6 0 0 1-1.4-1.75c-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44l-.9-2.16Z"
      />
    </Svg>
  );
}

export function YouTubeIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M6.5 4.75h11a4.25 4.25 0 0 1 4.25 4.25v6a4.25 4.25 0 0 1-4.25 4.25h-11A4.25 4.25 0 0 1 2.25 15V9A4.25 4.25 0 0 1 6.5 4.75Zm3.5 3.9v6.7L15.75 12 10 8.65Z"
      />
    </Svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.4" fill="currentColor" />
    </Svg>
  );
}

/** The X mark (formerly Twitter). */
export function XIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path
        fill="currentColor"
        d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z"
      />
    </Svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2.9 3.9a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9ZM6.65 10.6V17.5h2.5v-6.9h-2.5Zm4.2 0V17.5h2.5v-3.6c0-.95.2-1.87 1.37-1.87 1.16 0 1.18 1.08 1.18 1.93V17.5h2.5v-4.05c0-2-.43-3.04-2.77-3.04-1.12 0-1.87.62-2.18 1.2h-.03v-1.01h-2.57Z"
      />
    </Svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Svg {...props} stroke={false}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2.25a9.75 9.75 0 0 0-1.52 19.38v-6.81H8v-2.82h2.48V9.85c0-2.44 1.46-3.8 3.69-3.8 1.07 0 2.18.2 2.18.2v2.4h-1.23c-1.21 0-1.59.75-1.59 1.52v1.83h2.71l-.43 2.82h-2.28v6.81A9.75 9.75 0 0 0 12 2.25Z"
      />
    </Svg>
  );
}

/* ---------- Neutral card icons ---------- */

export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 3.5v17h17" />
      <path d="m7 15 4-4.5 3 3 5.5-6.5" />
    </Svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 5h17l-6.5 7.6v5.9l-4 2v-7.9L3.5 5Z" />
    </Svg>
  );
}

export function CompareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 4.5h6.5v15H3.5zM14 4.5h6.5v15H14z" />
      <path d="M6.75 8.5v.01M17.25 8.5v.01" />
    </Svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.2C9.6 4.9 6.6 4.5 3 5v13.7c3.6-.5 6.6-.1 9 1.2 2.4-1.3 5.4-1.7 9-1.2V5c-3.6-.5-6.6-.1-9 1.2Z" />
      <path d="M12 6.2v13.7" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.75 4.5 5.75v5.6c0 4.4 3.1 8.2 7.5 9.9 4.4-1.7 7.5-5.5 7.5-9.9v-5.6L12 2.75Z" />
      <path d="m8.75 12 2.25 2.25 4.25-4.5" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
      <path d="M15.5 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.3A5 5 0 0 1 21 18.6V20" />
    </Svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2.75h8l4.75 4.75v13.75H6z" />
      <path d="M13.5 2.75V8h5.25M9 12.5h6.5M9 16.5h6.5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.75" cy="10.75" r="6.5" />
      <path d="m20.5 20.5-5.1-5.1" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 5.5h17v15h-17z" />
      <path d="M3.5 10h17M8.5 3v4.5M15.5 3v4.5" />
    </Svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5M3 17l9 5 9-5" />
    </Svg>
  );
}
