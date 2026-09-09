"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { GlassField } from "@/components/motion/GlassField";
import { Magnetic } from "@/components/motion/Magnetic";
import { Rule } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/primitives";
import { cn } from "@/lib/cn";
import {
  submitContactEnquiry,
  type ContactField,
  type ContactState,
} from "./actions";

/* ============================================================
   The enquiry form.

   React 19 / Next 16: `useActionState(action, initialState)` returns
   [state, formAction, isPending]; the action's signature gains a
   `prevState` first argument. `useFormStatus()` is imported from
   react-dom and only reports on a form ABOVE it in the tree, so the
   submit button has to be its own component.
   ============================================================ */

/** Mirrors INVESTMENT_RANGES in actions.ts — a "use server" module cannot
    export a shared const, so the list is stated twice and the server is the
    one that decides. Values are machine strings; labels are what is read. */
const RANGES = [
  { value: "10-25L", label: "₹10–25 L" },
  { value: "25-50L", label: "₹25–50 L" },
  { value: "50L-1Cr", label: "₹50 L–1 Cr" },
  { value: "1Cr+", label: "₹1 Cr+" },
] as const;

const INITIAL: ContactState = { status: "idle" };

/** Focus order for jumping to the first rejected field. */
const FIELD_ORDER: ContactField[] = [
  "name",
  "email",
  "phone",
  "investmentRange",
  "message",
];

const LABEL = "block text-[14px] font-medium leading-[20px] text-ink";
const HINT = "mt-1.5 text-[13px] leading-[18px] text-muted";
const ERROR = "mt-2 text-[13px] leading-[18px] text-loss";

/* Form controls are the one radius exception in the contract: 4–6px, not
   0 and not 999px. Border stays `hairline` — it is the only border colour
   on the site, so the error state is carried by the marker bar, the error
   text and aria-invalid rather than by a red outline. */
const CONTROL = cn(
  "w-full rounded-[4px] border border-hairline bg-surface",
  "px-4 py-3 text-[16px] leading-[24px] text-ink",
  "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
  "hover:bg-surface-2",
);

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactEnquiry,
    INITIAL,
  );

  const errors = state.status === "invalid" ? state.errors : null;
  const values = "values" in state ? state.values : null;

  /* How long the form has been fillable, measured HERE rather than on the
     server. `/contact` is statically prerendered: a server-rendered
     timestamp would be baked into the HTML once, shared by every visitor,
     and cacheable for a year — it would say when the page was built, not
     when this person arrived. The effect runs on mount, so the clock
     starts when the form becomes interactive for this visitor.

     What the server does with the number, and why a number the client
     supplies is only a speed bump, is argued in `submittedTooFast`. */
  const readyAt = useRef<number | null>(null);
  const elapsedField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    readyAt.current = Date.now();
  }, []);

  /* Stamped on every input event AND on submit. The submit stamp is the
     accurate one; the input stamp is what keeps a visitor whose browser
     autofilled the form and who then sat and read the page from being
     measured against a time they never took. */
  const stampElapsed = () => {
    const startedAt = readyAt.current;
    const field = elapsedField.current;
    if (startedAt === null || !field) return;
    field.value = String(Date.now() - startedAt);
  };

  // A rejected submission that leaves focus on the button gives a
  // keyboard or screen-reader user nothing to act on. `errors` is a fresh
  // object per submission, so a repeated failure re-fires this.
  useEffect(() => {
    if (!errors) return;
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) document.getElementById(`contact-${first}`)?.focus();
  }, [errors]);

  const result = describe(state);

  return (
    <form
      action={formAction}
      onInput={stampElapsed}
      onSubmit={stampElapsed}
      aria-busy={isPending}
    >
      <div className="relative border border-hairline bg-surface p-6 sm:p-10">
        <HoneyPot />

        {/* Rendered empty. Only a client with JavaScript fills it in, and
            the server treats an empty value as a submission that made no
            claim rather than as a failed one — see actions.ts. */}
        <input
          ref={elapsedField}
          type="hidden"
          name="elapsedMs"
          defaultValue=""
        />

        <Eyebrow>Send an enquiry</Eyebrow>
        <h2 className="mt-5 text-[22px] font-medium leading-[30px] text-ink">
          What are you weighing up?
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15px] leading-[26px] text-body">
          The more you tell us about your horizon and risk comfort, the more
          specific the schemes we can point you at.
        </p>

        <Rule className="mt-8" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Field
            name="name"
            label="Full name"
            error={errors?.name}
            className="sm:col-span-2"
          >
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="name"
                maxLength={80}
                required
                defaultValue={values?.name ?? ""}
                className={CONTROL}
              />
            )}
          </Field>

          <Field name="email" label="Email" error={errors?.email}>
            {(props) => (
              <input
                {...props}
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                defaultValue={values?.email ?? ""}
                className={CONTROL}
              />
            )}
          </Field>

          <Field
            name="phone"
            label="Mobile"
            hint="Indian mobile, with or without +91."
            error={errors?.phone}
          >
            {(props) => (
              <input
                {...props}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                required
                defaultValue={values?.phone ?? ""}
                className={cn(CONTROL, "tabular")}
              />
            )}
          </Field>

          <Field
            name="investmentRange"
            label="Investment range"
            hint="SIF schemes start at a ₹10 lakh minimum."
            error={errors?.investmentRange}
            className="sm:col-span-2"
          >
            {(props) => (
              <div className="relative">
                {/* React re-applies `defaultValue` to inputs and textareas on
                    update, but NOT to a <select> — it is only read on mount.
                    Keying the element on the submitted value remounts it so
                    the choice survives React's post-action form reset. */}
                <select
                  {...props}
                  key={values?.investmentRange ?? ""}
                  required
                  defaultValue={values?.investmentRange ?? ""}
                  className={cn(CONTROL, "appearance-none pr-11")}
                >
                  <option value="">Select a range</option>
                  {RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            )}
          </Field>

          <Field
            name="message"
            label="Message"
            optional
            hint="Up to 1200 characters."
            error={errors?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <textarea
                {...props}
                rows={5}
                maxLength={1200}
                defaultValue={values?.message ?? ""}
                className={cn(CONTROL, "resize-y")}
              />
            )}
          </Field>
        </div>

        {/* ============================================================
            COMPLIANCE — READ BEFORE THIS FORM COLLECTS DATA IN PRODUCTION.

            A published privacy policy is REQUIRED before this form is
            allowed to collect personal data live. There is no /privacy
            page on this site yet, and the footer renders "Privacy Policy"
            as plain text for exactly that reason.

            The site this replaces shipped the line "you agree to our
            privacy policy" next to a Privacy link that pointed at `#`.
            The consent copy below therefore claims nothing about a
            policy — it states only what is verifiably true about how the
            details are used. When /privacy ships, link it from here and
            from the footer in the same change.

            SINCE THE AUDIT: the form now refuses control characters in
            the fields a mail header would carry, and three controls sit
            in front of delivery — the honeypot above, a fill-time floor
            claimed by this client, and an in-process per-IP and
            per-email rate limit. Their limits, and honestly what each
            one is and is not worth, are written down in actions.ts.

            None of that moves the gate. Rate limiting is about what the
            form costs us; a privacy policy is about what we are allowed
            to collect in the first place. Delivery stays blocked on the
            policy, not on the abuse controls being good enough.
            ============================================================ */}
        <p className="mt-8 max-w-[62ch] text-[13px] leading-[20px] text-muted">
          We use these details only to respond to your enquiry about SIF
          schemes. We do not sell them, share them with the AMCs whose
          schemes we cover, or add you to a mailing list.
        </p>

        <div className="relative isolate mt-8 inline-block">
          <GlassField />
          <Magnetic className="inline-block">
            <SubmitButton />
          </Magnetic>
        </div>

        {/* The result region is always in the DOM so assistive tech has
            something to watch — an element inserted at the same moment its
            text appears is announced unreliably. */}
        <div role="status" aria-live="polite" className="mt-8 empty:mt-0">
          {result ? (
            <div
              className={cn(
                "border border-hairline p-5",
                result.tone === "ok" ? "bg-accent-wash" : "bg-surface-2",
              )}
            >
              <p className="text-[15px] font-medium leading-[24px] text-ink">
                {result.title}
              </p>
              <p className="mt-2 max-w-[62ch] text-[14px] leading-[22px] text-body">
                {result.body}
              </p>
              {result.showDirect ? <DirectFallback /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

/**
 * The honeypot.
 *
 * A field a person never sees, never tabs to and is never told about, so
 * anything in it was put there by something filling every input it found.
 * The server refuses the submission — visibly, not with a fake thank-you;
 * the reasoning for that is argued where the refusal happens.
 *
 * NOT `display: none` and not `hidden`. Both are the first thing a form
 * filler checks, and a field it can see is skipped. Off-screen with a
 * one-pixel box is the version that still looks like a field to a script
 * reading the DOM.
 *
 * How it stays away from real people:
 *   aria-hidden   keeps it out of the accessibility tree, so a screen
 *                 reader never announces a field with no purpose.
 *   tabIndex={-1} keeps it out of the tab order, which is also what makes
 *                 the aria-hidden legitimate — hiding a focusable element
 *                 from assistive tech while leaving it reachable by
 *                 keyboard is the anti-pattern this avoids.
 *   autoComplete  plus the password-manager opt-outs: the realistic false
 *                 positive here is not a person, it is a manager filling
 *                 a field named "website" on their behalf.
 *
 * `absolute` positions this against the card, which is `relative`.
 */
function HoneyPot() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
    >
      <label htmlFor="contact-website">Website</label>
      <input
        id="contact-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        defaultValue=""
      />
    </div>
  );
}

/** `useFormStatus` reads the nearest form ABOVE it, so this cannot be
    inlined into ContactForm — it would always report pending: false. */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group glass glass-primary inline-flex items-center gap-2 rounded-full",
        "px-7 py-3.5 text-[15px] font-medium text-accent-dim",
        "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
    >
      <span>{pending ? "Sending…" : "Send enquiry"}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
      >
        <path
          d="M1 7h11M7.5 2.5 12 7l-4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

type ControlProps = {
  id: string;
  name: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/**
 * Label, control, hint and error, wired together.
 *
 * Every control gets a real `<label htmlFor>` — a placeholder standing in
 * for a label disappears the moment typing starts, which is precisely when
 * the label is needed.
 */
function Field({
  name,
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: {
  name: ContactField;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = `contact-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional ? (
          <span className="ml-2 font-normal text-muted">Optional</span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      ) : null}

      {/* A 2px marker rather than a coloured border: `border-hairline` is
          the only border colour in the contract, and a background strip
          carries the same signal without breaking it. */}
      <div className="relative mt-2">
        {error ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 z-10 w-[2px] bg-loss"
          />
        ) : null}
        {children({
          id,
          name,
          "aria-invalid": Boolean(error),
          "aria-describedby":
            [errorId, hintId].filter(Boolean).join(" ") || undefined,
        })}
      </div>

      {error ? (
        <p id={errorId} className={ERROR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shown with any non-success result. The channels below are the ones that
    work regardless of what the form can or cannot do. */
function DirectFallback() {
  return (
    <p className="mt-4 text-[14px] leading-[22px] text-body">
      Reach us directly —{" "}
      <a href="mailto:info@sifinsight.com" className={INLINE_LINK}>
        info@sifinsight.com
      </a>{" "}
      ·{" "}
      <a href="tel:+919205523100" className={cn(INLINE_LINK, "tabular")}>
        +91 92055 23100
      </a>
    </p>
  );
}

const INLINE_LINK =
  "text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
    >
      <path
        d="m2.5 4.5 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================
   Result copy

   `unconfigured` is the state that matters. It is not an error and it is
   not a success: the submission was valid, and it went nowhere. Saying so
   is the entire point of building the form this way.

   `blocked` is the same discipline applied to a refusal we chose to make.
   A form that silently accepted a submission it had already decided to
   throw away would be the original defect wearing a security hat.
   ============================================================ */

type Result = {
  title: string;
  body: string;
  tone: "ok" | "note";
  showDirect: boolean;
};

function describe(state: ContactState): Result | null {
  switch (state.status) {
    case "idle":
      return null;

    case "invalid": {
      const count = Object.keys(state.errors).length;
      return {
        title: "Not sent — check the highlighted fields",
        body: `${count} ${count === 1 ? "field needs" : "fields need"} attention. Nothing was submitted.`,
        tone: "note",
        showDirect: false,
      };
    }

    case "blocked":
      /* The two reasons read differently on purpose. A rate limit is
         something the visitor can wait out, so the copy says so. The
         other says only that an automated check refused it: naming which
         check, or which field gave it away, would be writing the bypass
         into the page that the check is trying to survive. Both admit
         the check can be wrong, and both offer a channel that is not
         this form. */
      return state.reason === "rate-limited"
        ? {
            title: "Not sent — too many enquiries just now",
            body: "There is a limit on how often the same address or connection can send this form, and it has been reached. Nothing was delivered. Give it a few minutes, or use one of the direct channels below.",
            tone: "note",
            showDirect: true,
          }
        : {
            title: "Your details were not sent",
            body: "An automated check refused this submission, so nothing was delivered and nothing was stored. If that is the wrong call — it is a heuristic, and it can be — the channels below reach a person directly.",
            tone: "note",
            showDirect: true,
          };

    case "unconfigured":
      return {
        title: "Your details were not sent",
        body:
          "This form is not yet connected to a mail service, so nothing was delivered and nothing was stored. We would rather tell you that than show a thank-you over a message that went nowhere.",
        tone: "note",
        showDirect: true,
      };

    case "error":
      return {
        title: "Your details were not sent",
        body:
          "Something failed on our side while delivering your enquiry. Please use one of the direct channels below.",
        tone: "note",
        showDirect: true,
      };

    case "sent":
      return {
        title: "Enquiry received",
        body:
          "Thank you — we have your enquiry and will reply to the email address you gave us.",
        tone: "ok",
        showDirect: false,
      };
  }
}
