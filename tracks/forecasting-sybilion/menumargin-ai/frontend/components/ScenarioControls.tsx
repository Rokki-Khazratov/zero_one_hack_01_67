"use client";
import { useState } from "react";

export interface ScenarioValues {
  max_price_increase_percent: number;
  supplier_lead_time_weeks: number;
  allow_recipe_changes: boolean;
  allow_procurement_stock: boolean;
  risk_tolerance: string;
  demand_shock_percent: number;
}

const DEFAULTS: ScenarioValues = {
  max_price_increase_percent: 8,
  supplier_lead_time_weeks: 3,
  allow_recipe_changes: true,
  allow_procurement_stock: true,
  risk_tolerance: "medium",
  demand_shock_percent: 0,
};

export function ScenarioControls({
  onSimulate,
  loading,
}: {
  onSimulate: (sc: ScenarioValues) => void;
  loading: boolean;
}) {
  const [vals, setVals] = useState<ScenarioValues>(DEFAULTS);

  const set = <K extends keyof ScenarioValues>(k: K, v: ScenarioValues[K]) =>
    setVals((p) => ({ ...p, [k]: v }));

  const resetToSundayScenario = () =>
    setVals({ ...DEFAULTS, max_price_increase_percent: 5, supplier_lead_time_weeks: 8, allow_recipe_changes: false });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Scenario Controls</h3>
        <button
          onClick={resetToSundayScenario}
          className="text-xs text-yellow-400 border border-yellow-800 rounded px-2 py-1 hover:bg-yellow-900/30 transition-colors"
        >
          Demo: Tight Constraints
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-400">Max Price Increase: <span className="text-white">{vals.max_price_increase_percent}%</span></label>
          <input
            type="range" min={0} max={20} step={1}
            value={vals.max_price_increase_percent}
            onChange={(e) => set("max_price_increase_percent", +e.target.value)}
            className="w-full mt-1 accent-orange-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400">Supplier Lead Time: <span className="text-white">{vals.supplier_lead_time_weeks} weeks</span></label>
          <input
            type="range" min={1} max={16} step={1}
            value={vals.supplier_lead_time_weeks}
            onChange={(e) => set("supplier_lead_time_weeks", +e.target.value)}
            className="w-full mt-1 accent-orange-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400">Demand Shock: <span className="text-white">{vals.demand_shock_percent}%</span></label>
          <input
            type="range" min={-20} max={20} step={1}
            value={vals.demand_shock_percent}
            onChange={(e) => set("demand_shock_percent", +e.target.value)}
            className="w-full mt-1 accent-orange-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={vals.allow_recipe_changes}
              onChange={(e) => set("allow_recipe_changes", e.target.checked)}
              className="accent-orange-500"
            />
            <span className="text-xs text-zinc-400">Allow recipe changes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={vals.allow_procurement_stock}
              onChange={(e) => set("allow_procurement_stock", e.target.checked)}
              className="accent-orange-500"
            />
            <span className="text-xs text-zinc-400">Allow procurement stock</span>
          </label>
        </div>
      </div>

      <button
        onClick={() => onSimulate(vals)}
        disabled={loading}
        className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? "Simulating…" : "Run Scenario"}
      </button>
    </div>
  );
}
