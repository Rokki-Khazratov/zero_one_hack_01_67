from fastapi import APIRouter, HTTPException
from ..services.margin_engine import analyze_menu
from ..services.recommendation_engine import generate_recommendations
from ..services.schemas_helpers import load_all_normalized_forecasts

router = APIRouter()

@router.post("/api/recommendations/generate")
def generate_recommendations_endpoint():
    forecasts = load_all_normalized_forecasts()
    if not forecasts:
        raise HTTPException(status_code=404, detail="No forecasts available.")
    menu_analysis = analyze_menu(forecasts)
    recs = generate_recommendations(menu_analysis, forecasts)
    return {"recommendations": recs}
