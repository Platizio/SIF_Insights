import {
  INVESTMENT_RANGES,
  LEAD_LIMITS,
  MIN_FILL_MS,
  TIME_SLOTS,
  type LeadField,
  type LeadKind,
  type LeadValues,
} from "./schema";

/* ============================================================
   Lead validation — pure, synchronous, server-authoritative.

   Moved out of app/contact/actions.ts so the popup and the consultation
   form share one set of rules and so the rules can be tested without a
   request scope. What a passing value GUARANTEES (the contract delivery
   may rely on):

     phone            ten digits, no punctuation, begins 6–9.
     name             non-empty, trimmed, length-capped, ≥ 2 visible code
                      points, free of C0 controls, DEL, U+2028/U+2029 —
                      so it cannot end a header line or start a second.
     email            null, or the same control-free guarantee plus a loose
                      shape check (not proof the address exists).
     message          null or body text; may carry tabs and newlines. Never
                      put it in a header.
     preferredTime,
     investmentRange  null, or exactly one of the listed labels.

   NOT guaranteed: that any field is free of Unicode formatting characters
   (bidi marks, zero-width joiners are accepted — they are load bearing in
   Indic names). Encode for whatever context you write into.
   ============================================================ */

/** Deliberately loose; a delivered mail is the authority, not a regex. */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** C0 controls, DEL, and the two Unicode line separators — nothing a
    single-line value (a name, an address) needs. */
export const CONTROL_IN_LINE = /[\u0000-\u001F\u007F\u2028\u2029]/;

/** The same set minus tab, LF and CR, for textarea content. */
export const CONTROL_IN_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Characters that render as nothing. Discounted when judging whether a
    name has substance — never stripped, never rejected. */
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;
const WHITESPACE = /\s/u;

/**
 * Normalise an Indian mobile number however it is typed — `+91 92055 23100`,
 * `092055-23100`, `0091 92055 23100`, `9205523100`.
 *
 * Length-aware: stripping a leading "91" unconditionally would mangle
 * `9198765432`, itself a valid mobile. Mobiles begin 6–9; landlines are not
 * accepted because the follow-up is a call or a WhatsApp message.
 */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Visible code points: neither whitespace nor zero-width. */
export function substanceLength(value: string): number {
  return Array.from(value.replace(ZERO_WIDTH, "")).filter(
    (character) => !WHITESPACE.test(character),
  ).length;
}

export function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, LEAD_LIMITS.field) : "";
}

/** The honeypot: an off-screen, untabbable field no person fills. */
export function honeypotFilled(formData: FormData): boolean {
  return readField(formData, "website") !== "";
}

/**
 * Judge the client's claim about how long the form took to fill.
 *
 * A CLAIM, not a measurement — a direct POST can send any number. An absent
 * or unreadable claim FAILS OPEN (a no-JS submission makes no claim); the
 * rate limit, which trusts nothing the client says, covers that case.
 */
export function submittedTooFast(claim: string): boolean {
  if (!claim) return false;
  const elapsed = Number(claim);
  if (!Number.isFinite(elapsed) || elapsed < 0) return false;
  return elapsed < MIN_FILL_MS;
}

/** A same-site pathname, or "unknown". Never trusted beyond display. */
export function readSourcePage(formData: FormData): string {
  const raw = readField(formData, "sourcePage");
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.length > LEAD_LIMITS.sourcePage ||
    CONTROL_IN_LINE.test(raw)
  ) {
    return "unknown";
  }
  return raw;
}

export type ValidLead = {
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  preferredTime: string | null;
  investmentRange: string | null;
};

export type Validation =
  | { ok: true; values: ValidLead; echo: LeadValues }
  | { ok: false; errors: Partial<Record<LeadField, string>>; values: LeadValues };

export function readValues(formData: FormData): LeadValues {
  return {
    name: readField(formData, "name"),
    phone: readField(formData, "phone"),
    email: readField(formData, "email"),
    message: readField(formData, "message"),
    preferredTime: readField(formData, "preferredTime"),
    investmentRange: readField(formData, "investmentRange"),
    consent: readField(formData, "consent") === "yes" ? "yes" : "",
  };
}

/**
 * Popup: name + mobile required; email and "what are you looking for?"
 * optional (≤ 600); consent required.
 * Consultation: name + mobile required; email, preferred time, investment
 * range and message optional; consent required.
 *
 * Fields the kind does not carry are ignored (and not echoed).
 */
export function validateLead(kind: LeadKind, formData: FormData): Validation {
  const values = readValues(formData);
  if (kind === "popup") {
    values.preferredTime = "";
    values.investmentRange = "";
  }

  const errors: Partial<Record<LeadField, string>> = {};

  if (!values.name) {
    errors.name = "Enter your name so we know who we are calling.";
  } else if (CONTROL_IN_LINE.test(values.name)) {
    errors.name = "That name contains characters we cannot send. Remove any line breaks.";
  } else if (substanceLength(values.name) < 2) {
    errors.name = "That name looks too short.";
  } else if (values.name.length > LEAD_LIMITS.name) {
    errors.name = `Keep your name under ${LEAD_LIMITS.name} characters.`;
  }

  const phone =
    values.phone.length > LEAD_LIMITS.phone ? null : normalisePhone(values.phone);
  if (!values.phone) {
    errors.phone = "Enter a mobile number we can call you on.";
  } else if (values.phone.length > LEAD_LIMITS.phone) {
    errors.phone = `Keep your mobile number under ${LEAD_LIMITS.phone} characters.`;
  } else if (!phone) {
    errors.phone = "Enter a 10-digit Indian mobile number, with or without +91.";
  }

  if (
    values.email &&
    (CONTROL_IN_LINE.test(values.email) ||
      values.email.length > LEAD_LIMITS.email ||
      !EMAIL_SHAPE.test(values.email))
  ) {
    errors.email = "That does not look like an email address. It is optional — leave it blank if you prefer.";
  }

  const messageCap = kind === "popup" ? LEAD_LIMITS.popupMessage : LEAD_LIMITS.message;
  if (CONTROL_IN_TEXT.test(values.message)) {
    errors.message = "That message contains control characters we cannot send. Line breaks are fine.";
  } else if (values.message.length > messageCap) {
    errors.message = `Keep your message under ${messageCap} characters.`;
  }

  const slot = TIME_SLOTS.find((s) => s.id === values.preferredTime);
  if (values.preferredTime && !slot) errors.preferredTime = "Choose one of the listed times.";

  const range = INVESTMENT_RANGES.find((r) => r.id === values.investmentRange);
  if (values.investmentRange && !range) {
    errors.investmentRange = "Choose one of the listed ranges.";
  }

  if (values.consent !== "yes") {
    errors.consent = "Tick the box so we are allowed to contact you about this enquiry.";
  }

  if (Object.keys(errors).length > 0 || !phone) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    echo: values,
    values: {
      name: values.name,
      phone,
      email: values.email || null,
      message: values.message || null,
      preferredTime: slot?.label ?? null,
      investmentRange: range?.label ?? null,
    },
  };
}
