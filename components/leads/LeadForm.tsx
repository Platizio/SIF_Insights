"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { ActionButton } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { submitConsultation, submitLead } from "@/lib/leads/actions";
import {
  CONSENT_COPY,
  INVESTMENT_RANGES,
  LEAD_LIMITS,
  LEAD_SENT_KEY,
  TIME_SLOTS,
  type LeadField,
  type LeadKind,
  type LeadState,
  type LeadValues,
} from "@/lib/leads/schema";
import { readValues } from "@/lib/leads/validate";
import { SITE, mailtoHref, telHref, whatsappHref } from "@/lib/site";

/* ============================================================
   The lead form — one component for the Home popup ("popup") and the
   /contact consultation form ("consultation").

   React 19: useActionState(action, initial) → [state, formAction, pending];
   useFormStatus only reports on a form ABOVE it, so the submit button is
   its own component. Field ids are prefixed per instance (useId) because
   the popup and the page form can both be in the DOM.

   A thrown action is caught here and becomes the "stale" state. The usual
   cause is a deploy landing while the page was open: the old page's
   Server Action id no longer exists ("Failed to find Server Action"), and
   the fix for the visitor is a reload — so the message says exactly that
   instead of letting the error boundary take the page.
   ============================================================ */

type ClientState =
  | LeadState
  | { status: "stale"; reason: "deployed" | "network"; values: LeadValues };

const INITIAL: ClientState = { status: "idle" };

const ACTIONS = { popup: submitLead, consultation: submitConsultation } as const;

const FIELD_ORDER: LeadField[] = [
  "name",
  "phone",
  "email",
  "preferredTime",
  "investmentRange",
  "message",
  "consent",
];

const LABEL = "block text-[14px] font-medium leading-[20px] text-ink";
const HINT = "mt-1 text-[13px] leading-[18px] text-muted";
const ERROR = "mt-2 text-[13px] leading-[18px] text-loss";
const CONTROL = cn(
  "w-full rounded-[4px] border border-hairline bg-surface",
  "px-4 py-3 text-[16px] leading-[24px] text-ink",
  "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
  "hover:bg-surface-2",
);
const INLINE_LINK =
  "text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";

function isMissingAction(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Server Action/i.test(message);
}

export function LeadForm({
  kind,
  dismiss,
  className,
}: {
  kind: LeadKind;
  /** A secondary action beside submit (the popup's "No thanks"); after a
      successful send it is offered as "Close". */
  dismiss?: { label: string; onClick: () => void };
  className?: string;
}) {
  const uid = useId();
  const pathname = usePathname();
  const action = ACTIONS[kind];

  const [state, formAction, isPending] = useActionState<ClientState, FormData>(
    async (_prev, formData) => {
      try {
        return await action({ status: "idle" }, formData);
      } catch (error) {
        return {
          status: "stale",
          reason: isMissingAction(error) ? "deployed" : "network",
          values: readValues(formData),
        };
      }
    },
    INITIAL,
  );

  const errors = state.status === "invalid" ? state.errors : null;
  const values = "values" in state ? state.values : null;
  const sent = state.status === "sent";

  /* Fill-time claim, measured from when the form became interactive for
     THIS visitor (the page HTML is static and shared). */
  const readyAt = useRef<number | null>(null);
  const elapsedField = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readyAt.current = Date.now();
  }, []);

  const stampElapsed = () => {
    const startedAt = readyAt.current;
    const field = elapsedField.current;
    if (startedAt === null || !field) return;
    field.value = String(Date.now() - startedAt);
  };

  useEffect(() => {
    if (!errors) return;
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) document.getElementById(`${uid}-${first}`)?.focus();
  }, [errors, uid]);

  /* On success: remember it for the session (the popup never reappears),
     and move focus to the confirmation — the button that held it is gone. */
  useEffect(() => {
    if (!sent) return;
    try {
      window.sessionStorage.setItem(LEAD_SENT_KEY, "1");
    } catch {
      /* Storage blocked: the popup may reappear next visit. Harmless. */
    }
    successRef.current?.focus();
  }, [sent]);

  const result = describe(state, kind);
  const popup = kind === "popup";
  const [consentBefore, consentAfter] = CONSENT_COPY.split("Privacy Policy");

  return (
    <div className={className}>
      {sent ? null : (
        <form
          action={formAction}
          onInput={stampElapsed}
          onSubmit={stampElapsed}
          aria-busy={isPending}
          className="relative"
        >
          <HoneyPot id={`${uid}-website`} />
          <input ref={elapsedField} type="hidden" name="elapsedMs" defaultValue="" />
          <input type="hidden" name="sourcePage" value={pathname ?? ""} readOnly />

          <div className={cn("grid gap-5", !popup && "sm:grid-cols-2 sm:gap-6")}>
            <Field uid={uid} name="name" label="Name" error={errors?.name} className={cn(!popup && "sm:col-span-2")}>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  autoComplete="name"
                  maxLength={LEAD_LIMITS.name}
                  required
                  defaultValue={values?.name ?? ""}
                  className={CONTROL}
                />
              )}
            </Field>

            <Field
              uid={uid}
              name="phone"
              label="Mobile number"
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
              uid={uid}
              name="email"
              label="Email"
              optional
              hint={popup ? undefined : "If you would like a written follow-up."}
              error={errors?.email}
            >
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  maxLength={LEAD_LIMITS.email}
                  defaultValue={values?.email ?? ""}
                  className={CONTROL}
                />
              )}
            </Field>

            {popup ? null : (
              <>
                <Field uid={uid} name="preferredTime" label="Preferred time for a call" optional error={errors?.preferredTime}>
                  {(props) => (
                    <SelectControl
                      {...props}
                      current={values?.preferredTime ?? ""}
                      placeholder="Any time"
                      options={TIME_SLOTS}
                    />
                  )}
                </Field>

                <Field
                  uid={uid}
                  name="investmentRange"
                  label="Investment range"
                  optional
                  hint="SIFs start at a ₹10 lakh minimum."
                  error={errors?.investmentRange}
                >
                  {(props) => (
                    <SelectControl
                      {...props}
                      current={values?.investmentRange ?? ""}
                      placeholder="Prefer not to say"
                      options={INVESTMENT_RANGES}
                    />
                  )}
                </Field>
              </>
            )}

            <Field
              uid={uid}
              name="message"
              label={popup ? "What are you looking for?" : "Anything we should know before we call?"}
              optional
              hint={`Up to ${popup ? LEAD_LIMITS.popupMessage : LEAD_LIMITS.message} characters.`}
              error={errors?.message}
              className={cn(!popup && "sm:col-span-2")}
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={popup ? 3 : 4}
                  maxLength={popup ? LEAD_LIMITS.popupMessage : LEAD_LIMITS.message}
                  defaultValue={values?.message ?? ""}
                  className={cn(CONTROL, "resize-y")}
                />
              )}
            </Field>

            <div className={cn(!popup && "sm:col-span-2")}>
              <div className="flex items-start gap-3">
                {/* Keyed on the echoed value: React does not re-apply
                    defaultChecked after the post-action form reset. */}
                <input
                  key={values?.consent ?? ""}
                  id={`${uid}-consent`}
                  name="consent"
                  type="checkbox"
                  value="yes"
                  required
                  defaultChecked={values?.consent === "yes"}
                  aria-invalid={Boolean(errors?.consent)}
                  aria-describedby={errors?.consent ? `${uid}-consent-error` : undefined}
                  className="mt-[3px] h-[18px] w-[18px] shrink-0 rounded-[4px] accent-accent"
                />
                <label htmlFor={`${uid}-consent`} className="text-[14px] leading-[22px] text-body">
                  {consentBefore}
                  <Link
                    href="/privacy"
                    className={INLINE_LINK}
                    target={popup ? "_blank" : undefined}
                    rel={popup ? "noopener" : undefined}
                  >
                    Privacy Policy
                    {popup ? <span className="sr-only"> (opens in a new tab)</span> : null}
                  </Link>
                  {consentAfter}
                </label>
              </div>
              {errors?.consent ? (
                <p id={`${uid}-consent-error`} className={ERROR}>
                  {errors.consent}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <SubmitButton label={popup ? "Request a call-back" : "Book a consultation"} />
            {dismiss ? (
              <ActionButton variant="ghost" onClick={dismiss.onClick}>
                {dismiss.label}
              </ActionButton>
            ) : null}
          </div>
        </form>
      )}

      {/* Always in the DOM, so assistive tech has a live region to watch. */}
      <div role="status" aria-live="polite" className={cn(!sent && "mt-6 empty:mt-0")}>
        {result ? (
          <div
            ref={result.tone === "ok" ? successRef : undefined}
            tabIndex={result.tone === "ok" ? -1 : undefined}
            className={cn(
              "border border-hairline p-5 outline-none",
              result.tone === "ok" ? "bg-accent-wash" : "bg-surface-2",
            )}
          >
            <p className="text-[15px] font-medium leading-[24px] text-ink">{result.title}</p>
            <p className="mt-2 max-w-[62ch] text-[14px] leading-[22px] text-body">{result.body}</p>
            {result.showDirect ? <DirectChannels /> : null}
            {sent && dismiss ? (
              <ActionButton variant="ghost" onClick={dismiss.onClick} className="mt-5">
                Close
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

/** Off-screen, untabbable, hidden from assistive tech — only a script that
    fills every input finds it. Not display:none (form fillers skip that). */
function HoneyPot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
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

function SubmitButton({ label }: { label: string }) {
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
      <span>{pending ? "Sending…" : label}</span>
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

function SelectControl({
  current,
  placeholder,
  options,
  ...props
}: ControlProps & {
  current: string;
  placeholder: string;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <div className="relative">
      {/* React reads a <select>'s defaultValue on mount only; keying on
          the echoed value remounts it after the post-action reset. */}
      <select
        {...props}
        key={current}
        defaultValue={current}
        className={cn(CONTROL, "appearance-none pr-11")}
      >
        {[{ id: "", label: placeholder }, ...options].map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
      >
        <path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Field({
  uid,
  name,
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: {
  uid: string;
  name: LeadField;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = `${uid}-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional ? <span className="ml-2 font-normal text-muted">Optional</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className={HINT}>
          {hint}
        </p>
      ) : null}
      <div className="relative mt-2">
        {error ? (
          <span aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-[2px] bg-loss" />
        ) : null}
        {children({
          id,
          name,
          "aria-invalid": Boolean(error),
          "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
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

/** Shown with every non-success result: the channels that reach a person
    whatever the form can or cannot do. */
function DirectChannels() {
  const item =
    "inline-flex items-center gap-2 text-[14px] leading-[22px] text-ink underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent";
  return (
    <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
      <li>
        <a href={telHref} className={cn(item, "tabular")}>
          <PhoneIcon size={14} />
          Call {SITE.phoneDisplay}
        </a>
      </li>
      <li>
        <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className={item}>
          <WhatsAppIcon size={14} />
          WhatsApp us<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a href={mailtoHref} className={item}>
          <MailIcon size={14} />
          {SITE.email}
        </a>
      </li>
    </ul>
  );
}

type Result = { title: string; body: string; tone: "ok" | "note"; showDirect: boolean };

const NOT_SENT = "Your details were not sent";

function describe(state: ClientState, kind: LeadKind): Result | null {
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
      return state.reason === "rate-limited"
        ? {
            title: "Not sent — too many requests just now",
            body: "There is a limit on how often the same number or connection can send this form, and it has been reached. Nothing was delivered. Try again in a few minutes, or reach us directly.",
            tone: "note",
            showDirect: true,
          }
        : {
            title: NOT_SENT,
            body: "An automated check refused this submission, so nothing was delivered. It is a heuristic and it can be wrong — the channels below reach a person directly.",
            tone: "note",
            showDirect: true,
          };
    case "unconfigured":
      return {
        title: NOT_SENT,
        body: "This form is not connected to our inbox yet, so nothing was delivered. Please call, WhatsApp or email us instead — we would rather say so than show a thank-you over a message that went nowhere.",
        tone: "note",
        showDirect: true,
      };
    case "error":
      return {
        title: NOT_SENT,
        body: "Something failed on our side while sending your details. Please try again shortly, or reach us directly.",
        tone: "note",
        showDirect: true,
      };
    case "stale":
      return state.reason === "deployed"
        ? {
            title: NOT_SENT,
            body: "This page was updated while you had it open. Reload the page and submit again — or reach us directly.",
            tone: "note",
            showDirect: true,
          }
        : {
            title: NOT_SENT,
            body: "We could not reach our server. Check your connection and try again, or reach us directly.",
            tone: "note",
            showDirect: true,
          };
    case "sent":
      return {
        title: "Thank you — we have your details",
        body:
          kind === "popup"
            ? "Someone from the SIF Insight team will call you on the number you gave us."
            : "Someone from the SIF Insight team will call you on the number you gave us to arrange your consultation.",
        tone: "ok",
        showDirect: false,
      };
  }
}
