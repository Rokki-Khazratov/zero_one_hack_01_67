"""
Tests for forecast_normalizer.py
Run from menumargin-ai/ directory: python scripts/test_forecast_normalizer.py
"""
import sys, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from app.services.forecast_normalizer import (
    detect_forecast_format, normalize_forecast, normalize_converted_cache_v2
)

CACHE = Path(__file__).parent.parent / "data" / "cache"
PASS = "✅"; FAIL = "❌"

def check(condition: bool, label: str) -> bool:
    print(f"  {PASS if condition else FAIL}  {label}")
    return condition

def run_cheese_v2():
    print("\n── cheese v2 cache ────────────────────────────────────────────")
    raw = json.loads((CACHE / "cheese_forecast.json").read_text())

    ok = True
    ok &= check(detect_forecast_format(raw) == "converted_cache_v2", "Format detected as converted_cache_v2")

    nf = normalize_forecast(raw)

    ok &= check(nf["ingredient"] == "cheese",      "ingredient == cheese")
    ok &= check(nf["unit"] == "EUR/kg",            "unit == EUR/kg")
    ok &= check(nf["source_format"] == "converted_cache_v2", "source_format correct")
    ok &= check(len(nf["series"]) == 6,            "6 months in series")

    first = nf["series"][0]
    ok &= check(first["month"] == "2026-01",       "first month == 2026-01")
    ok &= check(abs(first["price_median"] - 18.40) < 0.1, f"price_median ≈ 18.40 (got {first['price_median']})")
    ok &= check(abs(first["price_lower"]  - 18.28) < 0.1, f"price_lower  ≈ 18.28 (got {first['price_lower']})")
    ok &= check(abs(first["price_upper"]  - 18.51) < 0.1, f"price_upper  ≈ 18.51 (got {first['price_upper']})")
    ok &= check(first["band_width_pct"] > 0,       "band_width_pct > 0")
    ok &= check(first["upside_risk_pct"] >= 0,     "upside_risk_pct >= 0")

    ok &= check(len(nf["drivers"]) == 5,           "5 drivers total")
    ok &= check(isinstance(nf["warnings"], list),  "warnings is a list")
    ok &= check(len(nf["warnings"]) >= 1,          "at least 1 quality warning (narrow band)")

    return ok


def run_olive_oil_v2():
    print("\n── olive_oil v2 cache ─────────────────────────────────────────")
    raw = json.loads((CACHE / "olive_oil_forecast.json").read_text())
    nf  = normalize_forecast(raw)

    ok = True
    ok &= check(nf["ingredient"] == "olive_oil",   "ingredient == olive_oil")
    ok &= check(len(nf["series"]) == 6,            "6 months in series")

    all_months = [pt["month"] for pt in nf["series"]]
    ok &= check(all_months == sorted(all_months),  "months sorted ascending")

    last = nf["series"][-1]
    ok &= check(last["month"] == "2026-06",        "last month == 2026-06")
    ok &= check(last["price_upper"] >= last["price_median"] >= last["price_lower"],
                "price_lower <= median <= upper")

    return ok


def run_unknown_format():
    print("\n── unknown format detection ────────────────────────────────────")
    fake = {"foo": "bar"}
    fmt  = detect_forecast_format(fake)
    ok   = check(fmt == "unknown", "unknown format detected")
    raised = False
    try:
        normalize_forecast(fake)
    except ValueError:
        raised = True
    ok &= check(raised, "ValueError raised for unknown format")
    return ok


if __name__ == "__main__":
    results = [run_cheese_v2(), run_olive_oil_v2(), run_unknown_format()]
    total = sum(results)
    print(f"\n{'─'*60}")
    print(f"Test suites passed: {total}/{len(results)}")
    sys.exit(0 if all(results) else 1)
