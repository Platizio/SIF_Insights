"use client";

import { Segmented } from "@/components/ui/Segmented";

import {
  categoryOptions,
  strategyOptions,
  type CategoryChoice,
  type StrategyChoice,
  type StrategyDef,
  type TrackerRow,
} from "./model";

/**
 * Category, then — once one is chosen — that category's SEBI strategies
 * (PRD p.24, p.25). The strategy row is derived from SEBI's list, not from
 * the schemes on file, so a strategy nothing has launched in yet still
 * shows, inert with a zero: the gap is information. Debt is inert the same
 * way while no debt SIF exists.
 *
 * Changing the category resets the strategy in the same event — never in
 * an effect — so the two cannot disagree for a render.
 */
export function CategoryFilter({
  rows,
  strategies,
  category,
  strategy,
  onChange,
}: {
  rows: readonly TrackerRow[];
  strategies: readonly StrategyDef[];
  category: CategoryChoice;
  strategy: StrategyChoice;
  onChange: (category: CategoryChoice, strategy: StrategyChoice) => void;
}) {
  return (
    <div className="grid gap-5">
      <Segmented
        legend="Category"
        legendHidden={false}
        options={categoryOptions(rows)}
        value={category}
        onChange={(c) => onChange(c, "all")}
      />
      {category !== "all" ? (
        <Segmented
          legend="Strategy"
          legendHidden={false}
          options={strategyOptions(rows, strategies, category)}
          value={strategy}
          onChange={(s) => onChange(category, s)}
        />
      ) : null}
    </div>
  );
}
