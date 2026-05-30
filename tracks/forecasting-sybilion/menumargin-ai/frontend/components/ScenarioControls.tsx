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

function Slider({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)" }}>
          {value}{label.includes("week") ? "w" : "%"}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 99,
          background: checked ? "var(--accent)" : "var(--bg-hover)",
          border: "1px solid var(--border)",
          position: "relative", transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute", top: 2, left: 2,
            width: 14, height: 14, borderRadius: "50%",
            background: checked ? "#fff" : "var(--text-3)",
            transform: checked ? "translateX(16px)" : "translateX(0)",
            transition: "transform 0.2s ease",
          }}
        />
      </div>
    </label>
  );
}

export function ScenarioControls({ onSimulate, loading }: { onSimulate: (sc: ScenarioValues) => void; loading: boolean }) {
  const [vals, setVals] = useState<ScenarioValues>(DEFAULTS);
  const set = <K extends keyof ScenarioValues>(k: K, v: ScenarioValues[K]) => setVals((p) => ({ ...p, [k]: v }));
  const tight = () => setVals({ ...DEFAULTS, max_price_increase_percent: 5, supplier_lead_time_weeks: 8, allow_recipe_changes: false });

  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2 }}>
            Scenario
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Adjust constraints and re-run</p>
        </div>
        <button
          onClick={tight}
          style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            background: "var(--mid-bg)", color: "var(--mid-fg)",
            border: "1px solid transparent",
          }}
        >
          Demo: tight
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Slider label="Max price increase" value={vals.max_price_increase_percent} min={0} max={20} step={1}
          onChange={(v) => set("max_price_increase_percent", v)} />
        <Slider label="Supplier lead time (weeks)" value={vals.supplier_lead_time_weeks} min={1} max={16} step={1}
          onChange={(v) => set("supplier_lead_time_weeks", v)} />
        <Slider label="Demand shock" value={vals.demand_shock_percent} min={-20} max={20} step={1}
          onChange={(v) => set("demand_shock_percent", v)} />
      </div>

      <div
        style={{
          display: "flex", flexDirection: "column", gap: 10,
          padding: "14px 16px", borderRadius: 10,
          background: "var(--bg-hover)", border: "1px solid var(--border-muted)",
        }}
      >
        <Toggle label="Allow recipe changes"     checked={vals.allow_recipe_changes}     onChange={(v) => set("allow_recipe_changes", v)} />
        <Toggle label="Allow procurement stock"  checked={vals.allow_procurement_stock}  onChange={(v) => set("allow_procurement_stock", v)} />
      </div>

      <button
        onClick={() => onSimulate(vals)}
        disabled={loading}
        style={{
          padding: "11px", borderRadius: 10, cursor: loading ? "default" : "pointer",
          background: loading ? "var(--bg-hover)" : "var(--accent)",
          color: loading ? "var(--text-3)" : "#fff",
          fontSize: 13, fontWeight: 500, border: "none",
          transition: "background 0.2s ease",
          letterSpacing: "0.01em",
        }}
      >
        {loading ? "Simulating…" : "Run Scenario"}
      </button>
    </div>
  );
}
