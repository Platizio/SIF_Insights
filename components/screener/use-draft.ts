"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A text box over a value that lives in the URL.
 *
 * Every keystroke rewriting the query string would re-filter 33 rows per
 * character and re-announce the match count mid-word, so the box keeps a
 * DRAFT and commits it after a pause (and at once on Enter / blur, via
 * `flush`). A commit still pending when the box unmounts — a menu shut
 * with Escape straight after typing — is committed then, not lost.
 *
 * The draft follows the committed value when that changes from ELSEWHERE
 * (a chip removed, Clear all, Back): adjusted during render, React's
 * documented alternative to a sync effect. `same` stops our own commit
 * from clobbering what is still being typed — "5." commits as 5, and the
 * box must keep the dot.
 */
export function useDraft(
  committed: string,
  commit: (value: string) => void,
  {
    delay = 400,
    same = (a: string, b: string) => a === b,
  }: { delay?: number; same?: (draft: string, committed: string) => boolean } = {},
) {
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  if (seen !== committed) {
    setSeen(committed);
    if (!same(draft, committed)) setDraft(committed);
  }

  const latest = useRef(commit);
  useEffect(() => {
    latest.current = commit;
  });

  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; value: string } | null>(null);

  useEffect(() => {
    const box = pending;
    return () => {
      const left = box.current;
      if (!left) return;
      clearTimeout(left.timer);
      box.current = null;
      latest.current(left.value);
    };
  }, []);

  const change = (value: string) => {
    setDraft(value);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = {
      value,
      timer: setTimeout(() => {
        pending.current = null;
        latest.current(value);
      }, delay),
    };
  };

  const flush = () => {
    const left = pending.current;
    if (!left) return;
    clearTimeout(left.timer);
    pending.current = null;
    latest.current(left.value);
  };

  return { draft, change, flush };
}
