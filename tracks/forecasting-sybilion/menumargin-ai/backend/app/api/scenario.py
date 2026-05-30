from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.scenario_engine import simulate_scenario
from ..services.forecast_normalizer import normalize_forecast
from ..services.sybilion_client import get_cached_forecast

router = APIRouter()
INGREDIENTS = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour"]


class ScenarioRequest(BaseModel):
    target_margin: Optional[float] = None
    max_price_increase_percent: float = 8.0
    supplier_lead_time_weeks: int = 3
    allow_recipe_changes: bool = True
    allow_procurement_stock: bool = True
    risk_tolerance: str = "medium"
    demand_shock_percent: float = 0.0
    base_scenario: Optional[dict] = None


def _load_normalized_forecasts() -> dict:
    forecasts = {}
    for ing in INGREDIENTS:
        raw = get_cached_forecast(ing)
        if raw:
            forecasts[ing] = normalize_forecast(ing, raw)
    return forecasts


@router.post("/api/scenario/simulate")
def simulate_scenario_endpoint(req: ScenarioRequest):
    forecasts = _load_normalized_forecasts()
    if not forecasts:
        raise HTTPException(status_code=404, detail="No forecasts available.")
    new_sc = req.model_dump(exclude={"base_scenario"})
    return simulate_scenario(forecasts, new_sc, req.base_scenario)
