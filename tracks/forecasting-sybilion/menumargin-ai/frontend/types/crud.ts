export interface Ingredient {
  id: string;
  name: string;
  coicop: string;
  category: string;
  current_price_eur_kg: number;
  unit: string;
  geo: string;
  has_forecast: boolean;
  price_fetched_at: string | null;
  added_at: string;
  notes: string;
}

export interface CatalogItem extends Ingredient {
  active: boolean;
}

export interface IngredientRow {
  ingredient_id: string;
  grams: number;
}

export interface IngredientCost {
  ingredient_id: string;
  grams: number;
  price_per_kg: number;
  cost: number;
  share_pct: number;
}

export interface DishCostInfo {
  ingredient_costs: IngredientCost[];
  total_cost: number;
  current_price: number;
  current_margin: number;
  target_margin: number;
  margin_gap: number;
  required_price: number | null;
}

export interface DishForecastPoint {
  month: string;
  expected_cost: number;
  worst_cost: number;
  best_cost: number;
  expected_margin: number;
  worst_margin: number;
  best_margin: number;
}

export interface DishForecast {
  series: DishForecastPoint[];
  min_expected_margin: number;
  min_worst_margin: number;
  risk_level: "ok" | "medium" | "high" | "critical";
}

export interface Dish {
  id: string;
  name: string;
  current_price_eur: number;
  target_margin: number;
  ingredients: IngredientRow[];
  cost_info?: DishCostInfo;
  forecast?: DishForecast | null;
}
