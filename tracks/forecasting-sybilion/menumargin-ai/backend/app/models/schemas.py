from pydantic import BaseModel
from typing import Optional


class ForecastPoint(BaseModel):
    month: str
    median: float
    lower_band: float
    upper_band: float


class DriverSignal(BaseModel):
    driver_name: str
    importance: float
    direction: float


class BacktestInfo(BaseModel):
    mape: Optional[float] = None
    reliability: str = "unknown"


class IngredientForecast(BaseModel):
    ingredient: str
    current_price_per_kg: float
    forecast: list[ForecastPoint]
    drivers: list[DriverSignal]
    backtest: BacktestInfo


class DishMonthMargin(BaseModel):
    month: str
    expected_cost: float
    worst_case_cost: float
    best_case_cost: float
    expected_margin: float
    worst_case_margin: float
    best_case_margin: float


class PricePlanStep(BaseModel):
    month: str
    recommended_price: float


class Recommendation(BaseModel):
    dish: str
    primary_action: str
    current_price: float
    required_price: float
    recommended_price: float
    price_plan: list[PricePlanStep]
    procurement_ingredients: list[str]
    recipe_adjustments: list[str]
    reasoning: str
    risk_level: str


class DishAnalysis(BaseModel):
    dish: str
    current_price: float
    target_margin: float
    current_margin: float
    month_margins: list[DishMonthMargin]
    risk_level: str
    min_expected_margin: float
    min_worst_case_margin: float


class MenuSummary(BaseModel):
    dishes_at_risk: int
    critical_dishes: int
    average_margin_drop: float
    highest_risk_ingredient: str
    total_dishes: int


class MenuAnalysisResponse(BaseModel):
    summary: MenuSummary
    dishes: list[DishAnalysis]


class ForecastRunRequest(BaseModel):
    ingredients: list[str] = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour"]
    horizon_months: int = 6


class ScenarioRequest(BaseModel):
    target_margin: Optional[float] = None
    max_price_increase_percent: float = 8.0
    supplier_lead_time_weeks: int = 3
    allow_recipe_changes: bool = True
    allow_procurement_stock: bool = True
    risk_tolerance: str = "medium"
    demand_shock_percent: float = 0.0


class ScenarioComparison(BaseModel):
    dish: str
    old_action: str
    new_action: str
    old_price: float
    new_price: float
    what_changed: list[str]
    why_changed: str


class ScenarioResponse(BaseModel):
    scenario: ScenarioRequest
    comparisons: list[ScenarioComparison]
    summary: str
