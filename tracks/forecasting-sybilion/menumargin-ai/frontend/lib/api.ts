const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchDemo() {
  const r = await fetch(`${BASE}/api/dataset/demo`);
  return r.json();
}

export async function runForecasts(force = false) {
  const r = await fetch(`${BASE}/api/forecast/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients: ["pasta","tomatoes","cheese","olive_oil","eggs","flour"], horizon_months: 6, force_refresh: force }),
  });
  return r.json();
}

export async function getLatestForecasts() {
  const r = await fetch(`${BASE}/api/forecast/latest`);
  return r.json();
}

export async function analyzeMenu() {
  const r = await fetch(`${BASE}/api/menu/analyze`, { method: "POST" });
  return r.json();
}

export async function generateRecommendations() {
  const r = await fetch(`${BASE}/api/recommendations/generate`, { method: "POST" });
  return r.json();
}

export async function simulateScenario(scenario: object) {
  const r = await fetch(`${BASE}/api/scenario/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  });
  return r.json();
}
