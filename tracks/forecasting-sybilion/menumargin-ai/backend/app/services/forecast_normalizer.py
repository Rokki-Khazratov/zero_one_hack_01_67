from pathlib import Path
import json
import pandas as pd

from .schemas_helpers import load_current_price

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def normalize_forecast(ingredient: str, raw: dict) -> dict:
    """
    Convert cached forecast into internal normalized format.

    Supports two cache formats:
    - v2.0 (EUR/kg):  raw["forecast"]["series"] with price_eur_kg + quantiles
    - v1.x (index):   raw["forecast"]["data"]["forecast_series"] with index values

    Output:
    {
      ingredient, current_price_per_kg,
      forecast: [{month, median, lower_band, upper_band}],
      drivers: [{driver_name, importance, direction}],
      backtest: {mape, reliability}
    }
    """
    # Detect format version
    if "series" in raw.get("forecast", {}):
        return _normalize_v2(ingredient, raw)
    return _normalize_v1(ingredient, raw)


def _normalize_v2(ingredient: str, raw: dict) -> dict:
    """v2.0 cache — already in EUR/kg."""
    current_price = raw.get("current_price_eur_kg", load_current_price(ingredient))
    series = raw["forecast"]["series"]

    forecast_points = []
    for date_str, values in sorted(series.items()):
        month = date_str[:7]
        q = values.get("quantiles", {})
        median = values.get("price_eur_kg", q.get("P50", 0))
        forecast_points.append({
            "month": month,
            "median":     round(median, 4),
            "lower_band": round(q.get("P10", median * 0.9), 4),
            "upper_band": round(q.get("P90", median * 1.1), 4),
        })

    drivers = []
    for d in raw.get("top_drivers", []):
        drivers.append({
            "driver_name": d.get("driver_name", ""),
            "importance":  round(float(d.get("importance", 0)), 3),
            "direction":   round(float(d.get("direction", 0)), 3),
        })

    return {
        "ingredient": ingredient,
        "current_price_per_kg": current_price,
        "forecast": forecast_points,
        "drivers": drivers[:5],
        "backtest": {"mape": None, "reliability": "unknown"},
    }


def _normalize_v1(ingredient: str, raw: dict) -> dict:
    """v1.x cache — index values, needs conversion to EUR/kg."""
    current_price = load_current_price(ingredient)

    forecast_series = raw["forecast"]["data"]["forecast_series"]
    signals_artifact = raw.get("signals", {})
    signals = signals_artifact.get("data", signals_artifact) if isinstance(signals_artifact, dict) else {}

    latest_index = _get_latest_index(ingredient, current_price)

    forecast_points = []
    for date_str, values in sorted(forecast_series.items()):
        month = date_str[:7]
        quantiles = values.get("quantile_forecast", {})
        idx_median = values.get("forecast", quantiles.get("0.50", 0))
        idx_lower  = quantiles.get("0.10", idx_median * 0.9)
        idx_upper  = quantiles.get("0.90", idx_median * 1.1)

        forecast_points.append({
            "month": month,
            "median":     round(current_price * idx_median / latest_index, 4),
            "lower_band": round(current_price * idx_lower  / latest_index, 4),
            "upper_band": round(current_price * idx_upper  / latest_index, 4),
        })

    drivers = []
    for uid, sig in signals.items():
        if not isinstance(sig, dict):
            continue
        importance = sig.get("importance", {}).get("overall", {}).get("mean", 0)
        direction  = sig.get("direction",  {}).get("overall", {}).get("mean", 0)
        drivers.append({
            "driver_name": sig.get("driver_name", uid),
            "importance":  round(float(importance), 3),
            "direction":   round(float(direction),  3),
        })
    drivers.sort(key=lambda d: -d["importance"])

    backtest = _extract_backtest(raw)

    return {
        "ingredient": ingredient,
        "current_price_per_kg": current_price,
        "forecast": forecast_points,
        "drivers": drivers[:5],
        "backtest": backtest,
    }


def _get_latest_index(ingredient: str, current_price: float) -> float:
    """
    Return the HICP index value that anchors current_price in EUR/kg.
    Only used for v1.x cache format.
    """
    prices_path = DATA_DIR / "processed" / "ingredient_prices.csv"
    if prices_path.exists():
        df = pd.read_csv(prices_path)
        sub = df[df["ingredient"] == ingredient].sort_values("date")
        if not sub.empty:
            latest_row = sub.iloc[-1]
            stored_index = float(latest_row["index_value"])
            stored_price = float(latest_row["current_price_per_kg"])
            return stored_index * (current_price / stored_price)
    return 100.0


def _extract_backtest(raw: dict) -> dict:
    try:
        mape = None
        reliability = "unknown"
        if "backtest_metrics" in raw:
            metrics = raw["backtest_metrics"]
            window = metrics.get("6m", metrics.get("12m", {}))
            mape = window.get("metrics", {}).get("mape")
            if mape is not None:
                reliability = "high" if mape < 0.05 else "medium" if mape < 0.12 else "low"
        return {"mape": mape, "reliability": reliability}
    except Exception:
        return {"mape": None, "reliability": "unknown"}
