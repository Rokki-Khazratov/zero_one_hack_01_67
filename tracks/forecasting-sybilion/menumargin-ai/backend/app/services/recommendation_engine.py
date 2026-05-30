from .schemas_helpers import load_recipes

ACTIONS = [
    "KEEP_PRICE",
    "RAISE_PRICE_NOW",
    "RAISE_PRICE_GRADUALLY",
    "BUY_INGREDIENT_STOCK",
    "CHANGE_RECIPE",
    "ACCEPT_TEMPORARY_MARGIN_DROP",
    "MANUAL_REVIEW",
]

HIGH_STORAGE_INGREDIENTS = {"pasta", "flour", "olive_oil"}


def _round_menu_price(price: float) -> float:
    """Round to nearest .50 or .90."""
    base = int(price)
    frac = price - base
    if frac <= 0.5:
        return base + 0.50
    return base + 0.90


def _gradual_plan(current: float, target: float, months: int = 3) -> list[dict]:
    step = (target - current) / months
    return [
        {"month": f"month_{i+1}", "recommended_price": round(_round_menu_price(current + step * (i + 1)), 2)}
        for i in range(months)
    ]


def generate_recommendations(
    menu_analysis: dict,
    normalized_forecasts: dict[str, dict],
    scenario: dict | None = None,
) -> list[dict]:
    sc = scenario or {}
    max_increase_pct   = sc.get("max_price_increase_percent", 8.0) / 100.0
    allow_recipe       = sc.get("allow_recipe_changes", True)
    allow_stock        = sc.get("allow_procurement_stock", True)
    supplier_lead_time = sc.get("supplier_lead_time_weeks", 3)

    recipes = load_recipes()
    recs = []

    for dish_info in menu_analysis["dishes"]:
        dish        = dish_info["dish"]
        price       = dish_info["current_price"]
        target_m    = dish_info["target_margin"]
        risk        = dish_info["risk_level"]
        month_ms    = dish_info["month_margins"]

        # Worst expected cost in month 6
        worst_cost = max((m["worst_case_cost"] for m in month_ms), default=0)
        exp_cost   = max((m["expected_cost"]   for m in month_ms), default=0)

        required_price  = exp_cost   / (1 - target_m) if exp_cost > 0 else price
        required_worst  = worst_cost / (1 - target_m) if worst_cost > 0 else price
        recommended     = _round_menu_price(required_price)

        max_allowed_price = price * (1 + max_increase_pct)
        capped            = recommended > max_allowed_price

        # Primary action decision
        if risk == "ok":
            action = "KEEP_PRICE"
        elif risk == "medium":
            if not capped:
                action = "RAISE_PRICE_GRADUALLY"
            else:
                action = "ACCEPT_TEMPORARY_MARGIN_DROP"
        elif risk == "high":
            if not capped:
                action = "RAISE_PRICE_GRADUALLY"
            else:
                action = "BUY_INGREDIENT_STOCK" if allow_stock else "ACCEPT_TEMPORARY_MARGIN_DROP"
        elif risk == "critical":
            if not capped:
                action = "RAISE_PRICE_NOW"
            elif allow_stock:
                action = "BUY_INGREDIENT_STOCK"
            elif allow_recipe:
                action = "CHANGE_RECIPE"
            else:
                action = "MANUAL_REVIEW"
        else:
            action = "KEEP_PRICE"

        price_plan = []
        if action in ("RAISE_PRICE_GRADUALLY",):
            price_plan = _gradual_plan(price, min(recommended, max_allowed_price))
        elif action == "RAISE_PRICE_NOW":
            price_plan = [{"month": "now", "recommended_price": min(recommended, max_allowed_price)}]

        # Procurement
        procurement_ings = []
        if allow_stock and risk in ("high", "critical"):
            dish_ingredients = recipes[recipes["dish"] == dish]["ingredient"].tolist()
            for ing in dish_ingredients:
                if ing in HIGH_STORAGE_INGREDIENTS:
                    nf = normalized_forecasts.get(ing, {})
                    if nf.get("forecast"):
                        cur_p = nf["current_price_per_kg"]
                        up_p  = nf["forecast"][-1]["upper_band"]
                        if (up_p - cur_p) / max(cur_p, 0.01) > 0.05:
                            procurement_ings.append(ing)

        # Recipe
        recipe_adj = []
        if allow_recipe and capped and risk in ("high", "critical"):
            dish_ingredients = recipes[recipes["dish"] == dish]["ingredient"].tolist()
            costliest = _find_costliest_ingredient(dish_ingredients, normalized_forecasts)
            if costliest:
                recipe_adj.append(f"Reduce {costliest} by 10%")

        reasoning = _build_reasoning(dish, dish_info, normalized_forecasts, action, recommended, capped)

        recs.append({
            "dish":                     dish,
            "primary_action":           action,
            "current_price":            price,
            "required_price":           round(required_price, 2),
            "recommended_price":        round(min(recommended, max_allowed_price), 2),
            "price_plan":               price_plan,
            "procurement_ingredients":  procurement_ings,
            "recipe_adjustments":       recipe_adj,
            "reasoning":                reasoning,
            "risk_level":               risk,
        })

    return recs


def _find_costliest_ingredient(ingredients: list[str], forecasts: dict) -> str | None:
    max_cost = -1.0
    top = None
    for ing in ingredients:
        nf = forecasts.get(ing)
        if nf and nf.get("forecast"):
            p = nf["forecast"][-1]["upper_band"]
            if p > max_cost:
                max_cost = p
                top = ing
    return top


def _build_reasoning(dish, dish_info, forecasts, action, recommended, capped) -> str:
    lines = []
    risk = dish_info["risk_level"]
    target = dish_info["target_margin"]
    price = dish_info["current_price"]

    if risk == "ok":
        lines.append(f"{dish} margins remain above target through the forecast period.")
    else:
        # Find first month where margin drops
        for m in dish_info["month_margins"]:
            if m["expected_margin"] < target:
                lines.append(f"{dish} expected margin falls below {target:.0%} in {m['month']}.")
                break
        worst_m = dish_info["min_worst_case_margin"]
        lines.append(f"Worst-case margin reaches {worst_m:.0%} by month 6.")

    # Top risky ingredient
    top_ing = None
    max_upside = -1.0
    for ing, nf in forecasts.items():
        if not nf.get("forecast"):
            continue
        cur = nf["current_price_per_kg"]
        up  = nf["forecast"][-1]["upper_band"]
        us  = (up - cur) / max(cur, 0.01)
        if us > max_upside:
            max_upside = us
            top_ing = ing
    if top_ing:
        drivers = forecasts[top_ing].get("drivers", [])
        driver_str = drivers[0]["driver_name"] if drivers else "market conditions"
        lines.append(f"{top_ing.replace('_', ' ').title()} has the highest upside risk, driven by {driver_str}.")

    if capped:
        lines.append(f"Price increase is capped at business constraint ({price * 1.08:.2f} max).")

    return " ".join(lines)
