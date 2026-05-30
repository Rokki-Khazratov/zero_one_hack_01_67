"""
Forecast normalizer: adapter layer between raw cache formats and the
internal unified format consumed by dish/margin/recommendation engines.

Supported input formats:
  - converted_cache_v2  (EUR/kg, Sybilion v2 pipeline)
  - raw_sybilion_v1     (HICP index, raw Sybilion API response)
"""

from .driver_filter import filter_and_clean_drivers
from .forecast_quality import assess_forecast_quality


def detect_forecast_format(raw: dict) -> str:
    if (
        raw.get("version") == "2.0"
        and raw.get("unit") == "EUR/kg"
        and isinstance(raw.get("forecast", {}).get("series"), dict)
    ):
        return "converted_cache_v2"
    if isinstance(raw.get("forecast", {}).get("data", {}).get("forecast_series"), dict):
        return "raw_sybilion_v1"
    return "unknown"


def _series_point(date_key: str, price_eur_kg: float, quantiles: dict) -> dict:
    month = date_key[:7]
    p05 = float(quantiles.get("P05", price_eur_kg))
    p10 = float(quantiles.get("P10", price_eur_kg))
    p50 = float(quantiles.get("P50", price_eur_kg))
    p90 = float(quantiles.get("P90", price_eur_kg))
    p95 = float(quantiles.get("P95", price_eur_kg))
    band_abs = round(p95 - p05, 4)
    band_pct = round(band_abs / p50, 4) if p50 > 0 else 0.0
    upside   = round((p95 - price_eur_kg) / price_eur_kg, 4) if price_eur_kg > 0 else 0.0
    return {
        "month":           month,
        "price_median":    round(p50, 4),
        "price_lower":     round(p05, 4),
        "price_upper":     round(p95, 4),
        "price_p10":       round(p10, 4),
        "price_p90":       round(p90, 4),
        "band_width_abs":  band_abs,
        "band_width_pct":  band_pct,
        "upside_risk_pct": upside,
    }


def normalize_converted_cache_v2(raw: dict) -> dict:
    ingredient    = raw.get("ingredient", "unknown")
    current_price = float(raw.get("current_price_eur_kg", 0))
    fc            = raw.get("forecast", {})
    raw_series    = fc.get("series", {})

    series = []
    for date_key in sorted(raw_series.keys()):
        entry     = raw_series[date_key]
        price     = float(entry.get("price_eur_kg", current_price))
        quantiles = dict(entry.get("quantiles", {}))
        if "P50" not in quantiles:
            quantiles["P50"] = price
        series.append(_series_point(date_key, price, quantiles))

    drivers = filter_and_clean_drivers(raw.get("top_drivers", []), ingredient)

    result = {
        "ingredient":           ingredient,
        "unit":                 "EUR/kg",
        "source_format":        "converted_cache_v2",
        "forecast_start":       fc.get("forecast_start", series[0]["month"] + "-01" if series else ""),
        "forecast_end":         fc.get("forecast_end",   series[-1]["month"] + "-01" if series else ""),
        "horizon_months":       fc.get("horizon_months", len(series)),
        "last_historical_date": fc.get("last_historical_date", ""),
        "current_price_eur_kg": current_price,
        "series":               series,
        "drivers":              drivers,
        "warnings":             [],
    }
    return assess_forecast_quality(result)


def normalize_raw_sybilion_v1(
    raw: dict,
    ingredient: str,
    current_price_eur_kg: float,
    latest_actual_index: float,
) -> dict:
    if latest_actual_index <= 0:
        raise ValueError("latest_actual_index must be > 0")

    fc_data    = raw["forecast"]["data"]
    raw_series = fc_data["forecast_series"]

    def idx_to_eur(idx: float) -> float:
        return current_price_eur_kg * idx / latest_actual_index

    series = []
    for date_key in sorted(raw_series.keys()):
        entry = raw_series[date_key]
        q     = entry.get("quantile_forecast", {})
        i_med = float(q.get("0.50", entry.get("forecast", 0)))
        i_low = float(q.get("0.05", i_med * 0.9))
        i_hi  = float(q.get("0.95", i_med * 1.1))
        i_p10 = float(q.get("0.10", i_med * 0.92))
        i_p90 = float(q.get("0.90", i_med * 1.08))
        price_eur = idx_to_eur(i_med)
        quantiles = {
            "P05": idx_to_eur(i_low),
            "P10": idx_to_eur(i_p10),
            "P50": price_eur,
            "P90": idx_to_eur(i_p90),
            "P95": idx_to_eur(i_hi),
        }
        pt = _series_point(date_key, price_eur, quantiles)
        pt["raw"] = {"index_median": round(i_med,4), "index_lower": round(i_low,4), "index_upper": round(i_hi,4)}
        series.append(pt)

    signals = raw.get("signals", {}).get("data", {})
    raw_drivers = [
        {
            "driver_name": v.get("driver_name", k),
            "importance":  v.get("importance", {}).get("overall", {}).get("mean", 0),
            "direction":   v.get("direction",  {}).get("overall", {}).get("mean", 0),
        }
        for k, v in signals.items()
    ]
    drivers = filter_and_clean_drivers(raw_drivers, ingredient)

    result = {
        "ingredient":           ingredient,
        "unit":                 "EUR/kg",
        "source_format":        "raw_sybilion_v1",
        "forecast_start":       fc_data.get("forecast_start", ""),
        "forecast_end":         fc_data.get("forecast_end", ""),
        "horizon_months":       int(fc_data.get("forecast_horizon", len(series))),
        "last_historical_date": fc_data.get("last_valid_data_index", ""),
        "current_price_eur_kg": current_price_eur_kg,
        "series":               series,
        "drivers":              drivers,
        "warnings":             [],
    }
    return assess_forecast_quality(result)


def normalize_forecast(
    raw: dict,
    ingredient: str | None = None,
    current_price_eur_kg: float | None = None,
    latest_actual_index: float | None = None,
) -> dict:
    fmt = detect_forecast_format(raw)
    if fmt == "converted_cache_v2":
        return normalize_converted_cache_v2(raw)
    if fmt == "raw_sybilion_v1":
        if ingredient is None or current_price_eur_kg is None or latest_actual_index is None:
            raise ValueError(
                "ingredient, current_price_eur_kg, and latest_actual_index "
                "are required for raw_sybilion_v1 format."
            )
        return normalize_raw_sybilion_v1(raw, ingredient, current_price_eur_kg, latest_actual_index)
    raise ValueError(f"Unsupported forecast format. keys={list(raw.keys())}")
