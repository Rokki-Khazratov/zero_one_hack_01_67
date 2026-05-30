export interface ForecastPoint {
  month: string;
  median: number;
  lower_band: number;
  upper_band: number;
}

export interface DriverSignal {
  driver_name: string;
  importance: number;
  direction: number;
}

export interface IngredientForecast {
  ingredient: string;
  current_price_per_kg: number;
  forecast: ForecastPoint[];
  drivers: DriverSignal[];
  backtest: { mape: number | null; reliability: string };
}

export interface DishMonthMargin {
  month: string;
  expected_cost: number;
  worst_case_cost: number;
  best_case_cost: number;
  expected_margin: number;
  worst_case_margin: number;
  best_case_margin: number;
}

export interface DishAnalysis {
  dish: string;
  current_price: number;
  target_margin: number;
  current_margin: number;
  month_margins: DishMonthMargin[];
  risk_level: "ok" | "medium" | "high" | "critical";
  min_expected_margin: number;
  min_worst_case_margin: number;
}

export interface MenuSummary {
  dishes_at_risk: number;
  critical_dishes: number;
  average_margin_drop: number;
  highest_risk_ingredient: string;
  total_dishes: number;
}

export interface MenuAnalysis {
  summary: MenuSummary;
  dishes: DishAnalysis[];
}

export interface PricePlanStep {
  month: string;
  recommended_price: number;
}

export interface Recommendation {
  dish: string;
  primary_action: string;
  current_price: number;
  required_price: number;
  recommended_price: number;
  price_plan: PricePlanStep[];
  procurement_ingredients: string[];
  recipe_adjustments: string[];
  reasoning: string;
  risk_level: string;
}

export interface ScenarioComparison {
  dish: string;
  old_action: string;
  new_action: string;
  old_price: number;
  new_price: number;
  what_changed: string[];
  why_changed: string;
}

export interface ScenarioResult {
  scenario: Record<string, unknown>;
  comparisons: ScenarioComparison[];
  summary: string;
}
