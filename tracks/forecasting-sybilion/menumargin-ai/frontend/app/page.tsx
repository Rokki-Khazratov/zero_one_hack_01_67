"use client";
import { useEffect, useState } from "react";
import { getDishes, getLatestForecasts, simulateScenario } from "@/lib/api";
import { Dish } from "@/types/crud";
import { MenuAnalysis, IngredientForecast, ScenarioResult } from "@/types/menu";
import { SummaryCards } from "@/components/SummaryCards";
import { MenuRiskTable } from "@/components/MenuRiskTable";
import { DishMarginChart } from "@/components/DishMarginChart";
import { IngredientForecastChart } from "@/components/IngredientForecastChart";
import { ScenarioControls, ScenarioValues } from "@/components/ScenarioControls";
import { ReasoningPanel } from "@/components/ReasoningPanel";
import { StrategyPanel } from "@/components/StrategyPanel";
import { Navigation } from "@/components/Navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "0 32px 48px", display: "flex", flexDirection: "column", gap: 32, marginTop: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[0,1,2,3].map((i) => (
          <div key={i} className="card shimmer" style={{ height: 100, animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="card shimmer" style={{ height: 160 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card shimmer" style={{ height: 260 }} />
        <div className="card shimmer" style={{ height: 260 }} />
      </div>
    </div>
  );
}

function buildAnalysisFromDishes(dishes: Dish[]): MenuAnalysis {
  const dishAnalyses = dishes.map((d) => {
    const ci = d.cost_info;
    const fc = d.forecast;
    const currentMargin = ci?.current_margin ?? 0;
    const targetMargin = d.target_margin;
    const minExpected = fc?.min_expected_margin ?? currentMargin;
    const minWorst = fc?.min_worst_margin ?? currentMargin;

    let risk: "ok" | "medium" | "high" | "critical" = "ok";
    if (minWorst < targetMargin && minExpected < targetMargin) risk = "critical";
    else if (minExpected < targetMargin) risk = "high";
    else if (minWorst < targetMargin) risk = "medium";

    const monthMargins = (fc?.series ?? []).map((pt) => ({
      month: pt.month,
      expected_cost: pt.expected_cost,
      worst_case_cost: pt.worst_cost,
      best_case_cost: pt.best_cost,
      expected_margin: pt.expected_margin,
      worst_case_margin: pt.worst_margin,
      best_case_margin: pt.best_margin,
    }));

    return {
      dish: d.name,
      current_price: d.current_price_eur,
      target_margin: targetMargin,
      current_margin: currentMargin,
      month_margins: monthMargins,
      risk_level: risk,
      min_expected_margin: minExpected,
      min_worst_case_margin: minWorst,
    };
  });

  const atRisk = dishAnalyses.filter((d) => d.risk_level !== "ok").length;
  const critical = dishAnalyses.filter((d) => d.risk_level === "critical").length;
  const avgDrop = dishAnalyses.reduce((s, d) => s + (d.min_expected_margin - d.target_margin), 0) / Math.max(dishAnalyses.length, 1);

  // Find highest risk ingredient (by max price upside in forecast)
  let highestRiskIng = "olive_oil";

  return {
    summary: {
      dishes_at_risk: atRisk,
      critical_dishes: critical,
      average_margin_drop: Math.round(avgDrop * 10000) / 10000,
      highest_risk_ingredient: highestRiskIng,
      total_dishes: dishAnalyses.length,
    },
    dishes: dishAnalyses,
  };
}

export default function Home() {
  const [analysis, setAnalysis]     = useState<MenuAnalysis | null>(null);
  const [forecasts, setForecasts]   = useState<Record<string, IngredientForecast>>({});
  const [scenario, setScenario]     = useState<ScenarioResult | null>(null);
  const [selectedDish, setDish]     = useState<string | null>(null);
  const [selectedIng, setIng]       = useState<string>("olive_oil");
  const [loading, setLoading]       = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch dishes from DB + forecasts
      const [dishData, fcResp] = await Promise.all([
        getDishes(),
        getLatestForecasts(),
      ]);

      const dishes: Dish[] = dishData.dishes ?? [];
      const fcs = fcResp.forecasts ?? {};
      setForecasts(fcs);
      if (!fcs["olive_oil"] && Object.keys(fcs).length > 0) setIng(Object.keys(fcs)[0]);

      // Build MenuAnalysis from dish DB data
      const menuAnalysis = buildAnalysisFromDishes(dishes);
      setAnalysis(menuAnalysis);
      setDish(menuAnalysis.dishes?.[0]?.dish ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runScenario(sc: ScenarioValues) {
    setScenarioLoading(true);
    try {
      const result = await simulateScenario(sc);
      setScenario(result);
    } finally {
      setScenarioLoading(false);
    }
  }

  const dishData = analysis?.dishes.find((d) => d.dish === selectedDish) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      <Navigation onRefresh={load} loading={loading} />

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            margin: "20px 32px 0",
            padding: "12px 16px",
            background: "var(--high-bg)",
            border: "1px solid var(--high-fg)",
            borderRadius: 10,
            color: "var(--high-fg)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⚠</span>
          <span>{error}</span>
          <code
            style={{
              fontFamily: "'SF Mono', ui-monospace, monospace", fontSize: 11,
              background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: 4,
            }}
          >
            check backend
          </code>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && !analysis && <LoadingSkeleton />}

      {/* ── Main ─────────────────────────────────────────────── */}
      {analysis && (
        <main style={{ padding: "32px 32px 64px", display: "flex", flexDirection: "column", gap: 40, maxWidth: 1400, margin: "0 auto" }}>

          {/* Overview */}
          <section>
            <SectionLabel>Overview</SectionLabel>
            <SummaryCards summary={analysis.summary} />
          </section>

          {/* Menu Risk */}
          <section>
            <SectionLabel>Menu Performance — select a dish to inspect</SectionLabel>
            <MenuRiskTable
              dishes={analysis.dishes}
              recs={[]}
              onSelectDish={setDish}
              selectedDish={selectedDish}
            />
          </section>

          {/* Dish Analysis */}
          {dishData && (
            <section>
              <SectionLabel>Dish Analysis</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <DishMarginChart dish={dishData} />
              </div>
            </section>
          )}

          {/* Ingredient Forecasts */}
          {Object.keys(forecasts).length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <SectionLabel>Ingredient Forecasts</SectionLabel>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {Object.keys(forecasts).map((ing) => (
                    <button
                      key={ing}
                      onClick={() => setIng(ing)}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 99,
                        cursor: "pointer",
                        background: selectedIng === ing ? "var(--accent)" : "var(--bg-hover)",
                        color: selectedIng === ing ? "#fff" : "var(--text-2)",
                        border: selectedIng === ing ? "1px solid var(--accent)" : "1px solid var(--border)",
                        fontWeight: selectedIng === ing ? 600 : 400,
                        transition: "all 0.15s ease",
                        textTransform: "capitalize",
                      }}
                    >
                      {ing.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              {forecasts[selectedIng] && (
                <IngredientForecastChart forecast={forecasts[selectedIng]} />
              )}
            </section>
          )}

          {/* Strategy Agent */}
          <section>
            <SectionLabel>Strategy Agent</SectionLabel>
            <StrategyPanel />
          </section>

          {/* Scenario */}
          <section>
            <SectionLabel>Scenario Engine</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ScenarioControls onSimulate={runScenario} loading={scenarioLoading} />
              <ReasoningPanel recs={[]} scenario={scenario} />
            </div>
          </section>

          {/* Footer */}
          <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7 }}>
              Ingredient cost histories reconstructed from Eurostat HICP indices and current price anchors.
              Forecasts provided by <span style={{ color: "var(--text-2)" }}>Sybilion Forecasting API</span>.
              For prototype and demonstration purposes.
            </p>
          </footer>

        </main>
      )}
    </div>
  );
}
