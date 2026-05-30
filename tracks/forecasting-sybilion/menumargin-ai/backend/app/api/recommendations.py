from fastapi import APIRouter, HTTPException
from ..services.margin_engine import analyze_menu
from ..services.recommendation_engine import generate_recommendations
from ..services.forecast_normalizer import normalize_forecast
from ..services.sybilion_client import get_cached_forecast

router = APIRouter()
INGREDIENTS = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour"]


def _load_normalized_forecasts() -> dict:
    forecasts = {}
    for ing in INGREDIENTS:
        raw = get_cached_forecast(ing)
        if raw:
            forecasts[ing] = normalize_forecast(ing, raw)
    return forecasts


@router.post("/api/recommendations/generate")
def generate_recommendations_endpoint():
    forecasts = _load_normalized_forecasts()
    if not forecasts:
        raise HTTPException(status_code=404, detail="No forecasts available.")
    menu_analysis = analyze_menu(forecasts)
    recs = generate_recommendations(menu_analysis, forecasts)
    return {"recommendations": recs}
