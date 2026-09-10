import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Card, Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";

/**
 * /privacy
 *
 * This page exists because two other files were blocked on it. `ContactForm`
 * carried a COMPLIANCE block saying a published privacy policy is required
 * before the form collects personal data live, and `SiteFooter` rendered
 * "Privacy Policy" as inert text rather than as a link to `#`, for exactly
 * that reason. Both are now satisfied by this file — not overridden by it.
 *
 * EVERY SENTENCE BELOW IS CHECKABLE AGAINST THE CODE. That is the whole
 * discipline of the page, and the reason it is not a template. What was
 * verified, and how, before a word of it was written:
 *
 *   no cookies        grep for cookie/localStorage/sessionStorage across
 *                     app/ and components/ returns nothing, and a Playwright
 *                     context that loaded /, /media and /contact finished
 *                     with zero cookies, an empty document.cookie and zero
 *                     localStorage keys.
 *   no analytics      no gtag, no dataLayer, no googletagmanager, no pixel
 *                     and no analytics SDK in package.json or anywhere in
 *                     the source. There is no next/script usage at all.
 *   no iframes        one match for "iframe" in the whole tree, and it is a
 *                     comment in app/media/page.tsx explaining why there
 *                     isn't one. next.config.ts sends frame-src 'none'.
 *   self-hosted fonts next/font/google downloads the woff2 at build time;
 *                     next.config.ts's font-src 'self' is sufficient, which
 *                     is the proof nothing is fetched from Google Fonts.
 *   one third party   img-src allows exactly one remote origin,
 *                     https://img.youtube.com, for the five /media stills.
 *   the referrer      MEASURED, not assumed. The five thumbnail requests
 *                     carry a Referer of the site's ORIGIN and not the
 *                     /media path, because next.config.ts sends
 *                     Referrer-Policy: strict-origin-when-cross-origin.
 *                     So the copy below claims the origin is disclosed and
 *                     stops there, rather than the stronger and false claim
 *                     that the page URL goes to Google.
 *   the form          app/contact/actions.ts: deliverEnquiry returns
 *                     "unconfigured", nothing is persisted, and the two
 *                     console lines it writes carry no personal data.
 *
 * WHAT THIS PAGE DELIBERATELY DOES NOT SAY: a retention period, a named
 * Data Protection Officer, a grievance-redressal window, or a lawful-basis
 * taxonomy. None of those has been decided by the operator, and a notice
 * that invents them is worse than one that says which questions are open —
 * it is a promise with nobody behind it. Section four names the gaps
 * instead. Fill them in here the day they are actually settled.
 *
 * KEEP THIS PAGE OUT OF THE MAIN NAV. It belongs in the footer sign-off
 * where a policy link belongs; SiteHeader's NAV_LINKS is unchanged.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What SIF Insight collects and what it does not. No cookies, no analytics, no embeds, and an enquiry form that neither delivers nor stores what you type.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "What this site collects, and what it does not",
    description:
      "No cookies, no analytics, no embeds, and an enquiry form that neither delivers nor stores what you type.",
    url: "/privacy",
    /* Declaring `openGraph` also drops the image the root app/opengraph-image.png
       file convention contributes, which silently downgrades the card to
       twitter:card=summary. Restated, not inherited. */
    images: "/opengraph-image.png",
    siteName: "SIF Insight",
    locale: "en_IN",
    type: "website",
  },
};

/**
 * When the SUBSTANCE of this notice last changed — not when the file was
 * last touched. Bump both fields together, and only for a change a reader
 * would care about.
 *
 * `label` is written out rather than derived from `iso`, for the same reason
 * the media page writes its dates out: `new Date("2026-09-09")` is UTC
 * midnight and would render as the 8th on any server west of Greenwich.
 */
const UPDATED = { iso: "2026-09-09", label: "9 September 2026" } as const;

const INLINE_LINK =
  "text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        lines={["What this site collects,", "and what it does not."]}
        standfirst={
          <>
            SIF Insight is a reading site. It sets no cookies, runs no
            analytics and embeds nothing. The one form on it — the enquiry
            form on the contact page — is not connected to a mail service yet,
            so today it checks what you typed, tells you plainly that nothing
            was sent, and keeps none of it. This notice says exactly that, and
            says what will change on the day it stops being true.
          </>
        }
        /* Plain strings, not fragments. PageHeader maps this array, and a
           bare JSX element in an array literal trips jsx-key — the same
           note the contact page carries. The machine-readable <time> for
           this date lives in the sign-off at the foot of the page. */
        meta={[
          "Platizio Services LLP",
          `Updated ${UPDATED.label}`,
          "No cookies · No analytics",
        ]}
        aside={
          <Card className="p-8">
            <p className="text-[14px] leading-[20px] text-muted">
              Questions about this notice
            </p>
            <p className="mt-4 text-[17px] leading-[30px] text-body">
              These two channels are the whole of how to reach us, and they
              are the two printed in the footer of every page.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href="mailto:info@sifinsight.com"
                className="text-[17px] leading-[26px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
              >
                info@sifinsight.com
              </a>
              <a
                href="tel:+919205523100"
                className="tabular text-[17px] leading-[26px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
              >
                +91 92055 23100
              </a>
            </div>
          </Card>
        }
      />

      <Operator />
      <Collection />
      <ThirdParties />
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
          <Clause index={0} heading="Platizio Services LLP">
            <P>
              SIF Insight is operated by Platizio Services LLP. Platizio is a
              distributor of Mutual Funds and Specialised Investment Funds —
              not an asset manager, and not an investment adviser — and this
              site is its published record of the SIF category.
            </P>
            <P>
              Write to{" "}
              <a href="mailto:info@sifinsight.com" className={INLINE_LINK}>
                info@sifinsight.com
              </a>{" "}
              or call{" "}
              <a
                href="tel:+919205523100"
                className={cn(INLINE_LINK, "tabular")}
              >
                +91 92055 23100
              </a>
              . Wherever this notice says to write to us, it means that
              address.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   2 — What is collected
   ============================================================ */

function Collection() {
  return (
    <Section id="collection">
      <Shell>
        <SectionHead
          eyebrow="What we collect"
          lines={["One form,", "and nothing else."]}
          intro="There is exactly one place on this site where you can type something and send it: the enquiry form on the contact page. Everything below is about that form, or about the controls sitting in front of it."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="What the form asks for">
            <P>
              Your name, an email address, an Indian mobile number, and which
              of four investment ranges you are considering. A message is
              optional, up to 1200 characters. Those five fields are the whole
              of it: the form asks nothing about your holdings, your PAN, your
              income or your date of birth, and there is no account to create
              and no password to set.
            </P>
            <P>
              Two hidden inputs travel with a submission and are no part of
              your enquiry. One is a decoy field that a person never sees and
              only an automated form-filler completes; the other is a number
              your browser works out for how long the form was open. Both
              exist to tell a script apart from a person, both are read once,
              and neither is stored, echoed back, or shown to anyone.
            </P>
            <P>
              Nothing here is aimed at children, and the form does not ask
              your age — which also means we cannot tell, and do not try to.
            </P>
          </Clause>

          <Clause index={1} heading="Where an enquiry goes today: nowhere">
            <P>
              The form is not connected to a mail service. The one function
              that would deliver an enquiry reports back that delivery is
              unconfigured — no provider call is written and no key is set —
              so a valid submission is received, checked, found valid, and
              then ends with the request that carried it. Nothing is written
              to a database, to a file, or to a mailbox, because there is no
              database, no file and no mailbox wired to it.
            </P>
            <P>
              The form says so on screen rather than showing a thank-you:{" "}
              <em>
                this form is not yet connected to a mail service, so nothing
                was delivered and nothing was stored
              </em>
              . We would rather tell you that than let you believe a message
              arrived somewhere.
            </P>
            <P>
              The code behind it also declines to log what you typed. When a
              delivery attempt fails it records that it failed; when the limit
              described below trips it records that it tripped. Neither line
              carries your name, your address, your number or your message.
            </P>
          </Clause>

          <Clause index={2} heading="What changes when delivery is wired">
            <P>
              Once a mail provider is connected, a submitted enquiry becomes
              an email to{" "}
              <a href="mailto:info@sifinsight.com" className={INLINE_LINK}>
                info@sifinsight.com
              </a>{" "}
              and lives in that mailbox. That
              is a real change to what this page describes, so it is a change
              to this page too: the notice must be updated in the same change
              that switches delivery on, before the first enquiry is sent.
              Until that happens, the clause above is the accurate one.
            </P>
            <P>
              We have not fixed how long an enquiry will then be kept, and
              this page will not pretend otherwise. A retention period printed
              here before anybody has decided it would be a promise with
              nobody behind it.
            </P>
          </Clause>

          <Clause index={3} heading="The limit that sits in front of it">
            <P>
              A form that becomes email is a form worth flooding, so checks
              sit between a submission and delivery. Two of them — the decoy
              field and the fill-time number — are described above and keep
              nothing at all.
            </P>
            <P>
              The third keeps a short-lived record, and that record is
              personal data, so here it is in full. For each submission that
              passes validation, the server stores one timestamp against two
              keys: your IP address as the host in front of it reports that
              address, and your email address in lower case. Timestamps only —
              no name, no number, no message. The allowances are five
              submissions from one IP address and three from one email address
              in any ten-minute window.
            </P>
            <P>
              That record lives in the memory of the running server process.
              It is never written to disk, it is dropped once it is ten
              minutes old, and it is lost entirely whenever the process
              restarts. It is used to count recent submissions and for nothing
              else — not to profile you, and not to recognise you on a later
              visit.
            </P>
          </Clause>

          <Clause index={4} heading="Server logs">
            <P>
              Nothing in this application writes a request log. What the
              server underneath it records — the ordinary web-server access
              lines, which everywhere include an IP address and a browser
              user-agent — is infrastructure this codebase does not configure,
              so this notice cannot describe it by reading the code, and will
              not guess at it. If that matters to you, write to us and we will
              tell you what we know.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   3 — Third parties
   ============================================================ */

function ThirdParties() {
  return (
    <Section id="third-parties">
      <Shell>
        <SectionHead
          eyebrow="Third parties"
          lines={["No cookies, no trackers,", "and one exception."]}
          intro="This is the vague section on most sites. It is a short section here because there is genuinely almost nothing in it — and the one thing that is in it gets named."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="No cookies">
            <P>
              This site sets no cookies. Not advertising cookies, not
              analytics cookies, not preference cookies — none, which is why
              there is no consent banner to dismiss: there is nothing to
              consent to. Nothing is written to your browser&rsquo;s local or
              session storage either.
            </P>
          </Clause>

          <Clause index={1} heading="No analytics, no tag manager, no pixel">
            <P>
              There is no Google Analytics, no Google Tag Manager, no
              advertising or social pixel, and no product-analytics SDK
              anywhere in this site&rsquo;s code. No page here reports your
              visit to anybody.
            </P>
            <P>
              The typefaces are downloaded when the site is built and served
              from this domain, so even loading a page makes no request to
              Google Fonts.
            </P>
          </Clause>

          <Clause index={2} heading="No embeds">
            <P>
              Nothing on this site is an iframe. The videos on the{" "}
              <Link href="/media" className={INLINE_LINK}>
                media page
              </Link>{" "}
              are links out to YouTube rather than players, and the security
              policy sent with every page forbids frames outright — so a
              tracking iframe cannot be added to this site by accident.
            </P>
          </Clause>

          <Clause
            index={3}
            heading="The exception: video stills on the media page"
          >
            <P>
              The media page shows a still image for each of five videos.
              Those stills are served by Google from img.youtube.com, and your
              browser requests them as the page loads — before you click
              anything, and whether or not you ever watch a video. Google
              therefore sees your IP address, your browser&rsquo;s user-agent
              string, and this site&rsquo;s address as the referring page.
            </P>
            <P>
              It does not see which page you were on: this site sends only its
              own address as the referrer, never the path. And because no
              YouTube player is embedded, visiting that page sets no YouTube
              cookie.
            </P>
            <P>
              If you follow one of those links through to YouTube, that is a
              visit to Google&rsquo;s own site, and{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={INLINE_LINK}
              >
                Google&rsquo;s privacy policy
                <span className="sr-only"> (opens in a new tab)</span>
              </a>{" "}
              governs it from there.
            </P>
          </Clause>

          <Clause index={4} heading="Links off this site">
            <P>
              The other outbound links here go to SEBI, to AMFI, and to the
              asset managers whose schemes we track. Following one takes you
              to somebody else&rsquo;s site under somebody else&rsquo;s terms.
              We have no control over what they collect, and this notice does
              not extend to them.
            </P>
          </Clause>
        </ol>
      </Shell>
    </Section>
  );
}

/* ============================================================
   4 — Rights, and the open questions
   ============================================================ */

function Rights() {
  return (
    <Section id="rights">
      <Shell>
        <SectionHead
          eyebrow="Your rights"
          lines={["What you can ask for,", "and what is not settled."]}
          intro="The second half of this section is the part most notices leave out. It is here because the alternative is inventing policy that nobody has agreed to."
        />

        <ol className="mt-16 list-none border-b border-hairline">
          <Clause index={0} heading="Your rights over your data">
            <P>
              India&rsquo;s Digital Personal Data Protection Act, 2023 gives
              you rights over personal data held about you — to know what is
              held, to have it corrected, and to have it erased. The honest
              position today is that this site holds almost nothing to
              exercise them against: an enquiry submitted through the form is
              neither delivered nor stored, and the rate-limit record is a
              handful of timestamps that expire within ten minutes and do not
              survive a restart.
            </P>
            <P>
              If you have emailed or called us directly, that message sits in
              our mailbox or our call log as ordinary correspondence. Ask us
              to delete it and we will.
            </P>
          </Clause>

          <Clause index={1} heading="What we have not settled">
            <P>
              Two things a fuller notice would carry are missing here, because
              they have not been decided and stating them anyway would be
              worse than their absence: a named data-protection contact with a
              route to reach them, and a written grievance procedure with a
              response time.
            </P>
            <P>
              The day the enquiry form starts delivering, both become
              necessary and both belong on this page. Until then, the email
              address and phone number above are the whole of how to reach us,
              and they are answered by people rather than by a process.
            </P>
          </Clause>

          <Clause index={2} heading="Changes to this notice">
            <P>
              This page ships with the site&rsquo;s code, so a change to it is
              a change in the repository with a date against it. The date at
              the top of this page is when the substance last changed — not
              when the file was last touched.
            </P>
            <P>
              The change that matters most is already named above: the day the{" "}
              <Link href="/contact" className={INLINE_LINK}>
                enquiry form
              </Link>{" "}
              starts delivering, this page changes with it, in the same
              commit.
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
            . SIF Insight is operated by Platizio Services LLP, a distributor
            of Mutual Funds and Specialised Investment Funds. Nothing on this
            site is investment advice or a recommendation to buy or sell any
            scheme.
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

/**
 * One clause of the notice: heading in the left column, prose in the right.
 *
 * Hairline-ruled rows, the same rhythm the media list and the about page's
 * numbered list use — the policy laid out as the site's own material rather
 * than as a wall of legal text.
 */
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

/** Body copy inside a clause. `first:mt-0` so the opening paragraph aligns
    with its heading and the rest keep the gap between them. */
function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[17px] leading-[30px] text-body first:mt-0">
      {children}
    </p>
  );
}
