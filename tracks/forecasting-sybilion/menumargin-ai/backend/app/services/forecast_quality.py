"""
Forecast quality assessment: adds warnings to normalized forecasts
without modifying any model-produced values.
"""

NARROW_BAND_THRESHOLD = 0.03    # < 3% avg P05-P95 band → warning
FLAT_FORECAST_THRESHOLD = 0.02  # < 2% change over horizon → flat warning


def assess_forecast_quality(normalized: dict) -> dict:
    """
    Analyze a normalized forecast dict and append any quality warnings.
    Modifies in-place and returns the dict.
    Does NOT alter price_median, price_lower, price_upper.
    """
    warnings: list[str] = normalized.setdefault("warnings", [])
    series = normalized.get("series", [])
    drivers = normalized.get("drivers", [])

    if not series:
        warnings.append("No forecast series available.")
        return normalized

    # ── Narrow confidence band ────────────────────────────────────────
    band_widths = []
    for pt in series:
        upper = pt.get("price_upper", 0)
        lower = pt.get("price_lower", 0)
        median = pt.get("price_median", 1)
        if median > 0:
            band_widths.append((upper - lower) / median)

    if band_widths:
        avg_band = sum(band_widths) / len(band_widths)
        if avg_band < NARROW_BAND_THRESHOLD:
            warnings.append(
                f"Confidence interval is narrow (avg ±{avg_band*100:.1f}%). "
                "This reflects smooth index-based inputs; real wholesale price "
                "volatility may be higher."
            )

    # ── Flat median forecast ──────────────────────────────────────────
    if len(series) >= 2:
        first_median = series[0].get("price_median", 0)
        last_median  = series[-1].get("price_median", 0)
        if first_median > 0:
            change = abs(last_median - first_median) / first_median
            if change < FLAT_FORECAST_THRESHOLD:
                warnings.append(
                    f"Median forecast is nearly flat ({(last_median-first_median)/first_median*100:+.1f}% "
                    "over 6 months). Margin risk comes primarily from your current "
                    "cost baseline and scenario assumptions."
                )

    # ── No relevant drivers ───────────────────────────────────────────
    visible_drivers = [d for d in drivers if d.get("visible")]
    if not visible_drivers:
        warnings.append(
            "No clearly relevant external drivers identified for this ingredient. "
            "Recommendation is based on forecast distribution and margin impact."
        )

    return normalized
