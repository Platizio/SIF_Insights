"use client";

import { formatUpdated } from "@/lib/format";
import { useTodayIso } from "@/lib/use-today";

/**
 * The date the NFO islands measure offer windows against, and its label.
 *
 * During SSR and the hydrating render this is the build's date and the
 * label the SERVER formatted — so the first client render is byte-identical
 * to the HTML (ICU builds disagree on "Sep" vs "Sept"). After mount it is
 * the reader's date in India, never earlier than the build's: the data
 * cannot describe a day that has not happened yet, so a clock running
 * behind is ignored rather than trusted.
 */
export function useNfoToday(fallbackIso: string, fallbackLabel: string): {
  iso: string;
  label: string;
} {
  const client = useTodayIso(fallbackIso);
  const iso = client > fallbackIso ? client : fallbackIso;
  return { iso, label: iso === fallbackIso ? fallbackLabel : formatUpdated(iso) };
}
