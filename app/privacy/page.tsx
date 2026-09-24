import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { CONSENT_COPY, LEAD_SENT_KEY, POPUP_SHOWN_KEY } from "@/lib/leads/schema";
import { SITE, mailtoHref, telHref } from "@/lib/site";

/**
 * /privacy
 *
 * EVERY SENTENCE BELOW IS CHECKABLE AGAINST THE CODE. Keep it that way:
 *
 *   the forms         lib/leads/validate.ts decides which fields exist
 *                     (popup: name, mobile, optional email + message;
 *                     consultation: + optional preferred time and range).
 *   delivery          lib/leads/deliver.ts sends one plain-text email per
 *                     lead through Resend to SITE.email (or LEAD_TO_EMAIL),
 *                     and logs status codes only. Nothing is stored in a
 *                     database. When Resend is not configured the form says
 *                     nothing was sent — this page describes the configured
 *                     path, which is the one that handles personal data.
 *   rate limit        lib/leads/rate-limit.ts: in-memory timestamps keyed
 *                     by IP, normalised mobile and lower-cased email.
 *   browser storage   the two sessionStorage keys come from lib/leads/schema
 *                     and are imported here, so the names cannot drift.
 *   video             components/video/VideoDialog.tsx loads the player from
 *                     youtube-nocookie.com only after a click; the stills
 *                     come from img.youtube.com (next.config.ts img-src).
 *   no cookies        nothing in app/ or components/ sets a cookie; there is
 *                     no analytics SDK, tag manager or pixel.
 *
 * The retention period and grievance route below are the operator's stated
 * policy. Change them here the day they change, and bump UPDATED.
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What SIF Insight collects when you ask for a call-back, why, who processes it, how long it is kept and how to exercise your rights under the DPDP Act 2023.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — SIF Insight",
    description:
      "What SIF Insight collects when you ask for a call-back, who processes it, how long it is kept and your rights under the DPDP Act 2023.",
    url: "/privacy",
    /* Declaring `openGraph` drops the root opengraph-image; restated. */
    images: "/opengraph-image.png",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

/**
 * When the SUBSTANCE of this notice last changed. `label` is written out
 * rather than derived from `iso`: `new Date("2026-09-23")` is UTC midnight
 * and would render as the 22nd on any server west of Greenwich.
 */
const UPDATED = { iso: "2026-09-23", label: "23 September 2026" } as const;

const RETENTION_MONTHS = 24;

const INLINE_LINK =
  "text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy Policy"
        lines={["What we collect,", "and what we do with it."]}
        standfirst={
          <>
            SIF Insight collects personal data in one situation only: when you
            ask us to call you back, through the short form on the home page
            or the consultation form on the contact page. This notice says
            what those forms take, why, who handles it on our behalf, how long
            we keep it and how to ask us to change or delete it. We set no
            cookies and run no analytics.
          </>
        }
        meta={[SITE.legalEntity, `Updated ${UPDATED.label}`, "No cookies · No analytics"]}
        aside={
          <Card className="p-8">
            <p className="text-[14px] leading-[20px] text-muted">
              Questions and grievances
            </p>
            <p className="mt-4 text-[17px] leading-[30px] text-body">
              Write or call — both reach the team that handles your enquiry.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={mailtoHref}
                className="[overflow-wrap:anywhere] text-[17px] leading-[26px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
              >
                {SITE.email}
              </a>
              <a
                href={telHref}
                className="tabular text-[17px] leading-[26px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
              >
                {SITE.phoneDisplay}
              </a>
            </div>
          </Card>
        }
      />

      <Operator />
      <Collection />
      <Processing />
      <Browser />
      <Rights />
    </>
  );
}

/* ============================================================
   1 — Operator
   ============================================================ */

function Operator() {
  return (
    <Section id="operator">
      <Shell>
        <SectionHead
          eyebrow="Operator"
          lines={["Who this notice", "comes from."]}
          intro="A notice is worth what the name at the top of it is worth, so the name goes first."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading={SITE.legalEntity}>
            <P>
              SIF Insight is operated by {SITE.legalEntity}, an {SITE.arnLine}.
              We are a distributor of Mutual Funds and Specialised Investment
              Funds — not an asset manager and not an investment adviser. For
              the personal data described here we are the Data Fiduciary under
              India&rsquo;s Digital Personal Data Protection Act, 2023.
            </P>
            <P>
              Write to{" "}
              <a href={mailtoHref} className={INLINE_LINK}>
                {SITE.email}
              </a>
              , call{" "}
              <a href={telHref} className={cn(INLINE_LINK, "tabular")}>
                {SITE.phoneDisplay}
              </a>{" "}
              or write to us at {SITE.address.lines.join(", ")}. Wherever this
              notice says to contact us, it means these.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   2 — What is collected, and why
   ============================================================ */

function Collection() {
  return (
    <Section id="collection">
      <Shell>
        <SectionHead
          eyebrow="What we collect"
          lines={["Two short forms,", "and nothing else."]}
          intro="There are two places on this site where you can type something and send it. Both ask for the least we need to call you back."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="The call-back form">
            <P>
              A short form may appear on the home page after you have been
              there for a while, once per browser session. It asks for your
              name and an Indian mobile number. An email address and a note on
              what you are looking for (up to 600 characters) are optional.
            </P>
          </Clause>

          <Clause index={1} heading="The consultation form">
            <P>
              The{" "}
              <Link href="/contact" className={INLINE_LINK}>
                Book a Consultation
              </Link>{" "}
              page asks for the same name and mobile number, and optionally an
              email address, a preferred time for the call (morning, afternoon
              or evening), the investment range you are considering and a
              message of up to 1,200 characters.
            </P>
            <P>
              Neither form asks for your PAN, holdings, income, date of birth
              or any document, and there is no account to create. Nothing here
              is aimed at children.
            </P>
          </Clause>

          <Clause index={2} heading="What travels with a submission">
            <P>
              Along with what you typed, we record the time you submitted, the
              page you submitted from and the consent sentence you ticked. Two
              hidden inputs — a decoy field only an automated form-filler
              completes, and how long the form was open — are used once to
              tell a script from a person and are not kept.
            </P>
          </Clause>

          <Clause index={3} heading="Why, and on what basis">
            <P>
              We use these details for one purpose: to contact you by call,
              WhatsApp or email about the enquiry you made, and to keep a
              record of that conversation. We do not sell them, share them for
              marketing, or add you to a mailing list.
            </P>
            <P>
              The lawful basis is your consent under section 6 of the DPDP Act
              2023. Neither form can be sent unless you tick the consent box,
              which reads: &ldquo;{CONSENT_COPY}&rdquo; You can withdraw
              consent at any time by contacting us; we will then stop
              contacting you and delete your enquiry, as described below.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   3 — Who processes it, and for how long
   ============================================================ */

function Processing() {
  return (
    <Section id="processors">
      <Shell>
        <SectionHead
          eyebrow="Processors and retention"
          lines={["Who handles it,", "and for how long."]}
          intro="Two services touch an enquiry after you press submit. Both are named here."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="Resend — email delivery">
            <P>
              Your enquiry is sent to us as a single plain-text email through
              Resend, an email-delivery service based in the United States.
              Resend processes the message only to deliver it. Because Resend
              operates outside India, your enquiry is transferred abroad for
              that purpose.
            </P>
          </Clause>

          <Clause index={1} heading="Gmail — our inbox">
            <P>
              The email arrives in our Gmail inbox at{" "}
              <a href={mailtoHref} className={INLINE_LINK}>
                {SITE.email}
              </a>
              , where the team reads it and calls you back. We do not copy it
              into a separate database. The site itself does not log what you
              typed — when a delivery fails, it records only that it failed.
            </P>
          </Clause>

          <Clause index={2} heading="How long we keep it">
            <P>
              We keep an enquiry for {RETENTION_MONTHS} months from the day you
              send it, so that we can follow up and answer questions about our
              conversation, and then delete it. If you ask us to delete it
              sooner, we will.
            </P>
          </Clause>

          <Clause index={3} heading="The limit in front of the forms">
            <P>
              To stop the forms being flooded, the server keeps a short-lived
              count of recent submissions against your IP address, your mobile
              number and, if you gave one, your email address. It keeps
              timestamps only, in the memory of the running server — never on
              disk — and drops each one after ten minutes or when the server
              restarts.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   4 — Your browser
   ============================================================ */

function Browser() {
  return (
    <Section id="browser">
      <Shell>
        <SectionHead
          eyebrow="Your browser"
          lines={["No cookies, no trackers,", "two small notes."]}
          intro="What this site stores in your browser, and the one third party that can, once you ask it to."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="No cookies, no analytics">
            <P>
              We set no cookies — no advertising, analytics or preference
              cookies — and there is no Google Analytics, tag manager,
              advertising pixel or product-analytics SDK on this site. The
              typefaces are served from this domain, so loading a page makes
              no request to Google Fonts.
            </P>
          </Clause>

          <Clause index={1} heading="Two session-storage notes">
            <P>
              The site writes two small entries to your browser&rsquo;s
              session storage, which is cleared when you close the tab:{" "}
              <code className="tabular text-[15px] text-ink">{POPUP_SHOWN_KEY}</code>{" "}
              records that the call-back form has been shown, so it does not
              appear again in the same session, and{" "}
              <code className="tabular text-[15px] text-ink">{LEAD_SENT_KEY}</code>{" "}
              records that you have already sent an enquiry. Neither contains
              your details, and neither is sent to us.
            </P>
          </Clause>

          <Clause index={2} heading="Videos">
            <P>
              The video library on the{" "}
              <Link href="/learn#videos" className={INLINE_LINK}>
                Learn page
              </Link>{" "}
              shows still images served by Google from img.youtube.com, so
              Google sees your IP address and browser when those pages load.
              A player loads only when you click a video, and then from
              youtube-nocookie.com. Once a video plays, YouTube may set its
              own storage in your browser under{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={INLINE_LINK}
              >
                Google&rsquo;s privacy policy
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </P>
          </Clause>

          <Clause index={3} heading="Links off this site">
            <P>
              Links to SEBI, AMFI, the asset managers we track and WhatsApp
              take you to somebody else&rsquo;s service under their own terms.
              This notice does not extend to them. If you message us on
              WhatsApp, that conversation is handled under WhatsApp&rsquo;s
              terms and kept in our WhatsApp account.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   5 — Rights and grievances
   ============================================================ */

function Rights() {
  return (
    <Section id="rights">
      <Shell>
        <SectionHead
          eyebrow="Your rights"
          lines={["What you can ask for,", "and how."]}
          intro="The DPDP Act 2023 gives you rights over the personal data we hold about you. Exercising them costs nothing."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="Access, correction, erasure">
            <P>
              You can ask us what personal data we hold about you and how we
              have used it, ask us to correct or complete it, and ask us to
              erase it. You can also withdraw your consent, and nominate
              another person to exercise these rights on your behalf.
            </P>
          </Clause>

          <Clause index={1} heading="Grievances">
            <P>
              Send a request or a grievance to{" "}
              <a href={mailtoHref} className={INLINE_LINK}>
                {SITE.email}
              </a>
              , call{" "}
              <a href={telHref} className={cn(INLINE_LINK, "tabular")}>
                {SITE.phoneDisplay}
              </a>
              , or write to {SITE.legalEntity}, {SITE.address.lines.join(", ")}.
              Tell us the mobile number you used so we can find your enquiry.
              If you are not satisfied with our response, you may complain to
              the Data Protection Board of India.
            </P>
          </Clause>

          <Clause index={2} heading="Changes to this notice">
            <P>
              If we change what we collect, who processes it or how long we
              keep it, we update this page and the date below. The date is
              when the substance last changed, not when the file was touched.
            </P>
          </Clause>
        </ol>

        <Rule className="mt-16" delay={0.1} />
        <Rise delay={0.16}>
          <p className="mt-6 max-w-[80ch] text-[14px] leading-[24px] text-muted">
            Last updated{" "}
            <time dateTime={UPDATED.iso} className="tabular">
              {UPDATED.label}
            </time>
            . SIF Insight is operated by {SITE.legalEntity}, a distributor of
            Mutual Funds and Specialised Investment Funds. Nothing on this site
            is investment advice or a recommendation to buy or sell any scheme.
          </p>
        </Rise>
      </Shell>
    </Section>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

/** The site's standard section opener: eyebrow, split display heading, and a
    right-hand standfirst that settles a beat later. */
function SectionHead({
  eyebrow,
  lines,
  intro,
}: {
  eyebrow: string;
  lines: string[];
  intro: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
      <div>
        <Rise>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Rise>
        <LineReveal
          as="h2"
          lines={lines}
          className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
        />
      </div>
      <Rise delay={0.12} className="lg:self-end">
        <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
          {intro}
        </p>
      </Rise>
    </div>
  );
}

/** One clause: heading in the left column, prose in the right. */
function Clause({
  heading,
  index,
  children,
}: {
  heading: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <li className="border-t border-hairline">
      <Rise
        delay={Math.min(index, 10) * 0.06}
        className="grid gap-4 py-10 lg:grid-cols-[300px_1fr] lg:gap-16"
      >
        <h3 className="text-[22px] font-medium leading-[30px] text-ink">
          {heading}
        </h3>
        <div className="max-w-[68ch]">{children}</div>
      </Rise>
    </li>
  );
}

/** Body copy inside a clause. */
function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[17px] leading-[30px] text-body first:mt-0">
      {children}
    </p>
  );
}
