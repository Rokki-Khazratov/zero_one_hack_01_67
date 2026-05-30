from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.scenario_engine import simulate_scenario
from ..services.schemas_helpers import load_all_normalized_forecasts

router = APIRouter()

class ScenarioRequest(BaseModel):
    target_margin: Optional[float] = None
    max_price_increase_percent: float = 8.0
    supplier_lead_time_weeks: int = 3
    allow_recipe_changes: bool = True
    allow_procurement_stock: bool = True
    risk_tolerance: str = "medium"
    demand_shock_percent: float = 0.0
    base_scenario: Optional[dict] = None

@router.post("/api/scenario/simulate")
def simulate_scenario_endpoint(req: ScenarioRequest):
    forecasts = load_all_normalized_forecasts()
    if not forecasts:
        raise HTTPException(status_code=404, detail="No forecasts available.")
    new_sc = req.model_dump(exclude={"base_scenario"})
    return simulate_scenario(forecasts, new_sc, req.base_scenario)
