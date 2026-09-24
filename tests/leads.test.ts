/**
 * Lead capture: validation rules, the in-memory rate limit, and the
 * delivery contract ("delivered" only on 2xx WITH an id).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deliverLead, leadEmailText } from "@/lib/leads/deliver";
import { RATE_LIMITS, RATE_WINDOW_MS, allowLead, resetRateLimits } from "@/lib/leads/rate-limit";
import { CONSENT_COPY, type Lead } from "@/lib/leads/schema";
import {
  honeypotFilled,
  normalisePhone,
  readSourcePage,
  submittedTooFast,
  validateLead,
} from "@/lib/leads/validate";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const VALID = { name: "Asha Rao", phone: "+91 92055 23100", consent: "yes" };

describe("normalisePhone", () => {
  it.each([
    ["9205523100", "9205523100"],
    ["+91 92055 23100", "9205523100"],
    ["+91-92055-23100", "9205523100"],
    ["092055 23100", "9205523100"],
    ["0091 92055 23100", "9205523100"],
    ["919205523100", "9205523100"],
    ["9198765432", "9198765432"], // itself a valid mobile — not stripped
    ["6000000000", "6000000000"],
  ])("accepts %s", (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected);
  });

  it.each(["5205523100", "92055231", "92055231001", "+1 415 555 0100", "", "abcdefghij"])(
    "rejects %s",
    (raw) => {
      expect(normalisePhone(raw)).toBeNull();
    },
  );
});

describe("validateLead", () => {
  it("accepts a popup lead with only name, mobile and consent", () => {
    const result = validateLead("popup", form(VALID));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({
      name: "Asha Rao",
      phone: "9205523100",
      email: null,
      message: null,
      preferredTime: null,
      investmentRange: null,
    });
  });

  it("requires name, mobile and consent", () => {
    const result = validateLead("consultation", form({}));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["consent", "name", "phone"]);
  });

  it("refuses without consent even when everything else is valid", () => {
    const result = validateLead("popup", form({ ...VALID, consent: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors)).toEqual(["consent"]);
    expect(result.values.name).toBe("Asha Rao"); // echoed back
  });

  it("treats email as optional but checks its shape when given", () => {
    expect(validateLead("popup", form({ ...VALID, email: "" })).ok).toBe(true);
    expect(validateLead("popup", form({ ...VALID, email: "asha@example.in" })).ok).toBe(true);
    const bad = validateLead("popup", form({ ...VALID, email: "asha@" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.email).toBeDefined();
  });

  it("rejects control characters in single-line fields", () => {
    const result = validateLead("popup", form({ ...VALID, name: "Asha Bcc: x" }));
    expect(result.ok).toBe(false);
    const email = validateLead("popup", form({ ...VALID, email: "a@b.in\r\nBcc: c@d.in" }));
    expect(email.ok).toBe(false);
  });

  it("caps the popup message at 600 and the consultation message at 1200", () => {
    const long = "x".repeat(601);
    expect(validateLead("popup", form({ ...VALID, message: long })).ok).toBe(false);
    expect(validateLead("consultation", form({ ...VALID, message: long })).ok).toBe(true);
    expect(validateLead("consultation", form({ ...VALID, message: "x".repeat(1201) })).ok).toBe(
      false,
    );
  });

  it("maps consultation options to labels and rejects unknown ids", () => {
    const ok = validateLead(
      "consultation",
      form({ ...VALID, preferredTime: "evening", investmentRange: "25-50L" }),
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.values.preferredTime).toBe("Evening 4–7");
      expect(ok.values.investmentRange).toBe("₹25–50 L");
    }
    expect(validateLead("consultation", form({ ...VALID, preferredTime: "midnight" })).ok).toBe(
      false,
    );
  });

  it("ignores consultation-only fields on the popup", () => {
    const result = validateLead("popup", form({ ...VALID, preferredTime: "midnight" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.values.preferredTime).toBeNull();
  });
});

describe("bot controls", () => {
  it("flags a filled honeypot", () => {
    expect(honeypotFilled(form({ website: "" }))).toBe(false);
    expect(honeypotFilled(form({ website: "http://spam" }))).toBe(true);
  });

  it("applies the 2 s fill-time floor and fails open on no claim", () => {
    expect(submittedTooFast("500")).toBe(true);
    expect(submittedTooFast("1999")).toBe(true);
    expect(submittedTooFast("2000")).toBe(false);
    expect(submittedTooFast("")).toBe(false);
    expect(submittedTooFast("not-a-number")).toBe(false);
  });

  it("accepts only same-site pathnames as the source page", () => {
    expect(readSourcePage(form({ sourcePage: "/contact" }))).toBe("/contact");
    expect(readSourcePage(form({ sourcePage: "//evil.example" }))).toBe("unknown");
    expect(readSourcePage(form({ sourcePage: "https://evil.example" }))).toBe("unknown");
    expect(readSourcePage(form({}))).toBe("unknown");
  });
});

describe("allowLead", () => {
  beforeEach(() => resetRateLimits());

  it("allows 3 per phone per window, then refuses", () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMITS.phone; i++) {
      expect(allowLead({ ip: `10.0.0.${i}`, phone: "9205523100", email: null }, now + i)).toBe(true);
    }
    expect(allowLead({ ip: "10.0.0.99", phone: "9205523100", email: null }, now + 10)).toBe(false);
    expect(
      allowLead({ ip: "10.0.0.99", phone: "9205523100", email: null }, now + RATE_WINDOW_MS + 10),
    ).toBe(true);
  });

  it("allows 5 per IP across different phones", () => {
    const now = 2_000_000;
    for (let i = 0; i < RATE_LIMITS.ip; i++) {
      expect(allowLead({ ip: "1.2.3.4", phone: `900000000${i}`, email: null }, now)).toBe(true);
    }
    expect(allowLead({ ip: "1.2.3.4", phone: "9111111111", email: null }, now)).toBe(false);
  });

  it("buckets email case-insensitively, only when present", () => {
    const now = 3_000_000;
    for (let i = 0; i < RATE_LIMITS.email; i++) {
      expect(
        allowLead({ ip: null, phone: `800000000${i}`, email: i % 2 ? "A@X.IN" : "a@x.in" }, now),
      ).toBe(true);
    }
    expect(allowLead({ ip: null, phone: "8111111111", email: "a@x.in" }, now)).toBe(false);
    expect(allowLead({ ip: null, phone: "8111111111", email: null }, now)).toBe(true);
  });

  it("does not spend allowance on a refused submission", () => {
    const now = 4_000_000;
    for (let i = 0; i < RATE_LIMITS.phone; i++) {
      allowLead({ ip: null, phone: "7000000000", email: null }, now);
    }
    // Refused for the phone: the IP bucket must not have been charged.
    expect(allowLead({ ip: "5.5.5.5", phone: "7000000000", email: null }, now)).toBe(false);
    for (let i = 0; i < RATE_LIMITS.ip; i++) {
      expect(allowLead({ ip: "5.5.5.5", phone: `710000000${i}`, email: null }, now)).toBe(true);
    }
  });
});

describe("deliverLead", () => {
  const lead: Lead = {
    id: "3f1c2b1e-0000-4000-8000-000000000001",
    kind: "consultation",
    name: "Asha Rao",
    phone: "9205523100",
    email: "asha@example.in",
    message: "Hybrid long-short, please.",
    preferredTime: "Morning 9–12",
    investmentRange: "₹25–50 L",
    consent: CONSENT_COPY,
    submittedAt: "2026-09-23T10:00:00.000Z",
    sourcePage: "/contact",
  };

  const fetchMock = vi.fn();
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("LEAD_FROM_EMAIL", "SIF Insight <leads@example.com>");
    vi.stubEnv("LEAD_TO_EMAIL", "");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("is unconfigured without a key or sender, and makes no request", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await deliverLead(lead)).toBe("unconfigured");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("LEAD_FROM_EMAIL", "");
    expect(await deliverLead(lead)).toBe("unconfigured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is delivered on 2xx with an id, with a well-formed request", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    expect(await deliverLead(lead)).toBe("delivered");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_key");
    expect(headers["Idempotency-Key"]).toBe(lead.id);
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["sifinsights@gmail.com"]);
    expect(body.reply_to).toBe("asha@example.in");
    expect(body.subject).not.toContain("Asha");
    expect(body.subject).not.toContain("9205523100");
    expect(body.text).toContain("9205523100");
    expect(body.text).toContain("Source page: /contact");
    expect(body.text).toContain("Submitted at: 2026-09-23T10:00:00.000Z");
  });

  it("is an error on 2xx without an id", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await deliverLead(lead)).toBe("error");
  });

  it("is an error on 4xx, and never logs personal data", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "asha@example.in invalid" }), { status: 422 }),
    );
    expect(await deliverLead(lead)).toBe("error");
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("422");
    expect(logged).not.toContain("asha");
    expect(logged).not.toContain("9205523100");
  });

  it("is an error on timeout / abort", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    expect(await deliverLead(lead)).toBe("error");
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    expect(await deliverLead(lead)).toBe("error");
  });

  it("omits consultation-only lines from a popup email", () => {
    const text = leadEmailText({ ...lead, kind: "popup", preferredTime: null, investmentRange: null });
    expect(text).not.toContain("Preferred time");
    expect(text).toContain("What they are looking for:");
  });
});
