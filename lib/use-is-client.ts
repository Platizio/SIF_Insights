"use client";

import { useSyncExternalStore } from "react";

/* Stable module-level callbacks, so the store is never re-subscribed. */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True once rendering on the client, false during SSR and the first
 * hydrating render.
 *
 * Deliberately NOT `useState(false)` + `useEffect(() => setState(true))`.
 * That is a cascading render — a second render pass triggered by an effect —
 * which the React Compiler lint flags (react-hooks/set-state-in-effect).
 * useSyncExternalStore expresses the same thing as what it actually is: a
 * value that differs between the server and client snapshots.
 *
 * Use it for anything that cannot exist during SSR — `document` for a portal,
 * or a DOM-measuring branch — where the server needs one output and the
 * client another, with hydration matching on the first pass.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(neverChanges, onClient, onServer);
}
