/* ============================================================
   In-process rate limit for lead submissions.

   BE CLEAR ABOUT WHAT THIS IS: a `Map` in one Node process. It is PER
   INSTANCE and NOT DURABLE — it does not survive a cold start, is not
   shared between instances or regions, and a dev rebuild resets it. On a
   host that scales horizontally the effective limit is this one times the
   number of warm instances.

   It is the backstop, not the control. The durable control is a shared
   counter (Upstash/Vercel KV: atomic INCR + EXPIRE keyed exactly as below)
   or a WAF rate-limit rule at the edge in front of the function.

   Buckets, each within a rolling 10-minute window:
     ip     5   — one network sending many identities
     phone  3   — one identity sent from many networks
     email  3   — only when an email was given
   Only submissions that would have been delivered are counted, and a
   refusal does not extend its own window.

   What it keeps (disclosed on /privacy): timestamps against the IP, the
   normalised mobile number and the lower-cased email. In memory only.
   ============================================================ */

export const RATE_WINDOW_MS = 10 * 60_000;
export const RATE_LIMITS = { ip: 5, phone: 3, email: 3 } as const;

/** Above this many live keys the table is dropped whole — a cache of
    recent behaviour, not a ledger. Better than an unbounded map. */
const MAX_TRACKED_KEYS = 5000;

const recent = new Map<string, number[]>();

function live(key: string, now: number): number[] {
  return (recent.get(key) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
}

function prune(now: number): void {
  for (const key of recent.keys()) {
    const hits = live(key, now);
    if (hits.length === 0) recent.delete(key);
    else recent.set(key, hits);
  }
  if (recent.size > MAX_TRACKED_KEYS) recent.clear();
}

/**
 * Checks every applicable bucket and, only if all have allowance left,
 * records the submission against each. Returns true when allowed.
 *
 * A missing IP SKIPS the IP bucket rather than collapsing into one shared
 * key — otherwise one bot could spend every header-less visitor's allowance.
 */
export function allowLead(
  keys: { ip: string | null; phone: string; email: string | null },
  now: number = Date.now(),
): boolean {
  prune(now);

  const buckets: [string, number][] = [[`phone:${keys.phone}`, RATE_LIMITS.phone]];
  if (keys.ip) buckets.push([`ip:${keys.ip}`, RATE_LIMITS.ip]);
  if (keys.email) buckets.push([`email:${keys.email.toLowerCase()}`, RATE_LIMITS.email]);

  const withinAll = buckets.every(([key, limit]) => live(key, now).length < limit);
  if (!withinAll) return false;

  for (const [key] of buckets) recent.set(key, [...live(key, now), now]);
  return true;
}

/** Tests only. */
export function resetRateLimits(): void {
  recent.clear();
}
