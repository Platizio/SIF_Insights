import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Rise, Rule } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { cn } from "@/lib/cn";
import { stats } from "@/lib/data";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to SIF Insight about India's Specialised Investment Funds. Email, phone and WhatsApp, plus an enquiry form. Operated by Platizio Services LLP, a certified distributor of Mutual Funds and SIFs.",
};

/* The prefill is encoded rather than hand-written so the apostrophe-free
   sentence survives any later edit that introduces one. */
const WHATSAPP_PREFILL = "Hello, I would like to know more about SIF Insight.";
const WHATSAPP_URL = `https://wa.me/919205523100?text=${encodeURIComponent(
  WHATSAPP_PREFILL,
)}`;

/**
 * `/contact`.
 *
 * The right column is not a sidebar of last resort — it is the part of
 * this page that is guaranteed to work. The form's delivery path is not
 * configured yet (see `actions.ts`), so an email address, a phone number
 * and a WhatsApp thread are the channels that actually reach us, and they
 * are given the weight to match.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        lines={["Tell us your goals.", "We will map the funds."]}
        standfirst="We are a distributor, not an adviser. Tell us your objective, horizon and risk comfort, and we will show you which SIF schemes fit — along with the risk band, exit load, expense ratio and minimum behind each one."
        /* Plain strings, not fragments: the array is mapped inside
           PageHeader, and bare JSX in an array literal trips jsx-key. */
        meta={[
          `${stats.strategyCount} schemes across ${stats.amcCount} asset managers`,
          "Distributor — not an adviser or an AMC",
        ]}
      />

      <Section>
        <Shell>
          {/* Asymmetric by contract: the form takes the free column, the
              details take a fixed 380px rail. Never 50/50. */}
          <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-16">
            <Rise>
              <ContactForm />
            </Rise>

            <Rise delay={0.12} className="lg:sticky lg:top-28">
              <ContactRail />
            </Rise>
          </div>
        </Shell>
      </Section>
    </>
  );
}

function ContactRail() {
  return (
    <div className="border border-hairline bg-surface">
      <div className="p-6 sm:p-8">
        <Eyebrow>Direct lines</Eyebrow>
        <p className="mt-4 text-[15px] leading-[26px] text-body">
          These reach a person. Use them in preference to the form if you want
          an answer today.
        </p>
      </div>

      <Rule />

      <ChannelRow label="Email" href="mailto:info@sifinsight.com">
        info@sifinsight.com
      </ChannelRow>

      <Rule />

      <ChannelRow label="Phone" href="tel:+919205523100" tabular>
        +91 92055 23100
      </ChannelRow>

      <Rule />

      <ChannelRow label="WhatsApp" href={WHATSAPP_URL} external>
        Start a chat
      </ChannelRow>

      <Rule />

      <div className="bg-accent-wash p-6 sm:p-8">
        <p className="text-[14px] leading-[22px] text-body">
          Powered by{" "}
          <strong className="font-medium text-ink">
            Platizio Services LLP
          </strong>{" "}
          — a certified distributor of Mutual Funds and SIFs.
        </p>
        <p className="mt-4 text-[13px] leading-[20px] text-muted">
          We are not an AMC and not an investment adviser. We track the SIF
          market, publish the disclosures, and help you shortlist. The decision
          to invest, and any advice on it, stays with you and your adviser.
        </p>
      </div>

      {/* The site this replaces shipped a panel reading "Calendly calendar
          will be embedded here". A placeholder that describes a feature is
          worse than no feature, so scheduling is simply absent. To add it,
          mount the embed as its own client component below this block and
          give it a real fallback link — never a caption promising one. */}
    </div>
  );
}

function ChannelRow({
  label,
  href,
  children,
  external = false,
  tabular = false,
}: {
  label: string;
  href: string;
  children: ReactNode;
  external?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="p-6 sm:px-8 sm:py-7">
      <p className="text-[13px] leading-[18px] text-muted">{label}</p>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          "group mt-2 inline-flex items-center gap-2 text-[19px] font-medium leading-[28px] text-ink",
          "transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent",
          tabular && "tabular",
        )}
      >
        <span className="relative inline-block">
          {children}
          <span
            aria-hidden="true"
            className="absolute -bottom-[3px] left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
          />
        </span>
        {external ? (
          <>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.75 1.5h5.75v5.75M10.5 1.5 5.25 6.75M9 7v3.5H1.5V3H5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </>
        ) : null}
      </a>
    </div>
  );
}
