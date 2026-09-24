"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AmcMark } from "@/components/AmcMark";
import { NotCaptured } from "@/components/ui/NotCaptured";
import { SourceNote } from "@/components/ui/SourceNote";
import { cn } from "@/lib/cn";
import { formatInr } from "@/lib/format";

import { CATEGORY_LABEL, markAmc, partitionNfos, sifHref, type NfoItem } from "./model";
import { useNfoToday } from "./NfoClock";

/**
 * The open or the upcoming offers, as cards — re-derived against the
 * reader's date after mount, exactly as the snapshot tiles are, so a tile
 * saying "1 Live NFO" is never above a list saying none.
 *
 * "Live NFO" is used ONLY for an offer whose window contains today: it is
 * a subscription status, and the one place the word "live" is allowed.
 */
export function NfoList({
  items,
  kind,
  fallbackIso,
  fallbackLabel,
}: {
  items: NfoItem[];
  kind: "open" | "upcoming";
  fallbackIso: string;
  fallbackLabel: string;
}) {
  const today = useNfoToday(fallbackIso, fallbackLabel);
  const { open, upcoming } = partitionNfos(items, today.iso);
  const list = kind === "open" ? open : upcoming;

  if (list.length === 0) {
    return (
      <p className="border-y border-hairline py-6 text-[15px] leading-[26px] text-body">
        {kind === "open"
          ? `No SIF NFO is open for subscription as of ${today.label}.`
          : `No upcoming SIF launch is on file as of ${today.label}.`}
      </p>
    );
  }

  return (
    <ul className="grid gap-4">
      {list.map((n) => (
        <li key={n.id}>
          <NfoCard nfo={n} kind={kind} />
        </li>
      ))}
    </ul>
  );
}

function NfoCard({ nfo, kind }: { nfo: NfoItem; kind: "open" | "upcoming" }) {
  /* An upcoming offer may not have announced its window yet; an open one
     always has a closing date (nfoStatus requires it), and a missing open
     date there is a gap in our record, not an unannounced one. */
  const missingDate = kind === "upcoming" ? "Not announced" : null;
  const meta = [nfo.strategy, nfo.category ? CATEGORY_LABEL[nfo.category] : null].filter(Boolean);

  return (
    <article className="border border-hairline bg-surface p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <AmcMark amc={nfo.amc ? markAmc(nfo.amc) : undefined} size="sm" />
        <span className="inline-flex shrink-0 items-center rounded-full border border-hairline bg-accent-wash px-3 py-1 text-[13px] leading-[20px] text-ink">
          {kind === "open" ? "Live NFO" : "Upcoming"}
        </span>
      </div>

      <h4 className="mt-5 text-[15px] leading-[22px] text-ink">
        {nfo.sifId ? (
          <Link
            href={sifHref(nfo.sifId)}
            className="underline decoration-hairline underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent"
          >
            {nfo.schemeName}
          </Link>
        ) : (
          nfo.schemeName
        )}
      </h4>
      <p className="mt-1 text-[13px] leading-[20px] text-muted">
        {nfo.amc ? nfo.amc.sifName : <NotCaptured />}
        {meta.length > 0 ? ` · ${meta.join(" · ")}` : null}
      </p>

      <dl className="mt-5 grid grid-cols-2 border-t border-hairline">
        <Fact label="Opens" numeric={nfo.opensLabel !== null}>
          {nfo.opensLabel ?? missingDate ?? <NotCaptured />}
        </Fact>
        <Fact label="Closes" numeric={nfo.closesLabel !== null}>
          {nfo.closesLabel ?? missingDate ?? <NotCaptured />}
        </Fact>
        <Fact label="Min. investment" numeric={nfo.minInvestment !== null}>
          {nfo.minInvestment !== null ? formatInr(nfo.minInvestment) : <NotCaptured />}
        </Fact>
        <Fact label="Benchmark">{nfo.benchmark ?? <NotCaptured />}</Fact>
      </dl>

      {nfo.source ? (
        <SourceNote
          className="mt-4"
          sources={[{ label: `${nfo.source.publisher} ${nfo.source.docType}`, href: nfo.source.url }]}
        />
      ) : (
        <p className="mt-4 text-[13px] leading-[20px] text-muted">
          Source: <NotCaptured />
        </p>
      )}
    </article>
  );
}

function Fact({
  label,
  numeric = false,
  children,
}: {
  label: string;
  numeric?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-b border-hairline py-3 odd:border-r odd:pr-4 even:pl-4">
      <dt className="text-[13px] leading-[20px] text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-[15px] leading-[22px] text-ink",
          numeric && "tabular",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
