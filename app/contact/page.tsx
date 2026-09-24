import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Rise, Rule } from "@/components/motion/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { TrustLoop } from "@/components/sections/TrustLoop";
import { cn } from "@/lib/cn";
import { stats } from "@/lib/data";
import { SITE, mailtoHref, telHref, whatsappHref } from "@/lib/site";
import { ContactForm } from "./ContactForm";

/* `openGraph` repeats siteName/locale/type because Next merges metadata
   shallowly: declaring the key replaces the root layout's block. */
export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a call-back from the SIF Insight team to understand Specialised Investment Funds — the strategies on offer, how they differ and the scheme documents behind each. A distributor, not an adviser.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Book a Consultation — SIF Insight",
    description:
      "Leave your name and mobile number and the SIF Insight team will call you back to talk through the SIF category.",
    url: "/contact",
    /* Declaring `openGraph` drops the root opengraph-image; restated. */
    images: "/opengraph-image.png",
    siteName: SITE.name,
    locale: "en_IN",
    type: "website",
  },
};

/**
 * `/contact` — Book a Consultation.
 *
 * The form takes the free column; the rail is the part of the page that
 * works whatever the form's delivery state is (see lib/leads/deliver.ts),
 * so the direct channels get real weight rather than a footnote.
 */
export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Book a Consultation"
        lines={["Talk it through with", "the SIF Insight team."]}
        standfirst="Leave your name and mobile number and someone from the SIF Insight team will call you back — at the time you prefer, if you choose one. We will walk you through how SIFs work, the strategies on offer and the scheme documents behind each. We are a distributor, not an investment adviser: the decision stays yours."
        meta={[
          `${stats.strategyCount} schemes across ${stats.amcCount} asset managers`,
          SITE.arnLine,
        ]}
      />

      <Section id="book">
        <Shell>
          {/* Asymmetric by contract: form free, rail fixed at 380px. */}
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

      <TrustLoop />

      <DistributorNote />
    </>
  );
}

function ContactRail() {
  return (
    <div className="border border-hairline bg-surface">
      <div className="p-6 sm:p-8">
        <Eyebrow>Direct lines</Eyebrow>
        <p className="mt-4 text-[15px] leading-[26px] text-body">
          Prefer to reach us yourself? These go straight to the team.
        </p>
      </div>

      <Rule />
      <ChannelRow label="Call" href={telHref} icon={<PhoneIcon size={16} />} tabular>
        {SITE.phoneDisplay}
      </ChannelRow>
      <Rule />
      <ChannelRow label="WhatsApp" href={whatsappHref()} icon={<WhatsAppIcon size={16} />} external>
        Start a chat
      </ChannelRow>
      <Rule />
      <ChannelRow label="Email" href={mailtoHref} icon={<MailIcon size={16} />}>
        {SITE.email}
      </ChannelRow>
      <Rule />

      <div className="p-6 sm:px-8 sm:py-7">
        <p className="flex items-center gap-2 text-[13px] leading-[18px] text-muted">
          <MapPinIcon size={14} />
          Office
        </p>
        <address className="mt-2 text-[15px] not-italic leading-[26px] text-ink">
          {SITE.legalEntity}
          {SITE.address.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      </div>
    </div>
  );
}

function ChannelRow({
  label,
  href,
  icon,
  children,
  external = false,
  tabular = false,
}: {
  label: string;
  href: string;
  icon: ReactNode;
  children: ReactNode;
  external?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="p-6 sm:px-8 sm:py-7">
      <p className="flex items-center gap-2 text-[13px] leading-[18px] text-muted">
        {icon}
        {label}
      </p>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          "group mt-2 inline-flex items-center gap-2 [overflow-wrap:anywhere] text-[19px] font-medium leading-[28px] text-ink",
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
        {external ? <span className="sr-only">(opens in a new tab)</span> : null}
      </a>
    </div>
  );
}

/** The distributor note that closes the page — plain, not another CTA. */
function DistributorNote() {
  return (
    <Section className="pt-0">
      <Shell>
        <Rule />
        <div className="mt-12 grid gap-8 lg:grid-cols-[460px_1fr] lg:gap-24">
          <div>
            <Rise>
              <Eyebrow>Who you will speak to</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              lines={["A distributor,", "not an adviser."]}
              className="mt-5 text-[clamp(32px,4vw,48px)] font-medium leading-[1.16] text-ink"
            />
          </div>
          <Rise delay={0.12} className="lg:self-end">
            <p className="max-w-[60ch] text-[17px] leading-[30px] text-body">
              SIF Insight is operated by {SITE.legalEntity}, an {SITE.arnLine}. We are not an
              asset manager and not an investment adviser. We track the SIF market, publish
              the disclosures and help you shortlist; the decision to invest, and any advice
              on it, stays with you and your adviser.
            </p>
            <p className="mt-4 max-w-[60ch] text-[14px] leading-[24px] text-muted">
              Investments in SIFs are subject to market risks. Read all scheme-related
              documents carefully before investing.
            </p>
          </Rise>
        </div>
      </Shell>
    </Section>
  );
}
