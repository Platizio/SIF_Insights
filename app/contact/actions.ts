"use server";

import { headers } from "next/headers";

/* ============================================================
   Contact enquiry — Server Action.

   The form this replaces had no `action` and no handler: it collected a
   name, an email, a phone number and an investment size, and submitted
   them nowhere. For a financial-services lead form that is not a missing
   feature, it is a data-handling failure.

   This action validates on the server and then reports what actually
   happened to the submission — including, today, that no delivery path
   is configured. It must NEVER report a success it cannot prove: a
   "thank you, we'll be in touch" over a message that went nowhere is the
   precise defect being removed.

   Validation here does two separate jobs. It decides whether a
   submission is usable, and it decides what the next implementer is
   allowed to assume about the values that reach `deliverEnquiry` — that
   second job is written down as a contract inside that function.
   Anything this file does not check is something that function must not
   rely on, and the contract says so in as many words rather than waving
   at "validated".
   ============================================================ */

/**
 * The four ranges the form offers, as machine values.
 *
 * Deliberately duplicated in `ContactForm.tsx` rather than shared: a
 * `"use server"` module may only export async functions, so a shared
 * `const` here would be a build error. This list is the authority — if
 * the two ever drift, the submission is rejected, not silently accepted.
 */
const INVESTMENT_RANGES: readonly string[] = [
  "10-25L",
  "25-50L",
  "50L-1Cr",
  "1Cr+",
];

const MAX_NAME = 80;
const MAX_EMAIL = 254;
/** The input is capped at 20 client-side; the extra allows for a visitor
    who spaces and brackets a number generously. It exists mainly so that
    `normalisePhone` is never handed a 20 KB string to run a regex over. */
const MAX_PHONE = 24;
const MAX_MESSAGE = 1200;

/**
 * A ceiling above every per-field cap above, applied when a field is read.
 *
 * A rejected submission is echoed back into `defaultValue` so nothing
 * typed is lost, which means an over-long value is reflected as well as
 * received: a 20 KB paste came back as roughly 60 KB of HTML, so the form
 * was a modest amplifier for anyone who wanted one. Truncating at read
 * time bounds the response without weakening a single rule — a value cut
 * to 2000 characters is still longer than every cap it could have broken,
 * so the same field still fails with the same message.
 *
 * The echo therefore stays faithful for every submission a person could
 * plausibly have typed, and is truncated only past the point where the
 * submission is provably invalid whatever the rest of it said.
 */
const MAX_FIELD = 2000;

/** Deliberately loose. The authority on whether an address exists is a
    delivered mail, not a regex — this only rejects obvious nonsense. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/**
 * C0 control characters, DEL, and the two Unicode line separators.
 *
 * `name` and `email` are single-line values that a mail integration will
 * put into a header — a `From:` display name, a `Subject:`, a `Reply-To:`.
 * A header ends at a line break, so a value carrying one is not a name
 * with an odd character in it: it is a second header. Nothing a person
 * types into either field needs any character in this set.
 *
 * U+2028 and U+2029 are not C0, but they terminate a line to enough
 * parsers to belong in a rule about values that must stay on one.
 */
const CONTROL_IN_LINE = /[\u0000-\u001F\u007F\u2028\u2029]/;

/**
 * The same set for `message`, minus tab (09), newline (0A) and carriage
 * return (0D).
 *
 * `message` is a textarea, so line breaks are its content rather than an
 * anomaly in it, and the value becomes a mail body rather than a header.
 * Rejecting newlines here would be rejecting the field. The rest of C0 —
 * NUL, the escape and shift codes — is still nothing anyone types, and
 * being a body is not a licence to carry them.
 */
const CONTROL_IN_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Characters that render as nothing: zero-width space, non-joiner and
 * joiner, the bidi marks and overrides, the word joiner, the BOM.
 *
 * These are neither rejected nor stripped. U+200C and U+200D are load
 * bearing in Devanagari and other Indic scripts — stripping them would
 * mangle names this site exists to serve, and rejecting them would refuse
 * those names outright. Both are edits to a person's own name that we
 * have no standing to make.
 *
 * So they are only discounted when asking whether a name has enough
 * substance to be a name. A name of two U+200B is two characters and
 * nobody's name; it now fails the minimum, while a Devanagari name
 * spelled with U+200C between its letters does not.
 */
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;

const WHITESPACE = /\s/u;

export type ContactField =
  | "name"
  | "email"
  | "phone"
  | "investmentRange"
  | "message";

/** The two inputs the form carries that are not part of the enquiry: the
    honeypot, and the client's claim about how long the form took to fill.
    Neither is stored, echoed, or shown. */
type ControlField = "website" | "elapsedMs";

/** Echoed back so a rejected submission does not lose what was typed —
    React resets an uncontrolled form once its action settles. */
export type ContactValues = Record<ContactField, string>;

/**
 * Why a submission was refused before delivery was attempted.
 *
 * The honeypot and the fill-time floor deliberately share one value: a
 * prober who can tell which of the two they tripped can tune around the
 * one they tripped. "rate-limited" is separate because it is the only
 * refusal here that a real visitor can act on — wait, and try again.
 */
export type BlockReason = "automated" | "rate-limited";

export type ContactState =
  | { status: "idle" }
  | {
      status: "invalid";
      errors: Partial<Record<ContactField, string>>;
      values: ContactValues;
    }
  /** Refused by a bot or abuse control; delivery was never attempted. */
  | { status: "blocked"; reason: BlockReason; values: ContactValues }
  /** Validated fine, but there is no configured way to deliver it. */
  | { status: "unconfigured"; values: ContactValues }
  /** A configured provider was reached and refused or failed. */
  | { status: "error"; values: ContactValues }
  | { status: "sent" };

type Enquiry = {
  name: string;
  email: string;
  /** Normalised to a bare 10-digit Indian mobile number. */
  phone: string;
  investmentRange: string;
  message: string;
  receivedAt: string;
};

type Delivery = "delivered" | "unconfigured";

/* ============================================================
   Abuse controls.

   Nothing here makes the form harder to submit for the person filling it
   in, and nothing here is load bearing today: an unthrottled form only
   burns CPU while `deliverEnquiry` returns before transmitting. The bill
   arrives the day delivery is wired, when the same flood becomes mail at
   info@sifinsight.com and a sender reputation to repair. These controls
   go in first so that day is a configuration change and not an incident.

   `/contact` is statically prerendered, so every visitor is served the
   same HTML and the same Server Action id, and that id is cacheable for
   a year. No hidden value in the markup can be per-visitor, which rules
   out a signed nonce or a server-stamped timestamp as the basis for any
   of this.

   Next's own cross-origin check on Server Actions rejects a mismatched
   `Origin`, and correctly stops a third-party page submitting this form.
   That is a CSRF control, not a bot control: a request carrying no
   `Origin` header at all is accepted, and a script posting directly has
   no reason to send one. Nothing below is a substitute for that check,
   and nothing below is helped by it.
   ============================================================ */

/**
 * The shortest plausible gap between the form becoming interactive and a
 * person pressing submit.
 *
 * Set low on purpose. A false positive costs a real enquiry, and a
 * visitor whose browser autofills every field can be ready to submit
 * almost at once; a false negative costs one bot request that the bot
 * could have avoided anyway by sending a larger number. Two seconds
 * catches only the class that does not think about the field at all.
 */
const MIN_FILL_MS = 2000;

/**
 * In-process rate limit.
 *
 * BE CLEAR ABOUT WHAT THIS IS. It is a `Map` in one Node process. It does
 * not survive a serverless cold start, it is not shared between instances
 * or regions, and a dev-server rebuild resets it. On any host that scales
 * horizontally the effective limit is this limit multiplied by however
 * many instances happen to be warm — a number neither this file nor its
 * reader can know.
 *
 * So it is a first line of defence and NOT the durable control. The
 * durable control is one of:
 *   - a shared counter in a store that outlives the process (Vercel KV,
 *     Upstash Redis, or any Redis with an atomic INCR plus EXPIRE), keyed
 *     exactly as this is; or
 *   - a rate-limiting rule at the edge, in front of the function — the
 *     platform's WAF (Vercel Firewall, Cloudflare) — which is the only
 *     option that also stops the request costing anything to serve.
 *
 * Either belongs in the same place this sits, in front of
 * `deliverEnquiry`, and this can then stay as the backstop for when the
 * shared store is unreachable. Next's own guidance says the same thing —
 * "in addition to code-based checks, enable any rate limiting features
 * provided by your host" (docs/app/guides/backend-for-frontend, and the
 * Rate limiting note under data-security, which names sending email as
 * the expensive operation worth protecting).
 */
const RATE_WINDOW_MS = 10 * 60_000;
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;

/** Above this many live keys the table is dropped whole. It is a cache of
    recent behaviour, not a ledger, and losing it lets a flood through —
    which is precisely the moment the durable control above is the one
    doing the work. Better that than an unbounded map. */
const MAX_TRACKED_KEYS = 5000;

/** key -> timestamps of the submissions that were allowed through. */
const recentSubmissions = new Map<string, number[]>();

/**
 * Normalise an Indian mobile number typed however the visitor types it —
 * `+91 92055 23100`, `092055-23100`, `0091 92055 23100`, `9205523100`.
 *
 * Length-aware on purpose: stripping a leading "91" unconditionally would
 * mangle `9198765432`, which is itself a valid 10-digit mobile number.
 * That is also why each prefix is paired with the one length it can have
 * when it really is a prefix.
 */
function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");

  // 0091 is the IDD spelling of +91 — 00 for international access, then 91.
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  // SEBI-market mobile numbers begin 6–9. Landlines are not accepted here
  // because the follow-up is a call or a WhatsApp message.
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** How much of a value is actually there: code points that are neither
    whitespace nor zero-width. Counted in code points rather than UTF-16
    units, so a surrogate pair counts once. */
function substanceLength(value: string): number {
  return Array.from(value.replace(ZERO_WIDTH, "")).filter(
    (character) => !WHITESPACE.test(character),
  ).length;
}

function readField(
  formData: FormData,
  key: ContactField | ControlField,
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";
}

/**
 * Judge the client's claim about how long the form took to fill.
 *
 * The duration is measured in the browser and sent in a hidden field,
 * which makes it a claim and not a measurement: anyone posting to the
 * action directly can send `elapsedMs=60000` and this returns false. It
 * is a speed bump for the naive case — a headless browser that drives the
 * real form and submits the instant it has filled it — and it is not a
 * guarantee of anything.
 *
 * An absent or unreadable claim FAILS OPEN. A form submitted with
 * JavaScript disabled sends the field's rendered default and makes no
 * claim at all; refusing that visitor in order to inconvenience a bot
 * that can simply send a number instead trades a real enquiry for
 * nothing. What covers the no-claim case is the rate limit below, which
 * depends on nothing the client says.
 */
function submittedTooFast(claim: string): boolean {
  if (!claim) return false;
  const elapsed = Number(claim);
  if (!Number.isFinite(elapsed) || elapsed < 0) return false;
  return elapsed < MIN_FILL_MS;
}

/**
 * The client's IP, as reported by whatever sits in front of this.
 *
 * `x-forwarded-for` is client-supplied unless a trusted proxy overwrites
 * it, which the host does in production and nothing does locally. A
 * determined bot can therefore rotate the header and take a fresh bucket
 * per request — another reason the durable control belongs at the edge,
 * where the address is observed rather than asserted.
 *
 * `headers()` is async in Next 16 and must be awaited. Reading it here
 * does not affect the static prerender of `/contact`: this runs at
 * request time inside the action, not during the page's render.
 */
async function clientIp(): Promise<string | null> {
  const requestHeaders = await headers();

  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return requestHeaders.get("x-real-ip")?.trim() || null;
}

/** Record a submission against `key`, or report that the key has already
    spent its allowance for the current window. Only allowed submissions
    are recorded, so a refusal does not extend its own window. */
function spendAllowance(key: string, limit: number, now: number): boolean {
  const live = (recentSubmissions.get(key) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );

  if (live.length >= limit) {
    recentSubmissions.set(key, live);
    return false;
  }

  live.push(now);
  recentSubmissions.set(key, live);
  return true;
}

function prune(now: number): void {
  for (const [key, hits] of recentSubmissions) {
    const live = hits.filter((at) => now - at < RATE_WINDOW_MS);
    if (live.length === 0) recentSubmissions.delete(key);
    else recentSubmissions.set(key, live);
  }

  if (recentSubmissions.size > MAX_TRACKED_KEYS) recentSubmissions.clear();
}

/**
 * Per-IP and per-email, both, because each covers the other's blind spot:
 * one address submitting from many networks, and one network submitting
 * many addresses.
 *
 * When no IP can be resolved the per-IP bucket is SKIPPED rather than
 * collapsed into one shared key. A shared key would let a single bot
 * spend the allowance of every visitor behind the same missing header,
 * turning a rate limit into a self-inflicted outage of the enquiry form.
 * Per-email still applies in that case.
 *
 * Both allowances are spent even when the first has already failed, so
 * the two counts stay independent of the order they are checked in.
 */
function isRateLimited(ip: string | null, email: string): boolean {
  const now = Date.now();
  prune(now);

  const withinIpLimit =
    ip === null || spendAllowance(`ip:${ip}`, MAX_PER_IP, now);
  const withinEmailLimit = spendAllowance(
    `email:${email.toLowerCase()}`,
    MAX_PER_EMAIL,
    now,
  );

  return !withinIpLimit || !withinEmailLimit;
}

/**
 * THE INTEGRATION POINT.
 *
 * Everything needed to ship email delivery lives in this function and
 * nowhere else. It is intentionally dependency-free: neither `resend` nor
 * `nodemailer` is installed in this project, and adding one is a decision
 * for whoever wires the provider, not for the page that renders the form.
 */
async function deliverEnquiry(enquiry: Enquiry): Promise<Delivery> {
  const apiKey = process.env.CONTACT_EMAIL_PROVIDER_KEY;

  // No key, no delivery path. Say so rather than swallowing the message.
  if (!apiKey) return "unconfigured";

  /* ------------------------------------------------------------------
     TODO(contact-delivery): send `enquiry` to the transactional email
     provider and return "delivered" only once it has accepted the message.

       Env var  : CONTACT_EMAIL_PROVIDER_KEY   (server-only — no NEXT_PUBLIC_
                  prefix, or the key ships to the browser)
       Set in   : .env.local for development, the host's environment for
                  production. Never commit it.
       Recipient: info@sifinsight.com

       Shape    : stated as what IS checked rather than as "validated and
                  normalised", because the gap between those two is where
                  the next bug goes.

                  GUARANTEED
                    phone            ten digits, no punctuation, begins 6–9.
                    investmentRange  one of INVESTMENT_RANGES, exactly.
                    name, email      non-empty, trimmed, length-capped, and
                                     free of every C0 control character, of
                                     DEL, and of U+2028/U+2029 — so neither
                                     can end a header line or begin a second
                                     one.
                    email            additionally matches EMAIL_SHAPE, which
                                     is a shape check and not evidence that
                                     the address exists.
                    message          may be EMPTY, and may legitimately carry
                                     tabs, newlines and carriage returns. It
                                     is body text. Do not put it in a header.

                  NOT GUARANTEED
                    That `name` is a person's name, that `email` belongs to
                    whoever typed it, or that any field is free of Unicode
                    formatting characters — bidi controls and zero-width
                    joiners are accepted on purpose, because rejecting them
                    would reject legitimate Indic names.

                  So encode for the context you are writing into. A value
                  that cannot break a header can still be misread by an HTML
                  renderer or a JSON parser. "Validated" here means "checked
                  against the rules above" and never "safe to concatenate".

     A provider SDK is not installed. Implement with `fetch` against the
     provider's REST API, or install one and call it here — either way this
     function stays the only thing that changes.

     Until that call exists an API key alone still delivers nothing, so we
     keep returning the honest result. Do not "optimistically" return
     "delivered" from here.
     ------------------------------------------------------------------ */
  void enquiry; // Intentionally unused until the provider call above lands.
  return "unconfigured";
}

export async function submitContactEnquiry(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values: ContactValues = {
    name: readField(formData, "name"),
    email: readField(formData, "email"),
    phone: readField(formData, "phone"),
    investmentRange: readField(formData, "investmentRange"),
    message: readField(formData, "message"),
  };

  /* The honeypot, checked before anything else because it costs nothing
     and is the one signal here that a person cannot produce deliberately
     — the field is off-screen, out of the tab order, and hidden from
     assistive technology (see ContactForm.tsx).

     WHAT THE RESPONSE SHOULD BE is the interesting question. Reporting
     success to a suspected bot teaches it nothing, and that is the
     standard advice. This file will not do it. `{ status: "sent" }` means
     a provider accepted the message; it is the one claim this rewrite
     exists to stop the form making falsely, and re-introducing the lie
     for a class of visitor picked out by a heuristic aims it squarely at
     whoever the heuristic gets wrong — a password manager that filled a
     field it should not have, and a real enquiry lost in silence.

     The anti-bot value of lying is small in any case. What protects the
     mailbox is that the submission never reaches delivery, not the bot's
     belief about it; a bot that retries costs us a rejected request, not
     an email. So: refuse honestly, say nothing about which control did
     the refusing, and show the direct channels — a false positive then
     still leaves the visitor with a way to reach us, which a silent fake
     success does not. */
  if (readField(formData, "website")) {
    return { status: "blocked", reason: "automated", values };
  }

  const errors: Partial<Record<ContactField, string>> = {};

  if (!values.name) {
    errors.name = "Enter your name so we know who we are replying to.";
  } else if (CONTROL_IN_LINE.test(values.name)) {
    errors.name =
      "That name contains characters we cannot put in an email. Remove any line breaks.";
  } else if (substanceLength(values.name) < 2) {
    // Substance rather than `.length`: two zero-width characters are two
    // characters and nothing anyone is called.
    errors.name = "That name looks too short.";
  } else if (values.name.length > MAX_NAME) {
    errors.name = `Keep your name under ${MAX_NAME} characters.`;
  }

  /* `EMAIL_SHAPE` excludes `\s`, which happens to exclude CR, LF and tab
     — the three characters a header injection needs. That is a side
     effect of describing the shape of an address, not a defence anybody
     chose, and it does not exclude NUL or the rest of C0. The explicit
     check is the one the contract above is allowed to rest on. */
  if (!values.email) {
    errors.email = "Enter an email address we can reply to.";
  } else if (
    CONTROL_IN_LINE.test(values.email) ||
    values.email.length > MAX_EMAIL ||
    !EMAIL_SHAPE.test(values.email)
  ) {
    errors.email = "That does not look like an email address.";
  }

  // Capped before normalising: `normalisePhone` runs a regex over the
  // whole string, and no phone number is worth that at 20 KB.
  const phone =
    values.phone.length > MAX_PHONE ? null : normalisePhone(values.phone);
  if (!values.phone) {
    errors.phone = "Enter a mobile number we can reach you on.";
  } else if (values.phone.length > MAX_PHONE) {
    errors.phone = `Keep your mobile number under ${MAX_PHONE} characters.`;
  } else if (!phone) {
    errors.phone =
      "Enter a 10-digit Indian mobile number, with or without +91.";
  }

  if (!values.investmentRange) {
    errors.investmentRange = "Choose the range you are considering.";
  } else if (!INVESTMENT_RANGES.includes(values.investmentRange)) {
    errors.investmentRange = "Choose one of the listed ranges.";
  }

  // Message is optional — but a capped field is a validated field.
  if (CONTROL_IN_TEXT.test(values.message)) {
    errors.message =
      "That message contains control characters we cannot send. Line breaks are fine.";
  } else if (values.message.length > MAX_MESSAGE) {
    errors.message = `Keep your message under ${MAX_MESSAGE} characters.`;
  }

  // `|| !phone` is unreachable once `errors` is empty, but it is what
  // narrows `phone` to a string below without reaching for a cast.
  if (Object.keys(errors).length > 0 || !phone) {
    return { status: "invalid", errors, values };
  }

  /* The remaining two controls sit here: after validation, in front of
     delivery. A visitor correcting a typo three times should not spend an
     allowance on submissions that were never going to become mail, and a
     bot should not be able to drain somebody else's allowance with
     submissions that would have been rejected anyway. Only what would
     have been delivered is counted. */
  if (submittedTooFast(readField(formData, "elapsedMs"))) {
    return { status: "blocked", reason: "automated", values };
  }

  if (isRateLimited(await clientIp(), values.email)) {
    /* No address and no IP in the log line. That a limit tripped is
       operationally useful; who tripped it is personal data we have no
       reason to keep, for the same reason as the catch block below. */
    console.warn("[contact] enquiry refused: rate limit reached.");
    return { status: "blocked", reason: "rate-limited", values };
  }

  const enquiry: Enquiry = {
    name: values.name,
    email: values.email,
    phone,
    investmentRange: values.investmentRange,
    message: values.message,
    receivedAt: new Date().toISOString(),
  };

  try {
    const delivery = await deliverEnquiry(enquiry);
    if (delivery === "delivered") return { status: "sent" };
    return { status: "unconfigured", values };
  } catch {
    /* Nothing from `enquiry` is logged. It is a name, an email, a phone
       number and a stated investment size — logging it would scatter
       personal data across host log retention for no operational gain. */
    console.error("[contact] enquiry delivery threw; nothing was sent.");
    return { status: "error", values };
  }
}
