"""
Tests for driver_filter.py
Run from menumargin-ai/ directory: python scripts/test_driver_filter.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from app.services.driver_filter import (
    clean_driver_name, score_driver_relevance, filter_and_clean_drivers
)

PASS = "✅"; FAIL = "❌"

def check(condition: bool, label: str) -> bool:
    print(f"  {PASS if condition else FAIL}  {label}")
    return condition

CHEESE_DRIVERS = [
    {"driver_name": "Food price monitoring tool, Index, 2015=100, Import price index, Milk, cheese and eggs, Italy in Italy", "importance": 100.0, "direction": 0.951},
    {"driver_name": "Global risk - France",                                             "importance": 99.7, "direction": 0.207},
    {"driver_name": "Labour market - United States of America",                         "importance": 98.0, "direction": 0.799},
    {"driver_name": "Domestic producer prices – Manufacture of textiles and wearing apparel in Ireland", "importance": 96.7, "direction": 0.041},
    {"driver_name": "Population - Europe",                                              "importance": 93.3, "direction": 0.507},
]

OLIVE_DRIVERS = [
    {"driver_name": "Turkey exports of Plastics (qty, Weight in kilograms) via Road", "importance": 100.0, "direction": -0.322},
    {"driver_name": "HICP – Olive oil in Europe",                                    "importance": 98.3, "direction": -0.049},
    {"driver_name": "HICP – Olive oil in Spain",                                     "importance": 95.1, "direction": -0.099},
]


def run_name_cleaning():
    print("\n── clean_driver_name ──────────────────────────────────────────")
    ok = True

    name1 = clean_driver_name("Food price monitoring tool, Index, 2015=100, Import price index, Milk, cheese and eggs, Italy in Italy")
    ok &= check("Milk" in name1 or "milk" in name1.lower(), f"Milk/dairy in name: '{name1}'")

    name2 = clean_driver_name("Domestic producer prices – Manufacture of textiles and wearing apparel in Ireland")
    ok &= check(len(name2) < 80, f"Name truncated: '{name2}'")

    name3 = clean_driver_name("HICP – Olive oil in Europe")
    ok &= check("Olive" in name3 or "olive" in name3.lower(), f"Olive in HICP name: '{name3}'")

    name4 = clean_driver_name("Turkey exports of Plastics (qty, Weight in kilograms) via Road")
    ok &= check(len(name4) <= 80, f"Exports name length ok: '{name4}'")

    return ok


def run_relevance_scoring():
    print("\n── score_driver_relevance ─────────────────────────────────────")
    ok = True

    ok &= check(score_driver_relevance("Milk, cheese and eggs import price index", "cheese") >= 0.8,
                "cheese: dairy driver scores high")
    ok &= check(score_driver_relevance("HICP – Olive oil in Europe", "olive_oil") >= 0.8,
                "olive_oil: HICP olive driver scores high")
    ok &= check(score_driver_relevance("Textiles and apparel in Ireland", "cheese") == 0.0,
                "cheese: textiles scores 0.0")
    ok &= check(score_driver_relevance("Population - Europe", "eggs") == 0.0,
                "eggs: population scores 0.0")
    ok &= check(score_driver_relevance("Labour market - USA", "pasta") == 0.0,
                "pasta: labour market scores 0.0")
    ok &= check(score_driver_relevance("wheat price index EU", "pasta") >= 0.5,
                "pasta: wheat driver scores ok")
    ok &= check(score_driver_relevance("energy costs EU", "flour") >= 0.3,
                "flour: energy costs scores ok")

    return ok


def run_cheese_filtering():
    print("\n── filter cheese drivers ──────────────────────────────────────")
    filtered = filter_and_clean_drivers(CHEESE_DRIVERS, "cheese")
    ok = True

    visible = [d for d in filtered if d["visible"]]
    hidden  = [d for d in filtered if not d["visible"]]

    ok &= check(len(visible) == 1, f"Exactly 1 visible driver (got {len(visible)})")
    ok &= check("milk" in visible[0]["raw_name"].lower() or "cheese" in visible[0]["raw_name"].lower(),
                f"Visible driver is dairy-related: '{visible[0]['name']}'")

    hidden_raw_names = [d["raw_name"].lower() for d in hidden]
    ok &= check(any("textiles" in n or "apparel" in n for n in hidden_raw_names),
                "Textiles driver is hidden")
    ok &= check(any("labour" in n or "labor" in n for n in hidden_raw_names),
                "Labour market driver is hidden")
    ok &= check(any("population" in n for n in hidden_raw_names),
                "Population driver is hidden")

    ok &= check(all("raw_name" in d for d in filtered), "All drivers have raw_name")
    ok &= check(all("name" in d for d in filtered),     "All drivers have clean name")
    ok &= check(all("visible" in d for d in filtered),  "All drivers have visible flag")

    return ok


def run_olive_oil_filtering():
    print("\n── filter olive_oil drivers ───────────────────────────────────")
    filtered = filter_and_clean_drivers(OLIVE_DRIVERS, "olive_oil")
    visible  = [d for d in filtered if d["visible"]]
    hidden   = [d for d in filtered if not d["visible"]]

    ok = True
    ok &= check(len(visible) == 2,  f"2 olive oil HICP drivers visible (got {len(visible)})")
    ok &= check(len(hidden)  == 1,  f"Turkey plastics driver hidden (got {len(hidden)})")
    ok &= check(
        all("olive" in d["raw_name"].lower() for d in visible),
        "All visible drivers mention olive"
    )

    return ok


if __name__ == "__main__":
    results = [run_name_cleaning(), run_relevance_scoring(), run_cheese_filtering(), run_olive_oil_filtering()]
    total = sum(results)
    print(f"\n{'─'*60}")
    print(f"Test suites passed: {total}/{len(results)}")
    sys.exit(0 if all(results) else 1)
