# Amendments — wave 2G (leads)

- Lead delivery is Resend (REST, no SDK) configured by env: `RESEND_API_KEY`, `LEAD_FROM_EMAIL` (required), `LEAD_TO_EMAIL` (optional, defaults to `SITE.email`). Missing ⇒ forms render an honest "not sent" state with direct channels. `.env.example` (F2) should list these three.
- `server-only` is not installed and new deps are out of scope, so `lib/leads/deliver.ts` guards with a runtime `typeof window` throw; it is imported only from `lib/leads/actions.ts`.
- The rate limit (`lib/leads/rate-limit.ts`) is per-instance and not durable; a shared counter or edge WAF rule is the durable control.
- Two sessionStorage keys are sanctioned site-wide: `sif:lead-popup:v1`, `sif:lead:sent` (disclosed on /privacy, names imported from `lib/leads/schema`).
- /privacy states a 24-month retention period and DPDP Act 2023 consent basis — operator to confirm.
- TrustLoop now lives on /contact ("How we work"); remove it from `app/page.tsx` and mount `<LeadPopup />` there (integrator).
