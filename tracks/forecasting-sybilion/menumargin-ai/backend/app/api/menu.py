from fastapi import APIRouter, HTTPException
from ..services.margin_engine import analyze_menu
from ..services.schemas_helpers import load_all_normalized_forecasts

router = APIRouter()

@router.post("/api/menu/analyze")
def analyze_menu_endpoint():
    forecasts = load_all_normalized_forecasts()
    if not forecasts:
        raise HTTPException(status_code=404, detail="No forecasts available. Run /api/forecast/run first.")
    return analyze_menu(forecasts)
