from .dish_cost_engine import current_margins, forecast_dish_costs
from .schemas_helpers import load_menu


RISK_LEVELS = ["ok", "medium", "high", "critical"]


def _risk_level(expected_margin: float, worst_margin: float, target: float) -> str:
    if worst_margin < target and expected_margin < target:
        return "critical"
    if expected_margin < target:
        return "high"
    if worst_margin < target:
        return "medium"
    return "ok"


def analyze_menu(normalized_forecasts: dict[str, dict]) -> dict:
    """
    Full menu analysis: current margins + future margin per month + risk.
    """
    menu = load_menu().set_index("dish")
    cur = current_margins()
    fc_costs = forecast_dish_costs(normalized_forecasts)

    dishes_out = []
    for dish, row in menu.iterrows():
        price = float(row["current_price"])
        target = float(row["target_margin"])
        cur_info = cur[dish]

        month_margins = []
        for mc in fc_costs.get(dish, []):
            exp_m   = (price - mc["expected_cost"])   / price
            worst_m = (price - mc["worst_case_cost"])  / price
            best_m  = (price - mc["best_case_cost"])   / price
            month_margins.append({
                "month":           mc["month"],
                "expected_cost":   mc["expected_cost"],
                "worst_case_cost": mc["worst_case_cost"],
                "best_case_cost":  mc["best_case_cost"],
                "expected_margin": round(exp_m, 4),
                "worst_case_margin": round(worst_m, 4),
                "best_case_margin":  round(best_m, 4),
            })

        min_exp   = min((m["expected_margin"]   for m in month_margins), default=cur_info["current_margin"])
        min_worst = min((m["worst_case_margin"]  for m in month_margins), default=cur_info["current_margin"])
        risk = _risk_level(min_exp, min_worst, target)

        dishes_out.append({
            "dish":               dish,
            "current_price":      price,
            "target_margin":      target,
            "current_margin":     cur_info["current_margin"],
            "month_margins":      month_margins,
            "risk_level":         risk,
            "min_expected_margin":   round(min_exp, 4),
            "min_worst_case_margin": round(min_worst, 4),
        })

    dishes_at_risk  = sum(1 for d in dishes_out if d["risk_level"] in ("high", "critical", "medium"))
    critical        = sum(1 for d in dishes_out if d["risk_level"] == "critical")
    avg_drop = sum(d["min_expected_margin"] - d["target_margin"] for d in dishes_out) / max(len(dishes_out), 1)

    # Highest risk ingredient: which ingredient drives most cost change
    highest_risk_ing = _highest_risk_ingredient(normalized_forecasts)

    return {
        "summary": {
            "dishes_at_risk":         dishes_at_risk,
            "critical_dishes":        critical,
            "average_margin_drop":    round(avg_drop, 4),
            "highest_risk_ingredient": highest_risk_ing,
            "total_dishes":           len(dishes_out),
        },
        "dishes": dishes_out,
    }


def _highest_risk_ingredient(forecasts: dict[str, dict]) -> str:
    max_upside = -1.0
    top = "olive_oil"
    for ing, nf in forecasts.items():
        cur = nf["current_price_per_kg"]
        if not nf["forecast"]:
            continue
        last = nf["forecast"][-1]["upper_band"]
        upside = (last - cur) / cur if cur > 0 else 0
        if upside > max_upside:
            max_upside = upside
            top = ing
    return top
