"use client";
import { useState } from "react";
import { runStrategy } from "@/lib/api";

interface IngredientStrategy {
  ingredient: string;
  action: string;
  reason: string;
  confidence: string;
  confidence_score: number;
  current_price: number;
  forecast_median: number;
  forecast_lower: number;
  forecast_upper: number;
  pct_change_expected: number;
  pct_upside_worst: number;
  top_driver: string;
  hitl_approval_required: boolean;
  hitl_reason: string | null;
}

interface DishStrategy {
  dish: string;
  action: string;
  reason: string;
  confidence: string;
  current_price: number;
  target_margin: number;
  current_margin: number;
  min_expected_margin: number;
  min_worst_margin: number;
  risk_level: string;
  required_price: number;
  price_gap_pct: number;
  costliest_ingredient: string | null;
  costliest_share_pct: number;
  hitl_approval_required: boolean;
  hitl_reason: string | null;
}

interface WorkflowStep {
  step: number;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
}

interface StrategyResult {
  generated_at: string;
  summary: {
    total_ingredients: number;
    total_dishes: number;
    buy_now_count: number;
    critical_dishes: number;
    hitl_decisions_pending: number;
  };
  ingredient_strategies: IngredientStrategy[];
  dish_strategies: DishStrategy[];
  workflow_log: WorkflowStep[];
}

const ACTION_COLORS: Record<string, string> = {
  buy_now: "var(--high-fg)",
  buy_partial: "var(--mid-fg)",
  wait: "var(--ok-fg)",
  monitor: "var(--text-3)",
  switch_supplier: "var(--high-fg)",
  keep_price: "var(--ok-fg)",
  raise_price_now: "var(--high-fg)",
  raise_price_gradual: "var(--mid-fg)",
  change_recipe: "var(--mid-fg)",
  accept_margin_drop: "var(--text-3)",
  review_manually: "var(--high-fg)",
};

const ACTION_LABELS: Record<string, string> = {
  buy_now: "Buy Now",
  buy_partial: "Buy Partial",
  wait: "Wait",
  monitor: "Monitor",
  switch_supplier: "Switch Supplier",
  keep_price: "Keep Price",
  raise_price_now: "Raise Price Now",
  raise_price_gradual: "Raise Gradually",
  change_recipe: "Change Recipe",
  accept_margin_drop: "Accept Drop",
  review_manually: "Manual Review",
};

const AGENT_ICONS: Record<string, string> = {
  data_agent: "📊",
  analysis_agent: "🔬",
  strategy_agent: "🎯",
  hitl_agent: "👤",
};

function ConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    high: { bg: "var(--ok-bg)", fg: "var(--ok-fg)" },
    medium: { bg: "var(--mid-bg)", fg: "var(--mid-fg)" },
    low: { bg: "var(--high-bg)", fg: "var(--high-fg)" },
  };
  const c = colors[level] ?? colors.low;
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 99,
      background: c.bg, color: c.fg, fontWeight: 500,
    }}>
      {level}
    </span>
  );
}

function HitlBadge() {
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 99,
      background: "var(--accent-light)", color: "var(--accent)", fontWeight: 500,
      border: "1px solid var(--accent)",
    }}>
      needs approval
    </span>
  );
}

function IngredientCard({ s }: { s: IngredientStrategy }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="card"
      style={{
        padding: "14px 16px", cursor: "pointer",
        borderLeft: `3px solid ${ACTION_COLORS[s.action] ?? "var(--border)"}`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", textTransform: "capitalize" }}>
            {s.ingredient.replace(/_/g, " ")}
          </span>
          <ConfidenceBadge level={s.confidence} />
          {s.hitl_approval_required && <HitlBadge />}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: ACTION_COLORS[s.action],
          padding: "3px 10px", borderRadius: 8,
          background: `${ACTION_COLORS[s.action]}15`,
        }}>
          {ACTION_LABELS[s.action] ?? s.action}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>{s.reason}</p>
      {expanded && (
        <div style={{
          marginTop: 10, padding: "10px 12px", background: "var(--bg-hover)",
          borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        }}>
          {[
            { label: "Current", value: `€${s.current_price}/kg` },
            { label: "Forecast M6", value: `€${s.forecast_median}/kg` },
            { label: "Expected Δ", value: `${s.pct_change_expected > 0 ? "+" : ""}${s.pct_change_expected}%` },
            { label: "Worst Case", value: `€${s.forecast_upper}/kg` },
            { label: "Best Case", value: `€${s.forecast_lower}/kg` },
            { label: "Top Driver", value: s.top_driver.length > 20 ? s.top_driver.slice(0, 20) + "…" : s.top_driver },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
              <p className="mono" style={{ fontSize: 12, color: "var(--text-1)", marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DishCard({ s }: { s: DishStrategy }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="card"
      style={{
        padding: "14px 16px", cursor: "pointer",
        borderLeft: `3px solid ${ACTION_COLORS[s.action] ?? "var(--border)"}`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{s.dish}</span>
          <span className={`badge badge-${s.risk_level}`}>{s.risk_level}</span>
          {s.hitl_approval_required && <HitlBadge />}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: ACTION_COLORS[s.action],
          padding: "3px 10px", borderRadius: 8,
          background: `${ACTION_COLORS[s.action]}15`,
        }}>
          {ACTION_LABELS[s.action] ?? s.action}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>{s.reason}</p>
      {expanded && (
        <div style={{
          marginTop: 10, padding: "10px 12px", background: "var(--bg-hover)",
          borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
        }}>
          {[
            { label: "Menu Price", value: `€${s.current_price.toFixed(2)}` },
            { label: "Target Margin", value: `${(s.target_margin * 100).toFixed(0)}%` },
            { label: "Current Margin", value: `${(s.current_margin * 100).toFixed(1)}%` },
            { label: "M6 Expected", value: `${(s.min_expected_margin * 100).toFixed(1)}%` },
            { label: "M6 Worst", value: `${(s.min_worst_margin * 100).toFixed(1)}%` },
            { label: "Price Gap", value: `${s.price_gap_pct > 0 ? "+" : ""}${s.price_gap_pct}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</p>
              <p className="mono" style={{ fontSize: 12, color: "var(--text-1)", marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowTimeline({ log }: { log: WorkflowStep[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {log.map((step, i) => (
        <div key={step.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Timeline line */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i === log.length - 1 ? "var(--accent)" : "var(--border)",
              border: "2px solid var(--bg-card)",
            }} />
            {i < log.length - 1 && (
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
            )}
          </div>
          {/* Content */}
          <div style={{ paddingBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>{AGENT_ICONS[step.agent] ?? "🤖"}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)" }}>{step.agent.replace(/_/g, " ")}</span>
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>→</span>
              <span style={{ fontSize: 11, color: "var(--accent)" }}>{step.action.replace(/_/g, " ")}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StrategyPanel() {
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"ingredients" | "dishes" | "log">("ingredients");

  async function handleRun() {
    setLoading(true);
    try {
      const data = await runStrategy();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2 }}>
            Strategy Agent
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            Procurement + pricing decisions with reasoning
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            padding: "8px 16px", borderRadius: 8, cursor: loading ? "default" : "pointer",
            background: loading ? "var(--bg-hover)" : "var(--accent)",
            color: loading ? "var(--text-3)" : "#fff",
            fontSize: 12, fontWeight: 500, border: "none",
          }}
        >
          {loading ? "Analyzing…" : "Run Strategy"}
        </button>
      </div>

      {/* Summary */}
      {result && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
          background: "var(--border)", borderRadius: 10, overflow: "hidden",
        }}>
          {[
            { label: "Buy Now", value: result.summary.buy_now_count, color: "var(--high-fg)" },
            { label: "Critical Dishes", value: result.summary.critical_dishes, color: "var(--high-fg)" },
            { label: "HITL Pending", value: result.summary.hitl_decisions_pending, color: "var(--accent)" },
            { label: "Ingredients", value: result.summary.total_ingredients, color: "var(--text-1)" },
          ].map((m) => (
            <div key={m.label} style={{ background: "var(--bg-card)", padding: "12px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                {m.label}
              </p>
              <p className="display" style={{ fontSize: 24, fontWeight: 400, color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {result && (
        <div style={{ display: "flex", gap: 2 }}>
          {(["ingredients", "dishes", "log"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                background: tab === t ? "var(--accent-light)" : "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-3)",
                border: "none", fontWeight: tab === t ? 500 : 400,
              }}
            >
              {t === "ingredients" ? "Procurement" : t === "dishes" ? "Dish Pricing" : "Agent Log"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {result && tab === "ingredients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.ingredient_strategies.map((s) => (
            <IngredientCard key={s.ingredient} s={s} />
          ))}
        </div>
      )}

      {result && tab === "dishes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.dish_strategies.map((s) => (
            <DishCard key={s.dish} s={s} />
          ))}
        </div>
      )}

      {result && tab === "log" && (
        <div style={{ padding: "8px 0" }}>
          <WorkflowTimeline log={result.workflow_log} />
        </div>
      )}

      {!result && !loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          Click "Run Strategy" to analyze ingredients and dishes.
        </div>
      )}
    </div>
  );
}
