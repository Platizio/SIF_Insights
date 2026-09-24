import { SITE } from "@/lib/site";
import type { Lead } from "./schema";

/* ============================================================
   Lead delivery — one email per lead, via Resend's REST API.

   SERVER ONLY. The `server-only` package is not installed in this project
   (and new dependencies are out of scope), so the guard is this runtime
   check instead: the module reads a secret from process.env and must never
   reach a client bundle. Import it only from lib/leads/actions.ts.

   Result semantics — the form's honesty depends on these:
     "unconfigured"  RESEND_API_KEY or LEAD_FROM_EMAIL is not set. Nothing
                     was attempted.
     "delivered"     Resend answered 2xx WITH a message id. Nothing less
                     counts: a 2xx without an id is not proof of acceptance.
     "error"         anything else — 4xx/5xx, a timeout, a network failure,
                     an unreadable body.

   Logging: status codes and error names only. Never the lead, never the
   response body (it can echo addresses back).
   ============================================================ */

if (typeof window !== "undefined") {
  throw new Error("lib/leads/deliver is server-only.");
}

export type Delivery = "delivered" | "unconfigured" | "error";

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

const KIND_LABEL: Record<Lead["kind"], string> = {
  popup: "call-back",
  consultation: "consultation",
};

/** Plain text, one field per line. Values are body text, never headers. */
export function leadEmailText(lead: Lead): string {
  const line = (label: string, value: string | null) =>
    `${label}: ${value ?? "Not provided"}`;
  return [
    `New ${KIND_LABEL[lead.kind]} enquiry from sifinsight.com`,
    "",
    line("Name", lead.name),
    line("Mobile", `+91 ${lead.phone}`),
    line("Email", lead.email),
    ...(lead.kind === "consultation"
      ? [line("Preferred time", lead.preferredTime), line("Investment range", lead.investmentRange)]
      : []),
    "",
    lead.kind === "popup" ? "What they are looking for:" : "Message:",
    lead.message ?? "Not provided",
    "",
    line("Consent", `Ticked — "${lead.consent}"`),
    line("Submitted at", lead.submittedAt),
    line("Source page", lead.sourcePage),
    line("Reference", lead.id),
  ].join("\n");
}

export async function deliverLead(lead: Lead): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_FROM_EMAIL;
  if (!key || !from) return "unconfigured";

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": lead.id,
      },
      body: JSON.stringify({
        from,
        to: [process.env.LEAD_TO_EMAIL || SITE.email],
        reply_to: lead.email || undefined,
        // No user data in the subject: subjects are indexed and previewed.
        subject: `New ${KIND_LABEL[lead.kind]} enquiry — SIF Insight`,
        text: leadEmailText(lead),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[leads] delivery refused: HTTP ${response.status}`);
      return "error";
    }

    const body: unknown = await response.json().catch(() => null);
    const id =
      body && typeof body === "object" && "id" in body ? (body as { id: unknown }).id : null;
    if (typeof id !== "string" || id === "") {
      console.error(`[leads] delivery unconfirmed: HTTP ${response.status} without an id`);
      return "error";
    }
    return "delivered";
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error(`[leads] delivery failed: ${name}`);
    return "error";
  }
}
