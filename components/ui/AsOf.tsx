import { cn } from "@/lib/cn";

/**
 * "Data as of 18 Sep 2026" — the dated clause every figure block carries.
 *
 * A DATE, never a cadence. "Updated daily" once shipped beside a NAV file
 * that was five days old; a dated statement is the one we can stand behind
 * (DESIGN_CONTRACT §5). So this component has no way to say "live" or
 * "daily", and the date it prints is whatever the data says, not the clock.
 *
 * Two ways in, because callers hold the date in two shapes:
 *   <AsOf date="18 Sep 2026" />                     — already formatted
 *   <AsOf iso="2026-09-18" format={formatUpdated} /> — formatted here, and
 *     the ISO string also lands in <time dateTime> for machines.
 *
 * No hooks and no directive: it renders on the server, and inside a client
 * island when one passes it props.
 */

type AsOfProps = {
  /** Replaces "Data as of" — e.g. "NAV as of", "AUM as of". */
  label?: string;
  className?: string;
  as?: "p" | "span";
} & (
  | { date: string; iso?: string; format?: never }
  | { iso: string; format: (iso: string) => string; date?: never }
);

export function AsOf(props: AsOfProps) {
  const { label = "Data as of", className, as: Tag = "p" } = props;
  const text = props.format ? props.format(props.iso) : props.date;

  return (
    <Tag className={cn("asof", className)}>
      {label}{" "}
      {props.iso ? <time dateTime={props.iso}>{text}</time> : text}
    </Tag>
  );
}
