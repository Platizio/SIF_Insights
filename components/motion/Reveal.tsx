"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  DUR,
  EASE,
  ENTER,
  rise,
  row,
  ruleDraw,
  stagger,
  wipe,
  wipeInner,
} from "@/lib/motion";

/* Every wrapper carries data-reveal so the noscript rule in layout.tsx
   can force it visible when scripting is off. */

/**
 * Has this element scrolled far enough into view to earn its reveal?
 *
 * TRIGGER ON THE TOP EDGE, NEVER ON A FRACTION OF THE ELEMENT.
 *
 * An IntersectionObserver `amount` is a fraction of the ELEMENT, not of the
 * screen. So `amount: 0.35` silently becomes unsatisfiable the moment an
 * element grows past ~2.9x the viewport: the browser can never show 35% of
 * it at once, the observer never fires, and the content sits at opacity 0
 * permanently. That is exactly what blanked the AMC index — a 3319px grid
 * of house cards in a 720px viewport tops out at 22% visible, so all
 * seventeen were mounted, populated, and invisible.
 *
 * A bottom root-margin has no such ceiling. Shrinking the viewport's lower
 * edge by 12% means "fire once the element's top passes 88% of the screen",
 * which is reachable for an element of ANY height, from a 14px eyebrow to a
 * grid several screens tall. It also reads better: reveals key off where a
 * block ENTERS, which is what the eye tracks, rather than off how much bulk
 * happens to fit on screen.
 *
 * `enter` tunes that line for elements that should hold until they are
 * properly on screen (a chart drawing itself, say).
 *
 * The entry line alone has one blind spot, at the opposite end of the scale
 * from the bug it fixes: an element shorter than the margin AND anchored at
 * the very bottom of the document. Scrolled fully down, its top still sits
 * below the shrunk edge, so it never crosses. A footer rule would sit there
 * unrevealed forever. So the trigger is an OR with "fully visible", which
 * that element always satisfies. Between them every geometry is covered —
 * short elements qualify by being wholly on screen, tall ones by crossing
 * the line — and neither condition has a size at which it becomes
 * unsatisfiable.
 */
export function useRevealed(
  ref: React.RefObject<Element | null>,
  enter: number = ENTER.block,
): boolean {
  const crossedEntryLine = useInView(ref, {
    once: true,
    amount: "some",
    /* Negated in the expression, not written as a literal "-" prefix:
       Motion types a margin as `${number}%`, and TS cannot unify that with
       `-${number}%`. */
    margin: `0px 0px ${-enter}% 0px`,
  });

  /* Unreachable for anything taller than the viewport, which is exactly why
     it is an OR and never the sole condition. */
  const whollyOnScreen = useInView(ref, { once: true, amount: "all" });

  return crossedEntryLine || whollyOnScreen;
}

/** Block reveal — 14px, not 32. Arrival, not drift. */
export function Rise({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className={className}
      variants={rise}
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function Group({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* Default entry line. A stagger container is routinely several screens
     tall — this is the wrapper the old fractional threshold could not
     satisfy — so it must key off its top edge. */
  const revealed = useRevealed(ref);

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className={className}
      variants={stagger}
      initial="hidden"
      /* Children with `variants` inherit this state, so <GroupItem> needs
         no trigger of its own and the stagger still propagates. */
      animate={revealed ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function GroupItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div data-reveal="" className={className} variants={rise}>
      {children}
    </motion.div>
  );
}

/** Stagger container for table rows. motion.tbody, so the table stays valid. */
export function RowGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLTableSectionElement>(null);
  /* A tbody can be enormous. Start the cascade as soon as its first rows
     clear the fold rather than making the reader wait. */
  const revealed = useRevealed(ref, ENTER.rows);

  return (
    <motion.tbody
      ref={ref}
      data-reveal=""
      className={className}
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
    >
      {children}
    </motion.tbody>
  );
}

/**
 * Table row. 8px travel — big travel on a ledger looks like a slot machine.
 *
 * The delay is computed from `index` and CAPPED at 10 rather than using
 * staggerChildren, because past ~10 items a stagger stops reading as
 * choreography and starts reading as lag. Rows 11+ all arrive together.
 */
export function RowItem({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.tr
      data-reveal=""
      className={className}
      variants={row}
      transition={{ delay: Math.min(index, 10) * 0.045 }}
    >
      {children}
    </motion.tr>
  );
}

/** Same cascade for the mobile <li> stack, so both renderings agree. */
export function RowListItem({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const revealed = useRevealed(ref, ENTER.item);

  return (
    <motion.li
      ref={ref}
      data-reveal=""
      className={className}
      variants={row}
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
      transition={{ delay: Math.min(index, 10) * 0.045 }}
    >
      {children}
    </motion.li>
  );
}

/**
 * A hairline that draws itself. On warm paper the rules ARE the design,
 * so animating the skeleton is what makes the page feel like one machine.
 * scaleX only — never width, which would relayout every frame.
 */
export function Rule({
  className,
  vertical = false,
  delay = 0,
}: {
  className?: string;
  vertical?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /* A rule is 1px tall, so it should draw the moment it arrives. */
  const revealed = useRevealed(ref, ENTER.rule);

  return (
    <motion.div
      data-reveal=""
      aria-hidden="true"
      className={cn(
        "bg-hairline",
        vertical ? "w-px" : "h-px w-full",
        vertical ? "origin-top" : "origin-left",
        className,
      )}
      ref={ref}
      /* The vertical branch must state its own transition, exactly as
         ruleDraw does. Left bare it was the one variant with no transition
         at all, so Motion fell through to its default for scaleY — a
         critically-damped spring — and the rule overshot ~7% past its
         endpoint before settling back. A hairline that springs reads as a
         bug on a page whose whole structure is drawn in static rules. */
      variants={
        vertical
          ? {
              hidden: { scaleY: 0 },
              show: {
                scaleY: 1,
                transition: {
                  duration: DUR.rule,
                  ease: EASE.outQuart,
                  inherit: true,
                },
              },
            }
          : ruleDraw
      }
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
      transition={{ delay }}
    />
  );
}

/** Clip-path wipe. The frame opens and the image settles — not a fade. */
export function Wipe({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  /**
   * The clip is applied ONLY once we are sure the element is out of view.
   *
   * Motion serialises the `hidden` variant into the server render, and this
   * variant's hidden state is `clip-path: inset(0 0 100% 0)` — fully clipped,
   * i.e. invisible. So the image was blank in SSR, blank with JS disabled,
   * and blank forever if the IntersectionObserver never fired. The noscript
   * guard could not rescue it either: it resets opacity and transform, not
   * clip-path. Rendering un-clipped until then means the honest default is
   * "visible", and the reveal is an enhancement rather than a precondition.
   *
   * ARMING COSTS A FRAME, DELIBERATELY. `useInView` builds its observer in an
   * effect and the first delivery lands a task later, so a naive
   * `mounted && !inView` is true for one committed render on an element that
   * was painted OPEN — and Motion dutifully animates it CLOSED. On the About
   * portrait that was a ~23px bite out of the bottom of the image that then
   * eased back open on every single load. Waiting one frame lets the observer
   * report first, so an element already on screen never plays a close it had
   * no business playing, and one below the fold still clips while off screen
   * where nobody can see it.
   *
   * Failure mode is the safe one: if rAF never ticks, `armed` stays false and
   * the image simply stays visible.
   */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const inView = useRevealed(ref, ENTER.item);

  const show = !armed || inView;

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className={cn("overflow-hidden", className)}
      variants={wipe}
      initial="show"
      animate={show ? "show" : "hidden"}
      transition={{ delay }}
    >
      {/* No h-full: the wrapper has no fixed height, so a percentage height
          resolved against it and left the inner box taller than its parent,
          cropping the image. It sizes to its content instead. */}
      {/* data-reveal here as well as on the wrapper — this inner box carries
          the counter-transform, and the safety nets only reset elements
          carrying the attribute. */}
      <motion.div data-reveal="" variants={wipeInner}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Substrate parallax. Rate ladder only — see PARALLAX in lib/motion.
 * NEVER wrap body copy, tables or charts in this.
 */
export function Parallax({
  children,
  rate = 0.06,
  className,
}: {
  children: ReactNode;
  rate?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const travel = rate * 100;
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${-travel / 2}vh`, `${travel / 2}vh`],
  );

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
