"use server";

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
const MAX_MESSAGE = 1200;

/** Deliberately loose. The authority on whether an address exists is a
    delivered mail, not a regex — this only rejects obvious nonsense. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export type ContactField =
  | "name"
  | "email"
  | "phone"
  | "investmentRange"
  | "message";

/** Echoed back so a rejected submission does not lose what was typed —
    React resets an uncontrolled form once its action settles. */
export type ContactValues = Record<ContactField, string>;

export type ContactState =
  | { status: "idle" }
  | {
      status: "invalid";
      errors: Partial<Record<ContactField, string>>;
      values: ContactValues;
    }
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

/**
 * Normalise an Indian mobile number typed however the visitor types it —
 * `+91 92055 23100`, `092055-23100`, `9205523100`.
 *
 * Length-aware on purpose: stripping a leading "91" unconditionally would
 * mangle `9198765432`, which is itself a valid 10-digit mobile number.
 */
function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  // SEBI-market mobile numbers begin 6–9. Landlines are not accepted here
  // because the follow-up is a call or a WhatsApp message.
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function readField(formData: FormData, key: ContactField): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
       Shape    : `enquiry` above is already validated and normalised.

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

  const errors: Partial<Record<ContactField, string>> = {};

  if (!values.name) {
    errors.name = "Enter your name so we know who we are replying to.";
  } else if (values.name.length < 2) {
    errors.name = "That name looks too short.";
  } else if (values.name.length > MAX_NAME) {
    errors.name = `Keep your name under ${MAX_NAME} characters.`;
  }

  if (!values.email) {
    errors.email = "Enter an email address we can reply to.";
  } else if (values.email.length > MAX_EMAIL || !EMAIL_SHAPE.test(values.email)) {
    errors.email = "That does not look like an email address.";
  }

  const phone = normalisePhone(values.phone);
  if (!values.phone) {
    errors.phone = "Enter a mobile number we can reach you on.";
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
  if (values.message.length > MAX_MESSAGE) {
    errors.message = `Keep your message under ${MAX_MESSAGE} characters.`;
  }

  // `|| !phone` is unreachable once `errors` is empty, but it is what
  // narrows `phone` to a string below without reaching for a cast.
  if (Object.keys(errors).length > 0 || !phone) {
    return { status: "invalid", errors, values };
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
