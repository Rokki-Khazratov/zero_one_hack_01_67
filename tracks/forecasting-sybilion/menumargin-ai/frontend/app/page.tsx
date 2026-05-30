"use client";
import { useEffect, useState } from "react";
import { analyzeMenu, generateRecommendations, simulateScenario } from "@/lib/api";
import { MenuAnalysis, Recommendation, IngredientForecast, ScenarioResult } from "@/types/menu";
import { SummaryCards } from "@/components/SummaryCards";
import { MenuRiskTable } from "@/components/MenuRiskTable";
import { DishMarginChart } from "@/components/DishMarginChart";
import { IngredientForecastChart } from "@/components/IngredientForecastChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ScenarioControls, ScenarioValues } from "@/components/ScenarioControls";
import { ReasoningPanel } from "@/components/ReasoningPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export default function Home() {
  const [analysis, setAnalysis]     = useState<MenuAnalysis | null>(null);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
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
      const [menu, recsData] = await Promise.all([analyzeMenu(), generateRecommendations()]);
      if (menu.detail) throw new Error(menu.detail);
      setAnalysis(menu);
      setRecs(recsData.recommendations ?? []);
      setDish(menu.dishes?.[0]?.dish ?? null);

      const r = await fetch(`${API}/api/forecast/latest`);
      const fd = await r.json();
      const fcs = fd.forecasts ?? {};
      setForecasts(fcs);
      if (!fcs["olive_oil"] && Object.keys(fcs).length > 0) setIng(Object.keys(fcs)[0]);
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
  const dishRec  = recs.find((r) => r.dish === selectedDish) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      {/* ── Navbar ───────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            className="display"
            style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text-1)" }}
          >
            MenuMargin
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--accent)", paddingBottom: 1,
            }}
          >
            AI
          </span>
        </div>

        {/* Center breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Italian Bistro</span>
          <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>6-month forecast</span>
          {analysis && (
            <>
              <span style={{ color: "var(--border)", fontSize: 12 }}>·</span>
              <span
                className={`badge badge-${analysis.summary.dishes_at_risk > 0 ? "high" : "ok"}`}
                style={{ fontSize: 10 }}
              >
                {analysis.summary.dishes_at_risk} at risk
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          <button
            onClick={load}
            disabled={loading}
            style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              background: loading ? "var(--bg-hover)" : "var(--bg-hover)",
              color: loading ? "var(--text-3)" : "var(--text-2)",
              border: "1px solid var(--border)",
              transition: "all 0.15s ease",
            }}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </header>

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
              recs={recs}
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
                {dishRec && <RecommendationCard rec={dishRec} />}
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

          {/* Scenario */}
          <section>
            <SectionLabel>Scenario Engine</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ScenarioControls onSimulate={runScenario} loading={scenarioLoading} />
              <ReasoningPanel recs={recs} scenario={scenario} />
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
