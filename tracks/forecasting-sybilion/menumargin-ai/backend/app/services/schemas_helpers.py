from pathlib import Path
import pandas as pd
import json

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_current_price(ingredient: str) -> float:
    df = pd.read_csv(DATA_DIR / "current_prices.csv", index_col="ingredient")
    return float(df.loc[ingredient, "current_price_per_kg"])


def load_recipes() -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / "demo" / "recipes.csv")


def load_menu() -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / "demo" / "menu.csv")


def load_keywords() -> dict:
    path = DATA_DIR / "config" / "ingredient_keywords.json"
    return json.loads(path.read_text())


def load_all_raw_forecasts() -> dict:
    """Load raw cache files (v1 or v2) — do not use directly in business logic."""
    cache_dir = DATA_DIR / "cache"
    forecasts = {}
    for path in sorted(cache_dir.glob("*_forecast.json")):
        ing = path.stem.replace("_forecast", "")
        forecasts[ing] = json.loads(path.read_text())
    return forecasts


def load_all_normalized_forecasts() -> dict:
    """Load and normalize all cache files. Returns old-compatible format for engines."""
    from .forecast_normalizer import normalize_forecast as _normalize
    raw_all = load_all_raw_forecasts()
    result = {}
    for ing, raw in raw_all.items():
        try:
            nf = _normalize(raw, ingredient=ing)
            result[ing] = _to_engine_format(nf)
        except Exception as e:
            print(f"[warn] Could not normalize {ing}: {e}")
    return result


def _to_engine_format(nf: dict) -> dict:
    """Convert new normalizer output to unified format supporting both old and new engines.

    Old format: forecast[{month, median, lower_band, upper_band}]
    New format: series[{month, price_median, price_lower, price_upper, ...}]
    """
    forecast_points = []
    series_points = []
    for pt in nf.get("series", []):
        month = pt["month"]
        p_med = pt.get("price_median", 0)
        p_low = pt.get("price_lower", pt.get("price_p10", 0))
        p_up  = pt.get("price_upper", pt.get("price_p90", 0))
        forecast_points.append({
            "month": month,
            "median": p_med,
            "lower_band": p_low,
            "upper_band": p_up,
        })
        series_points.append({
            "month": month,
            "price_median": p_med,
            "price_lower": p_low,
            "price_upper": p_up,
        })

    drivers = []
    for d in nf.get("drivers", []):
        drivers.append({
            "driver_name": d.get("driver_name", ""),
            "importance": d.get("importance", 0),
            "direction": d.get("direction", 0),
        })

    return {
        "ingredient": nf.get("ingredient", ""),
        "current_price_per_kg": nf.get("current_price_eur_kg", 0),
        "current_price_eur_kg": nf.get("current_price_eur_kg", 0),
        "forecast": forecast_points,
        "series": series_points,
        "drivers": drivers,
        "backtest": {"mape": None, "reliability": "unknown"},
    }
