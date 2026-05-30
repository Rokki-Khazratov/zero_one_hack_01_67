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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [forecasts, setForecasts] = useState<Record<string, IngredientForecast>>({});
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [selectedIng, setSelectedIng] = useState<string>("olive_oil");
  const [loading, setLoading] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [menuData, recsData] = await Promise.all([analyzeMenu(), generateRecommendations()]);
      if (menuData.detail) throw new Error(menuData.detail);
      setAnalysis(menuData);
      setRecs(recsData.recommendations ?? []);
      setSelectedDish(menuData.dishes?.[0]?.dish ?? null);

      const r = await fetch(`${API}/api/forecast/latest`);
      const fData = await r.json();
      setForecasts(fData.forecasts ?? {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleScenario(sc: ScenarioValues) {
    setScenarioLoading(true);
    try {
      const result = await simulateScenario(sc);
      setScenario(result);
    } finally {
      setScenarioLoading(false);
    }
  }

  const selectedDishData = analysis?.dishes.find((d) => d.dish === selectedDish) ?? null;
  const selectedRec = recs.find((r) => r.dish === selectedDish) ?? null;

  return (
    <main className="min-h-screen bg-black text-white font-sans">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">MenuMargin AI</h1>
          <p className="text-xs text-zinc-500">Italian Bistro · Ingredient cost forecast · 6-month horizon</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="text-xs text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </header>

      {error && (
        <div className="mx-6 mt-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error} — run <code className="bg-red-950 px-1 rounded">POST /api/forecast/run</code> first
        </div>
      )}

      {loading && !analysis && (
        <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading forecast data…</div>
      )}

      {analysis && (
        <div className="px-6 py-6 space-y-8">
          <section>
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Overview</h2>
            <SummaryCards summary={analysis.summary} />
          </section>

          <section>
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Menu Risk — click a dish to inspect</h2>
            <MenuRiskTable dishes={analysis.dishes} recs={recs} onSelectDish={setSelectedDish} selectedDish={selectedDish} />
          </section>

          {selectedDishData && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DishMarginChart dish={selectedDishData} />
              {selectedRec && <RecommendationCard rec={selectedRec} />}
            </section>
          )}

          <section>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest">Ingredient Forecasts</h2>
              <div className="flex gap-1 flex-wrap">
                {Object.keys(forecasts).map((ing) => (
                  <button
                    key={ing}
                    onClick={() => setSelectedIng(ing)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      selectedIng === ing ? "bg-orange-600 border-orange-500 text-white" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {ing.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            {forecasts[selectedIng] && <IngredientForecastChart forecast={forecasts[selectedIng]} />}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScenarioControls onSimulate={handleScenario} loading={scenarioLoading} />
            <ReasoningPanel recs={recs} scenario={scenario} />
          </section>
        </div>
      )}
    </main>
  );
}
