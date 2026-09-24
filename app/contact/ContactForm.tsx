import { Eyebrow } from "@/components/primitives";
import { LeadForm } from "@/components/leads/LeadForm";

/**
 * The consultation form card on /contact.
 *
 * A server component: the card chrome is static, and the form itself is
 * the shared client island `components/leads/LeadForm` posting to
 * `lib/leads/actions.ts#submitConsultation`. (The old
 * `app/contact/actions.ts` is no longer imported by anything.)
 */
export function ContactForm() {
  return (
    <div className="border border-hairline bg-surface p-6 sm:p-10">
      <Eyebrow>Request a call-back</Eyebrow>
      <h2 className="mt-5 text-[22px] font-medium leading-[30px] text-ink">
        Tell us how to reach you.
      </h2>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-[26px] text-body">
        Name and mobile number are all we need. The rest helps us prepare —
        every other field is optional.
      </p>
      <div aria-hidden="true" className="mt-8 h-px bg-hairline" />
      <LeadForm kind="consultation" className="mt-8" />
    </div>
  );
}
