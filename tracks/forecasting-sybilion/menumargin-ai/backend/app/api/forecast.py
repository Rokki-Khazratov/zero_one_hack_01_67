from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import json
from pathlib import Path

from ..services.eurostat_fetcher import fetch_ingredient_series, build_sybilion_timeseries
from ..services.price_reconstructor import reconstruct_prices, build_ingredient_prices_csv, load_ingredient_prices
from ..services.sybilion_client import run_forecast, get_cached_forecast
from ..services.forecast_normalizer import normalize_forecast
from ..services.schemas_helpers import load_keywords

router = APIRouter()
INGREDIENTS = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour",
               "butter", "cream", "chicken", "rice", "wine", "potatoes",
               "sugar", "coffee", "milk", "fish"]


class ForecastRunRequest(BaseModel):
    ingredients: list[str] = INGREDIENTS
    horizon_months: int = 6
    force_refresh: bool = False


def _run_pipeline(ingredients: list[str], horizon: int, force: bool):
    keywords = load_keywords()

    # Step 1: fetch Eurostat + reconstruct prices
    index_data = {ing: fetch_ingredient_series(ing) for ing in ingredients}
    build_ingredient_prices_csv(index_data)

    # Step 2: run Sybilion for each ingredient
    results = {}
    for ing in ingredients:
        ts = build_sybilion_timeseries(ing)
        kw = keywords.get(ing, [])
        raw = run_forecast(ing, ts, kw, horizon_months=horizon, force_refresh=force)
        results[ing] = normalize_forecast(ing, raw)
    return results


@router.post("/api/forecast/run")
def run_forecast_endpoint(req: ForecastRunRequest):
    try:
        results = _run_pipeline(req.ingredients, req.horizon_months, req.force_refresh)
        return {"status": "completed", "ingredients": list(results.keys()), "forecasts": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/forecast/latest")
def get_latest_forecasts():
    results = {}
    for ing in INGREDIENTS:
        raw = get_cached_forecast(ing)
        if raw:
            try:
                results[ing] = normalize_forecast(ing, raw)
            except Exception:
                results[ing] = raw
    if not results:
        raise HTTPException(status_code=404, detail="No cached forecasts found. Run /api/forecast/run first.")
    return {"forecasts": results}
