"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Amc, SifRow } from "@/lib/data/types";
import { LayersIcon } from "@/components/icons";
import { AppliedFilters, type HiddenNote } from "@/components/screener/AppliedFilters";
import { PILL_BASE, PILL_IDLE, PILL_ON } from "@/components/screener/bits";
import { CompareBar } from "@/components/screener/CompareBar";
import type { Commit } from "@/components/screener/controls";
import { CustomiseColumns } from "@/components/screener/CustomiseColumns";
import { absentFor, clearScreen, isMissing, visibleColumns } from "@/components/screener/model";
import { MoreFilters } from "@/components/screener/MoreFilters";
import { QuickFilters } from "@/components/screener/QuickFilters";
import { ResultCards, ResultsTable } from "@/components/screener/Results";
import { SearchBox } from "@/components/screener/SearchBox";
import { SortControl } from "@/components/screener/SortControl";
import { cn } from "@/lib/cn";
import { absentLabel } from "@/lib/format";
import { fieldLabel, fieldsFor, getField } from "@/lib/screener/fields";
import { filterRows } from "@/lib/screener/filter";
import { sortRows } from "@/lib/screener/sort";
import { MAX_PICK, decodeScreen, encodeScreen } from "@/lib/screener/url";
import { replaceSearch, useUrlSearch } from "@/lib/url-state";

/* ============================================================
   The SIF Screener — filter → sort → shortlist (PRD p.31–47).

   THE URL IS THE STATE. Every control writes the screen into the query
   string (lib/screener/url.ts, canonical and round-trip tested) and
   reads it back through useUrlSearch, so a screen is a link: shareable,
   bookmarkable, restored on reload, and followed by Back/Forward.

   Writes are functions of the CURRENT screen, decoded fresh from
   location.search at the moment of the write — never of the render
   that scheduled them. A debounced search keystroke landing after a
   chip was removed therefore cannot resurrect the chip.

   The server has no URL, so it renders the default screen: every SIF,
   default columns, name order. That HTML is the whole table — the page
   reads correctly with JavaScript off — and hydration matches it
   because useUrlSearch's server snapshot is "".

   The registry (lib/screener/fields.ts) is the single source of truth:
   filters, sort keys and columns are generated from its live fields.
   ============================================================ */

export function Screener({ rows, amcs }: { rows: SifRow[]; amcs: Record<string, Amc> }) {
  const search = useUrlSearch();
  const knownCodes = useMemo(() => rows.map((r) => r.code), [rows]);
  const state = useMemo(() => decodeScreen(search, { knownCodes }), [search, knownCodes]);
  const fields = useMemo(() => fieldsFor(rows), [rows]);

  const commit = useCallback<Commit>(
    (update) => {
      const current = decodeScreen(window.location.search, { knownCodes });
      const next = encodeScreen(update(current));
      if (next !== encodeScreen(current)) replaceSearch(next);
    },
    [knownCodes],
  );

  /* Both passes, always: the strict one says what an active filter set
     aside for a MISSING value; the loose one is what "Show them" shows. */
  const { strict, loose } = useMemo(() => {
    const base = { q: state.q, filters: state.filters };
    return {
      strict: filterRows(rows, { ...base, includeMissing: false }),
      loose: filterRows(rows, { ...base, includeMissing: true }),
    };
  }, [rows, state.q, state.filters]);

  const shown = state.includeMissing ? loose.rows : strict.rows;
  const sorted = useMemo(() => sortRows(shown, state.sort), [shown, state.sort]);
  const columns = useMemo(() => visibleColumns(state.cols), [state.cols]);

  const hidden = useMemo<HiddenNote[]>(() => {
    const kept = new Set(strict.rows.map((r) => r.code));
    const aside = loose.rows.filter((r) => !kept.has(r.code));
    return Object.keys(strict.hiddenByMissing).flatMap((id) => {
      const f = getField(id);
      if (!f) return [];
      const reasons = [...new Set(aside.filter((r) => isMissing(f.get(r))).map((r) => absentFor(f, r)))];
      return [
        {
          id,
          label: fieldLabel(f, rows),
          reason: reasons.length === 1 ? absentLabel(reasons[0]) : "not available",
        },
      ];
    });
  }, [strict, loose, rows]);

  const byCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);
  const picked = state.picked.flatMap((code) => byCode.get(code) ?? []);

  const [notice, setNotice] = useState("");
  const onPick = (code: string) => {
    const current = decodeScreen(window.location.search, { knownCodes }).picked;
    if (!current.includes(code) && current.length >= MAX_PICK) {
      setNotice(`You can compare up to ${MAX_PICK} SIFs`);
      return;
    }
    setNotice("");
    commit((s) => ({
      ...s,
      picked: s.picked.includes(code) ? s.picked.filter((c) => c !== code) : [...s.picked, code],
    }));
  };

  const [panel, setPanel] = useState<"more" | "cols" | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const colsRef = useRef<HTMLButtonElement>(null);
  const clearAll = () => commit(clearScreen);

  return (
    <>
      <h2 className="sr-only">Screen the SIF universe</h2>

      <div className="space-y-5">
        <SearchBox q={state.q} commit={commit} />
        {/* Its own stacking layer, so an open menu sits over the table. */}
        <div className="relative z-20">
          <QuickFilters
            rows={rows}
            state={state}
            commit={commit}
            onMore={() => setPanel("more")}
            moreRef={moreRef}
          />
        </div>
      </div>

      <div className="mt-8">
        <AppliedFilters
          rows={rows}
          state={state}
          commit={commit}
          matchCount={shown.length}
          total={rows.length}
          hiddenTotal={strict.hiddenTotal}
          hidden={hidden}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-hairline pt-6">
        <SortControl rows={rows} fields={fields} state={state} commit={commit} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {picked.length === 1 ? (
            <p className="text-[13px] leading-[20px] text-muted">
              <span className="tabular text-ink">1</span> SIF selected — select one more to compare
            </p>
          ) : null}
          <button
            ref={colsRef}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setPanel("cols")}
            className={cn(PILL_BASE, "inline-flex items-center gap-2", state.cols ? PILL_ON : PILL_IDLE)}
          >
            <LayersIcon size={14} />
            Customise columns
            <span className="tabular text-[12px] text-muted">{columns.length}</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <ResultsTable
          rows={sorted}
          universe={rows}
          columns={columns}
          state={state}
          commit={commit}
          picked={state.picked}
          onPick={onPick}
          amcs={amcs}
          onClear={clearAll}
          hiddenTotal={state.includeMissing ? 0 : strict.hiddenTotal}
        />
        <ResultCards
          rows={sorted}
          universe={rows}
          columns={columns}
          state={state}
          commit={commit}
          picked={state.picked}
          onPick={onPick}
          amcs={amcs}
          onClear={clearAll}
          hiddenTotal={state.includeMissing ? 0 : strict.hiddenTotal}
        />
      </div>

      <MoreFilters
        open={panel === "more"}
        onClose={() => setPanel(null)}
        rows={rows}
        fields={fields}
        state={state}
        commit={commit}
        matchCount={shown.length}
        returnFocusRef={moreRef}
      />
      <CustomiseColumns
        open={panel === "cols"}
        onClose={() => setPanel(null)}
        rows={rows}
        fields={fields}
        state={state}
        commit={commit}
        returnFocusRef={colsRef}
      />
      <CompareBar
        picked={picked}
        notice={notice}
        onClear={() => {
          setNotice("");
          commit((s) => ({ ...s, picked: [] }));
        }}
      />
    </>
  );
}
