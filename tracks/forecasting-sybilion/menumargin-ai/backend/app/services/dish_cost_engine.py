import pandas as pd
from .schemas_helpers import load_recipes, load_menu, load_current_price


def current_dish_costs() -> dict[str, float]:
    """Compute current ingredient cost per dish using current prices."""
    recipes = load_recipes()
    costs = {}
    for dish, group in recipes.groupby("dish"):
        total = 0.0
        for _, row in group.iterrows():
            price = load_current_price(row["ingredient"])
            total += price * row["grams"] / 1000.0
        costs[dish] = round(total, 4)
    return costs


def current_margins() -> dict[str, dict]:
    menu = load_menu().set_index("dish")
    costs = current_dish_costs()
    result = {}
    for dish, row in menu.iterrows():
        cost = costs.get(dish, 0.0)
        margin = (row["current_price"] - cost) / row["current_price"]
        result[dish] = {
            "current_price": float(row["current_price"]),
            "target_margin": float(row["target_margin"]),
            "current_cost": cost,
            "current_margin": round(margin, 4),
        }
    return result


def forecast_dish_costs(normalized_forecasts: dict[str, dict]) -> dict[str, list[dict]]:
    """
    For each dish, compute expected/worst/best cost per forecast month.
    Returns {dish: [{month, expected_cost, worst_case_cost, best_case_cost}]}
    """
    recipes = load_recipes()

    # Build {ingredient: {month: {median, lower, upper}}}
    ing_fc: dict[str, dict[str, dict]] = {}
    for ing, nf in normalized_forecasts.items():
        ing_fc[ing] = {p["month"]: p for p in nf["forecast"]}

    months = sorted({m for fc in ing_fc.values() for m in fc})

    result = {}
    for dish, group in recipes.groupby("dish"):
        monthly = []
        for month in months:
            exp = 0.0
            worst = 0.0
            best = 0.0
            for _, row in group.iterrows():
                ing = row["ingredient"]
                grams = row["grams"]
                if ing in ing_fc and month in ing_fc[ing]:
                    pt = ing_fc[ing][month]
                    exp   += pt["median"]     * grams / 1000.0
                    worst += pt["upper_band"] * grams / 1000.0
                    best  += pt["lower_band"] * grams / 1000.0
                else:
                    # fallback: use current price
                    p = load_current_price(ing)
                    component = p * grams / 1000.0
                    exp += component
                    worst += component
                    best += component
            monthly.append({
                "month": month,
                "expected_cost":   round(exp, 4),
                "worst_case_cost": round(worst, 4),
                "best_case_cost":  round(best, 4),
            })
        result[dish] = monthly
    return result
