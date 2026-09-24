"use client";

import { Odometer } from "@/components/motion/Odometer";
import { AsOf } from "@/components/ui/AsOf";

import { partitionNfos, type NfoItem } from "./model";
import { useNfoToday } from "./NfoClock";
import { StatBody } from "./stat";

type Window = Pick<NfoItem, "active" | "opensOn" | "closesOn">;

/**
 * The snapshot's Live NFOs / Upcoming SIFs figure.
 *
 * The page is static, but an offer window is not: a build can sit live
 * across a closing date. So the count renders the build's answer (measured
 * on the NAV date, identical to `stats.openNfoCount` / `upcomingNfoCount`)
 * and re-derives it against the reader's date after mount — through the
 * same `partitionNfos` the NFO section uses, so the tile and the list below
 * it can never disagree.
 */
export function NfoStat({
  windows,
  which,
  label,
  fallbackIso,
  fallbackLabel,
}: {
  windows: Window[];
  which: "open" | "upcoming";
  label: string;
  fallbackIso: string;
  fallbackLabel: string;
}) {
  const today = useNfoToday(fallbackIso, fallbackLabel);
  const { open, upcoming } = partitionNfos(windows, today.iso);
  const count = which === "open" ? open.length : upcoming.length;

  return (
    <StatBody
      figure={<Odometer value={count} />}
      label={label}
      asOf={<AsOf date={today.label} iso={today.iso} />}
    />
  );
}
