/* ============================================================
   Lead capture — the shared vocabulary.

   Plain module: no server APIs, no data imports, so both the client form
   and the server action read the SAME option lists. (The old contact form
   had to state its investment ranges twice because a "use server" module
   may export only async functions; the lists live here instead, and the
   action imports them.)
   ============================================================ */

export type LeadKind = "popup" | "consultation";

/** Per-field caps, enforced on the server and mirrored as `maxLength`. */
export const LEAD_LIMITS = {
  name: 80,
  email: 254,
  /** The input caps at 20; the slack allows generous spacing/brackets and
      keeps `normalisePhone` from ever seeing a 20 KB string. */
  phone: 24,
  /** "What are you looking for?" in the popup. */
  popupMessage: 600,
  message: 1200,
  /** Read-time ceiling above every cap: a rejected value is echoed back into
      the form, so this bounds the response without changing which rule a
      value breaks. */
  field: 2000,
  sourcePage: 200,
} as const;

/** Shortest plausible time between the form becoming interactive and a
    person pressing submit. Low on purpose — autofill is fast. */
export const MIN_FILL_MS = 2000;

export const TIME_SLOTS = [
  { id: "morning", label: "Morning 9–12" },
  { id: "afternoon", label: "Afternoon 12–4" },
  { id: "evening", label: "Evening 4–7" },
] as const;

/** Machine ids unchanged from the original contact form. */
export const INVESTMENT_RANGES = [
  { id: "10-25L", label: "₹10–25 L" },
  { id: "25-50L", label: "₹25–50 L" },
  { id: "50L-1Cr", label: "₹50 L–1 Cr" },
  { id: "1Cr+", label: "₹1 Cr+" },
] as const;

export const CONSENT_COPY =
  "I agree to be contacted by SIF Insight (Platizio Services LLP) by call, WhatsApp or email about my enquiry, and I accept the Privacy Policy.";

/** Browser-session keys. Both are disclosed on /privacy — keep them in step. */
export const POPUP_SHOWN_KEY = "sif:lead-popup:v1";
export const LEAD_SENT_KEY = "sif:lead:sent";

export type LeadField =
  | "name"
  | "phone"
  | "email"
  | "message"
  | "preferredTime"
  | "investmentRange"
  | "consent";

/** What the visitor typed, echoed back so a refused submission loses
    nothing (React resets an uncontrolled form once its action settles).
    `consent` is "yes" or "". */
export type LeadValues = Record<LeadField, string>;

export type BlockReason = "automated" | "rate-limited";

export type LeadState =
  | { status: "idle" }
  | {
      status: "invalid";
      errors: Partial<Record<LeadField, string>>;
      values: LeadValues;
    }
  /** Refused by a bot or abuse control; delivery was never attempted. */
  | { status: "blocked"; reason: BlockReason; values: LeadValues }
  /** Valid, but no delivery path is configured. Nothing was sent. */
  | { status: "unconfigured"; values: LeadValues }
  /** The provider was reached and failed, or could not be reached. */
  | { status: "error"; values: LeadValues }
  | { status: "sent" };

/** A validated lead, as handed to delivery. */
export type Lead = {
  /** Random UUID; doubles as the provider's Idempotency-Key. */
  id: string;
  kind: LeadKind;
  name: string;
  /** Bare 10-digit Indian mobile, begins 6–9. */
  phone: string;
  email: string | null;
  message: string | null;
  /** Human label from TIME_SLOTS, or null when not chosen. */
  preferredTime: string | null;
  /** Human label from INVESTMENT_RANGES, or null when not chosen. */
  investmentRange: string | null;
  /** The consent sentence the visitor ticked, verbatim. */
  consent: string;
  submittedAt: string;
  /** Pathname the form was submitted from, or "unknown". */
  sourcePage: string;
};

export function emptyValues(): LeadValues {
  return {
    name: "",
    phone: "",
    email: "",
    message: "",
    preferredTime: "",
    investmentRange: "",
    consent: "",
  };
}
