"""
Dish database: JSON-backed CRUD for dishes with ingredient/gramage breakdown.
Calculates current cost and margin. Attaches forecast if available.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
DB_PATH  = DATA_DIR / "db" / "dishes.json"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _default_dishes() -> list[dict]:
    return [
        {
            "id": "margherita_pizza",
            "name": "Margherita Pizza",
            "current_price_eur": 12.90,
            "target_margin": 0.65,
            "ingredients": [
                {"ingredient_id": "tomatoes",  "grams": 180},
                {"ingredient_id": "cheese",    "grams": 160},
                {"ingredient_id": "flour",     "grams": 220},
                {"ingredient_id": "olive_oil", "grams": 25},
            ],
        },
        {
            "id": "pasta_pomodoro",
            "name": "Pasta Pomodoro",
            "current_price_eur": 11.90,
            "target_margin": 0.64,
            "ingredients": [
                {"ingredient_id": "pasta",     "grams": 180},
                {"ingredient_id": "tomatoes",  "grams": 220},
                {"ingredient_id": "olive_oil", "grams": 30},
            ],
        },
        {
            "id": "carbonara",
            "name": "Carbonara",
            "current_price_eur": 14.50,
            "target_margin": 0.65,
            "ingredients": [
                {"ingredient_id": "pasta",  "grams": 180},
                {"ingredient_id": "cheese", "grams": 90},
                {"ingredient_id": "eggs",   "grams": 120},
            ],
        },
    ]


def _load() -> list[dict]:
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text())
    data = _default_dishes()
    _save(data)
    return data


def _save(data: list[dict]):
    DB_PATH.write_text(json.dumps(data, indent=2))


def _make_id(name: str, existing_ids: list[str]) -> str:
    base = name.lower().replace(" ", "_").replace("/", "_")
    candidate = base
    i = 2
    while candidate in existing_ids:
        candidate = f"{base}_{i}"
        i += 1
    return candidate


# ── Cost calculation ──────────────────────────────────────────────────

def _ingredient_prices() -> dict[str, float]:
    from .ingredient_db import list_ingredients
    return {ing["id"]: ing["current_price_eur_kg"] for ing in list_ingredients()}


def calculate_dish_cost(dish: dict, prices: dict[str, float] | None = None) -> dict:
    """
    Returns cost breakdown:
    {
      ingredient_costs: [{ingredient_id, grams, price_per_kg, cost}],
      total_cost: float,
      current_price: float,
      current_margin: float,
      target_margin: float,
      margin_gap: float,   # current - target (negative = below target)
    }
    """
    if prices is None:
        prices = _ingredient_prices()

    breakdown = []
    total = 0.0
    for row in dish.get("ingredients", []):
        ing_id = row["ingredient_id"]
        grams  = float(row["grams"])
        price  = prices.get(ing_id, 5.0)
        cost   = price * grams / 1000.0
        total += cost
        breakdown.append({
            "ingredient_id": ing_id,
            "grams":         grams,
            "price_per_kg":  round(price, 2),
            "cost":          round(cost, 4),
            "share_pct":     0.0,  # filled below
        })

    for row in breakdown:
        row["share_pct"] = round(row["cost"] / total * 100, 1) if total > 0 else 0.0

    menu_price = float(dish.get("current_price_eur", 0))
    target_m   = float(dish.get("target_margin", 0.65))
    current_m  = (menu_price - total) / menu_price if menu_price > 0 else 0.0

    return {
        "ingredient_costs": breakdown,
        "total_cost":       round(total, 4),
        "current_price":    menu_price,
        "current_margin":   round(current_m, 4),
        "target_margin":    target_m,
        "margin_gap":       round(current_m - target_m, 4),
        "required_price":   round(total / (1 - target_m), 2) if target_m < 1 else None,
    }


def calculate_dish_forecast(dish: dict) -> dict | None:
    """
    Attach 6-month margin forecast per dish using normalized ingredient forecasts.
    Returns None if no forecast data available.
    """
    from .schemas_helpers import load_all_normalized_forecasts
    from .dish_cost_engine import forecast_dish_costs
    from .margin_engine import _risk_level

    forecasts = load_all_normalized_forecasts()
    if not forecasts:
        return None

    monthly = forecast_dish_costs({k: v for k, v in forecasts.items()})
    dish_id  = dish["id"]
    dish_name = dish["name"]

    # Match by dish name against the recipes engine output
    match = monthly.get(dish_name)
    if not match:
        return None

    menu_price = float(dish.get("current_price_eur", 0))
    target_m   = float(dish.get("target_margin", 0.65))

    series = []
    for mc in match:
        exp_m   = (menu_price - mc["expected_cost"])   / menu_price if menu_price > 0 else 0
        worst_m = (menu_price - mc["worst_case_cost"])  / menu_price if menu_price > 0 else 0
        best_m  = (menu_price - mc["best_case_cost"])   / menu_price if menu_price > 0 else 0
        series.append({
            "month":           mc["month"],
            "expected_cost":   mc["expected_cost"],
            "worst_cost":      mc["worst_case_cost"],
            "best_cost":       mc["best_case_cost"],
            "expected_margin": round(exp_m, 4),
            "worst_margin":    round(worst_m, 4),
            "best_margin":     round(best_m, 4),
        })

    min_exp   = min(p["expected_margin"] for p in series)
    min_worst = min(p["worst_margin"]    for p in series)
    risk = _risk_level(min_exp, min_worst, target_m)

    return {
        "series":             series,
        "min_expected_margin":   round(min_exp,   4),
        "min_worst_margin":      round(min_worst, 4),
        "risk_level":            risk,
    }


# ── Public CRUD ───────────────────────────────────────────────────────

def list_dishes(with_cost: bool = True) -> list[dict]:
    db     = _load()
    prices = _ingredient_prices() if with_cost else {}
    result = []
    for dish in db:
        row = dict(dish)
        if with_cost:
            row["cost_info"] = calculate_dish_cost(dish, prices)
        result.append(row)
    return result


def get_dish(dish_id: str) -> dict | None:
    return next((d for d in _load() if d["id"] == dish_id), None)


def create_dish(data: dict) -> dict:
    db = _load()
    dish_id = _make_id(data["name"], [d["id"] for d in db])
    new = {
        "id":               dish_id,
        "name":             data["name"],
        "current_price_eur": float(data.get("current_price_eur", 12.0)),
        "target_margin":    float(data.get("target_margin", 0.65)),
        "ingredients":      data.get("ingredients", []),
    }
    db.append(new)
    _save(db)
    return new


def update_dish(dish_id: str, data: dict) -> dict:
    db = _load()
    for i, dish in enumerate(db):
        if dish["id"] == dish_id:
            for k in ("name", "current_price_eur", "target_margin", "ingredients"):
                if k in data:
                    db[i][k] = data[k]
            _save(db)
            return db[i]
    raise KeyError(f"Dish '{dish_id}' not found")


def delete_dish(dish_id: str) -> bool:
    db = _load()
    new_db = [d for d in db if d["id"] != dish_id]
    if len(new_db) == len(db):
        return False
    _save(new_db)
    return True
