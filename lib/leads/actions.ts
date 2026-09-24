"use server";

import { headers } from "next/headers";
import { deliverLead } from "./deliver";
import { allowLead } from "./rate-limit";
import { CONSENT_COPY, type Lead, type LeadKind, type LeadState } from "./schema";
import {
  honeypotFilled,
  readField,
  readSourcePage,
  readValues,
  submittedTooFast,
  validateLead,
} from "./validate";

/* ============================================================
   Lead Server Actions — the popup (submitLead) and the consultation form
   (submitConsultation). Exports ONLY async functions ("use server").

   Order: honeypot → validation → fill-time floor → rate limit → delivery.
   Only a submission that would have been delivered spends an allowance.

   NEVER report success that cannot be proved. "sent" means Resend
   accepted the message and returned an id; every other outcome tells the
   visitor their details were NOT sent and shows the direct channels.
   A bot is refused honestly too — a fake thank-you aimed at a heuristic
   lands on whoever the heuristic gets wrong.
   ============================================================ */

/** The client IP as the host reports it. Client-supplied without a trusted
    proxy, which is one more reason the durable limit belongs at the edge. */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || null;
}

async function handle(kind: LeadKind, formData: FormData): Promise<LeadState> {
  if (honeypotFilled(formData)) {
    return { status: "blocked", reason: "automated", values: readValues(formData) };
  }

  const result = validateLead(kind, formData);
  if (!result.ok) {
    return { status: "invalid", errors: result.errors, values: result.values };
  }
  const { values, echo } = result;

  if (submittedTooFast(readField(formData, "elapsedMs"))) {
    return { status: "blocked", reason: "automated", values: echo };
  }

  if (!allowLead({ ip: await clientIp(), phone: values.phone, email: values.email })) {
    console.warn("[leads] submission refused: rate limit reached.");
    return { status: "blocked", reason: "rate-limited", values: echo };
  }

  const lead: Lead = {
    id: crypto.randomUUID(),
    kind,
    ...values,
    consent: CONSENT_COPY,
    submittedAt: new Date().toISOString(),
    sourcePage: readSourcePage(formData),
  };

  const delivery = await deliverLead(lead);
  if (delivery === "delivered") return { status: "sent" };
  if (delivery === "unconfigured") return { status: "unconfigured", values: echo };
  return { status: "error", values: echo };
}

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  return handle("popup", formData);
}

export async function submitConsultation(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  return handle("consultation", formData);
}
