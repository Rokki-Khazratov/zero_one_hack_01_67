from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.schemas_helpers import load_all_normalized_forecasts, load_all_raw_forecasts
from ..services.forecast_normalizer import normalize_forecast, detect_forecast_format

router = APIRouter()

MVP_INGREDIENTS = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour"]


class ForecastRunRequest(BaseModel):
    ingredients: list[str] = MVP_INGREDIENTS
    horizon_months: int = 6
    force_refresh: bool = False


@router.get("/api/forecast/latest")
def get_latest_forecasts():
    """Return normalized forecasts for all available cache files."""
    normalized = load_all_normalized_forecasts()
    if not normalized:
        raise HTTPException(
            status_code=404,
            detail="No cached forecasts found. Run /api/forecast/run first.",
        )
    return {"forecasts": normalized}


@router.get("/api/forecast/normalized/latest")
def get_normalized_all():
    """Return all normalized forecasts with driver cleaning and quality warnings."""
    normalized = load_all_normalized_forecasts()
    if not normalized:
        raise HTTPException(status_code=404, detail="No normalized forecasts available.")
    return {"ingredients": normalized, "count": len(normalized)}


@router.post("/api/forecast/run")
def run_forecast_endpoint(req: ForecastRunRequest):
    """
    Re-run Sybilion forecasts for the given ingredients.
    Requires backend to be running with SYBILION_API_TOKEN set.
    """
    try:
        from ..services.eurostat_fetcher import fetch_ingredient_series, build_sybilion_timeseries
        from ..services.price_reconstructor import build_ingredient_prices_csv
        from ..services.sybilion_client import run_forecast as sybilion_run
        from ..services.schemas_helpers import load_keywords
        import json
        from pathlib import Path

        DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
        keywords = load_keywords()

        index_data = {ing: fetch_ingredient_series(ing) for ing in req.ingredients}
        build_ingredient_prices_csv(index_data)

        results = {}
        for ing in req.ingredients:
            ts  = build_sybilion_timeseries(ing)
            kw  = keywords.get(ing, [])
            raw = sybilion_run(ing, ts, kw, horizon_months=req.horizon_months, force_refresh=req.force_refresh)
            nf  = normalize_forecast(raw)
            # Save to normalized cache
            norm_dir = DATA_DIR / "cache" / "normalized"
            norm_dir.mkdir(exist_ok=True)
            (norm_dir / f"{ing}_forecast_normalized.json").write_text(json.dumps(nf, indent=2))
            results[ing] = nf

        return {"status": "completed", "ingredients": list(results.keys()), "forecasts": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
