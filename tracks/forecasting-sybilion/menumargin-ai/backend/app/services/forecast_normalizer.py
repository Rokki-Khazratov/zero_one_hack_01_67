from pathlib import Path
import json
import pandas as pd

from .schemas_helpers import load_current_price

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def normalize_forecast(ingredient: str, raw: dict) -> dict:
    """
    Convert Sybilion raw API response into internal normalized format.

    Output:
    {
      ingredient, current_price_per_kg,
      forecast: [{month, median, lower_band, upper_band}],
      drivers: [{driver_name, importance, direction}],
      backtest: {mape, reliability}
    }
    """
    current_price = load_current_price(ingredient)

    forecast_series = raw["forecast"]["data"]["forecast_series"]
    signals = raw.get("signals", {})

    # Scale factor: index → €/kg
    # We need the latest historical index to convert quantile indices back to prices.
    # Since Sybilion returns index values, we use the same reconstruction formula.
    # The current_price corresponds to the latest index (≈ index at last training point).
    # We approximate: latest_index ≈ forecast median at horizon 0 extrapolated from history.
    # Simpler: just compute ratio per point using the same current_price anchor.
    # Sybilion forecasts the INDEX. We convert: price = current_price * index / latest_index.
    # latest_index comes from processed ingredient_prices.csv.
    latest_index = _get_latest_index(ingredient)

    forecast_points = []
    for date_str, values in sorted(forecast_series.items()):
        month = date_str[:7]  # YYYY-MM
        idx_median = values.get("forecast", values.get("quantile_forecast", {}).get("0.5", 0))
        idx_lower  = values.get("quantile_forecast", {}).get("0.1", idx_median * 0.9)
        idx_upper  = values.get("quantile_forecast", {}).get("0.9", idx_median * 1.1)

        forecast_points.append({
            "month": month,
            "median":     round(current_price * idx_median / latest_index, 4),
            "lower_band": round(current_price * idx_lower  / latest_index, 4),
            "upper_band": round(current_price * idx_upper  / latest_index, 4),
        })

    drivers = []
    for uid, sig in signals.items():
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


def _get_latest_index(ingredient: str) -> float:
    prices_path = DATA_DIR / "processed" / "ingredient_prices.csv"
    if prices_path.exists():
        df = pd.read_csv(prices_path)
        sub = df[df["ingredient"] == ingredient].sort_values("date")
        if not sub.empty:
            return float(sub["index_value"].iloc[-1])
    return 100.0  # fallback: assume current = base


def _extract_backtest(raw: dict) -> dict:
    try:
        artifacts = raw.get("forecast", {}).get("data", {})
        # backtest_metrics is a separate artifact — may be embedded or absent
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
