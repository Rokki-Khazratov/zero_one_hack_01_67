from .margin_engine import analyze_menu
from .recommendation_engine import generate_recommendations

DEFAULT_SCENARIO = {
    "target_margin": None,
    "max_price_increase_percent": 8.0,
    "supplier_lead_time_weeks": 3,
    "allow_recipe_changes": True,
    "allow_procurement_stock": True,
    "risk_tolerance": "medium",
    "demand_shock_percent": 0.0,
}


def simulate_scenario(
    normalized_forecasts: dict,
    new_scenario: dict,
    base_scenario: dict | None = None,
) -> dict:
    base = {**DEFAULT_SCENARIO, **(base_scenario or {})}
    new  = {**DEFAULT_SCENARIO, **new_scenario}

    # Override target margin from dish data if not set
    menu_analysis = analyze_menu(normalized_forecasts)

    base_recs = generate_recommendations(menu_analysis, normalized_forecasts, base)
    new_recs  = generate_recommendations(menu_analysis, normalized_forecasts, new)

    base_by_dish = {r["dish"]: r for r in base_recs}
    new_by_dish  = {r["dish"]: r for r in new_recs}

    comparisons = []
    for dish in base_by_dish:
        b = base_by_dish[dish]
        n = new_by_dish.get(dish, b)

        changed = []
        if b["primary_action"] != n["primary_action"]:
            changed.append(f"Action changed from {b['primary_action']} to {n['primary_action']}")
        if abs(b["recommended_price"] - n["recommended_price"]) > 0.01:
            changed.append(f"Price changed from {b['recommended_price']:.2f} to {n['recommended_price']:.2f}")
        if set(b["procurement_ingredients"]) != set(n["procurement_ingredients"]):
            changed.append("Procurement list changed")
        if b["recipe_adjustments"] != n["recipe_adjustments"]:
            changed.append("Recipe adjustments changed")

        why = _explain_change(base, new, b, n)

        comparisons.append({
            "dish":          dish,
            "old_action":    b["primary_action"],
            "new_action":    n["primary_action"],
            "old_price":     b["recommended_price"],
            "new_price":     n["recommended_price"],
            "what_changed":  changed,
            "why_changed":   why,
        })

    summary = _scenario_summary(base, new, comparisons)
    return {
        "scenario": new_scenario,
        "comparisons": comparisons,
        "summary": summary,
    }


def _explain_change(base, new, b_rec, n_rec) -> str:
    reasons = []
    if new["max_price_increase_percent"] < base["max_price_increase_percent"]:
        reasons.append(
            f"Max price increase tightened from {base['max_price_increase_percent']:.0f}% "
            f"to {new['max_price_increase_percent']:.0f}%, capping price action."
        )
    if new["supplier_lead_time_weeks"] > base["supplier_lead_time_weeks"]:
        reasons.append(
            f"Supplier lead time extended to {new['supplier_lead_time_weeks']} weeks, "
            "making early procurement more important."
        )
    if not new["allow_recipe_changes"] and base["allow_recipe_changes"]:
        reasons.append("Recipe changes now disabled, removing that lever.")
    if not new["allow_procurement_stock"] and base["allow_procurement_stock"]:
        reasons.append("Procurement stock option disabled.")
    if not reasons:
        return "No material change in business constraints."
    return " ".join(reasons)


def _scenario_summary(base, new, comparisons) -> str:
    action_changes = sum(1 for c in comparisons if c["old_action"] != c["new_action"])
    if action_changes == 0:
        return "Scenario change had no impact on recommended actions."
    return (
        f"{action_changes} of {len(comparisons)} dish recommendation(s) changed. "
        "Agent adapted to tighter business constraints."
    )
