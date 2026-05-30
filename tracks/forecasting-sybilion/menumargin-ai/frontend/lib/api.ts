const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchDemo() {
  const r = await fetch(`${BASE}/api/dataset/demo`);
  return r.json();
}

export async function runForecasts(force = false) {
  const r = await fetch(`${BASE}/api/forecast/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients: ["pasta","tomatoes","cheese","olive_oil","eggs","flour","butter","cream","chicken","rice","wine","potatoes","sugar","coffee","milk","fish"], horizon_months: 6, force_refresh: force }),
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

// ── Ingredients ──────────────────────────────────────────────────────
export async function getIngredients() {
  const r = await fetch(`${BASE}/api/ingredients`);
  return r.json();
}

export async function getIngredientCatalog() {
  const r = await fetch(`${BASE}/api/ingredients/catalog`);
  return r.json();
}

export async function createIngredient(data: object) {
  const r = await fetch(`${BASE}/api/ingredients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function updateIngredient(id: string, data: object) {
  const r = await fetch(`${BASE}/api/ingredients/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function deleteIngredient(id: string) {
  await fetch(`${BASE}/api/ingredients/${id}`, { method: "DELETE" });
}

export async function triggerFetchHistory(id: string) {
  const r = await fetch(`${BASE}/api/ingredients/${id}/fetch-history`, { method: "POST" });
  return r.json();
}

// ── Dishes ───────────────────────────────────────────────────────────
export async function getDishes() {
  const r = await fetch(`${BASE}/api/dishes`);
  return r.json();
}

export async function getDish(id: string) {
  const r = await fetch(`${BASE}/api/dishes/${id}`);
  return r.json();
}

export async function createDish(data: object) {
  const r = await fetch(`${BASE}/api/dishes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function updateDish(id: string, data: object) {
  const r = await fetch(`${BASE}/api/dishes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function deleteDish(id: string) {
  await fetch(`${BASE}/api/dishes/${id}`, { method: "DELETE" });
}

// ── Strategy Agent ───────────────────────────────────────────────────
export async function runStrategy() {
  const r = await fetch(`${BASE}/api/strategy/run`, { method: "POST" });
  return r.json();
}
