"""
Strategy Agent: deterministic rule-based procurement + pricing decisions.

Produces structured recommendations with:
- Per-ingredient procurement advice (buy_now, wait, monitor, buy_partial)
- Per-dish pricing actions (keep, raise, change_recipe, etc.)
- Multi-agent workflow log showing decision trace
- HITL (human-in-the-loop) approval flags
- Confidence scores based on forecast bands
"""

from datetime import datetime
from .schemas_helpers import load_all_normalized_forecasts, load_recipes
from .dish_db import list_dishes, calculate_dish_cost, calculate_dish_forecast


# ── Confidence scoring ────────────────────────────────────────────────

def _confidence_score(lower: float, median: float, upper: float) -> str:
    """Narrow band = high confidence, wide band = low."""
    if median <= 0:
        return "low"
    spread = (upper - lower) / median
    if spread < 0.05:
        return "high"
    if spread < 0.15:
        return "medium"
    return "low"


def _confidence_value(lower: float, median: float, upper: float) -> float:
    if median <= 0:
        return 0.3
    spread = (upper - lower) / median
    return round(max(0.1, min(1.0, 1.0 - spread)), 2)


# ── Ingredient-level procurement decisions ─────────────────────────────

PROCUREMENT_ACTIONS = {
    "buy_now":         "Price rising with high confidence — lock in current price immediately.",
    "buy_partial":     "Moderate upside risk — secure partial stock now, reassess in 4 weeks.",
    "wait":            "Stable or declining trend — no urgency, monitor monthly.",
    "monitor":         "High uncertainty — watch closely, set alert for 5% threshold.",
    "switch_supplier": "Persistent above-trend inflation — explore alternative suppliers.",
}


def _ingredient_strategy(ing: str, nf: dict) -> dict:
    """Decide procurement action for one ingredient."""
    current = nf.get("current_price_per_kg", 0)
    forecast = nf.get("forecast", [])
    if not forecast or current <= 0:
        return {"action": "monitor", "reason": "No forecast data available.", "confidence": "low"}

    last = forecast[-1]
    median = last.get("median", current)
    lower = last.get("lower_band", current)
    upper = last.get("upper_band", current)

    pct_change = (median - current) / current
    upside = (upper - current) / current
    downside = (current - lower) / current
    conf = _confidence_score(lower, median, upper)
    conf_val = _confidence_value(lower, median, upper)

    # Decision tree
    if pct_change > 0.08 and conf in ("high", "medium"):
        action = "buy_now"
        reason = f"Expected +{pct_change:.0%} rise over 6 months with {conf} confidence. Lock in €{current:.2f}/kg now."
    elif pct_change > 0.04 and conf == "high":
        action = "buy_now"
        reason = f"Steady upward trend +{pct_change:.0%}. Buy at current €{current:.2f}/kg before further increases."
    elif pct_change > 0.04 and conf in ("medium", "low"):
        action = "buy_partial"
        reason = f"Moderate risk +{pct_change:.0%} but {conf} confidence. Buy 50% of next month's stock now."
    elif upside > 0.15 and conf == "low":
        action = "monitor"
        reason = f"Wide forecast band (up to +{upside:.0%}). Set price alert at €{current * 1.05:.2f}/kg."
    elif pct_change < -0.05:
        action = "wait"
        reason = f"Expected decline {pct_change:.0%}. Delay procurement, prices likely to drop."
    elif pct_change > 0.02:
        action = "buy_partial"
        reason = f"Slight upward pressure +{pct_change:.0%}. Consider partial forward buying."
    else:
        action = "wait"
        reason = f"Stable outlook ({pct_change:+.1%}). No immediate action needed."

    # Drivers
    drivers = nf.get("drivers", [])
    top_driver = drivers[0]["driver_name"] if drivers else "market conditions"

    return {
        "ingredient": ing,
        "action": action,
        "reason": reason,
        "confidence": conf,
        "confidence_score": conf_val,
        "current_price": round(current, 2),
        "forecast_median": round(median, 2),
        "forecast_lower": round(lower, 2),
        "forecast_upper": round(upper, 2),
        "pct_change_expected": round(pct_change * 100, 1),
        "pct_upside_worst": round(upside * 100, 1),
        "top_driver": top_driver,
        "hitl_approval_required": action in ("buy_now", "switch_supplier"),
        "hitl_reason": "Large financial commitment — requires manager approval." if action == "buy_now" else None,
    }


# ── Dish-level strategy ───────────────────────────────────────────────

DISH_ACTIONS = {
    "keep_price":          "Margins stable — no menu change needed.",
    "raise_price_now":     "Critical margin erosion — immediate price increase required.",
    "raise_price_gradual": "Margins declining — phased price increase over 3 months.",
    "change_recipe":       "Cost pressure concentrated in one ingredient — adjust recipe.",
    "accept_margin_drop":  "Temporary market spike — absorb cost, reassess next quarter.",
    "review_manually":     "Complex tradeoff — needs owner decision.",
}


def _dish_strategy(dish: dict, ingredient_strategies: dict[str, dict]) -> dict:
    """Decide pricing action for one dish based on ingredient strategies."""
    ci = dish.get("cost_info", {})
    fc = dish.get("forecast")
    name = dish.get("name", dish.get("id", ""))
    price = dish.get("current_price_eur", 0)
    target = dish.get("target_margin", 0.65)
    current_margin = ci.get("current_margin", 0)

    if not fc or not fc.get("series"):
        return {
            "dish": name,
            "action": "keep_price",
            "reason": "No forecast data available.",
            "confidence": "low",
            "hitl_approval_required": False,
        }

    series = fc["series"]
    min_exp = fc.get("min_expected_margin", current_margin)
    min_worst = fc.get("min_worst_margin", current_margin)
    risk = fc.get("risk_level", "ok")

    # Find which ingredients drive cost
    ing_costs = ci.get("ingredient_costs", [])
    costliest_ing = max(ing_costs, key=lambda x: x.get("share_pct", 0)) if ing_costs else None
    costliest_id = costliest_ing["ingredient_id"] if costliest_ing else None
    costliest_share = costliest_ing.get("share_pct", 0) if costliest_ing else 0

    # Check if costliest ingredient has high risk
    ing_strat = ingredient_strategies.get(costliest_id, {}) if costliest_id else {}
    ing_action = ing_strat.get("action", "wait")

    # Price increase needed
    worst_cost_m6 = series[-1].get("worst_cost", 0) if series else 0
    required_price = worst_cost_m6 / (1 - target) if target < 1 and worst_cost_m6 > 0 else price
    price_gap = required_price - price
    price_gap_pct = (price_gap / price * 100) if price > 0 else 0

    # Decision tree
    if risk == "ok":
        action = "keep_price"
        reason = f"Margins stay above {target:.0%} target. Current margin {current_margin:.0%}."
        hitl = False
    elif risk == "critical" and price_gap_pct <= 8:
        action = "raise_price_now"
        reason = f"Margin drops to {min_exp:.0%} (target {target:.0%}). Need €{price_gap:.2f} increase ({price_gap_pct:.0f}%)."
        hitl = True
    elif risk == "critical" and price_gap_pct > 8:
        if costliest_share > 40 and ing_action in ("buy_now", "buy_partial"):
            action = "change_recipe"
            reason = f"{costliest_id.replace('_', ' ').title()} is {costliest_share:.0f}% of cost and rising. Reduce portion or substitute."
            hitl = True
        else:
            action = "raise_price_gradual"
            reason = f"Need +{price_gap_pct:.0f}% but capped at 8%. Phase over 3 months."
            hitl = True
    elif risk == "high":
        if price_gap_pct <= 5:
            action = "raise_price_gradual"
            reason = f"Margin at {min_exp:.0%}, below {target:.0%}. Small increase of {price_gap_pct:.0f}% needed."
            hitl = False
        else:
            action = "raise_price_gradual"
            reason = f"Margin eroding to {min_exp:.0%}. Gradual increase over 3 months."
            hitl = True
    elif risk == "medium":
        action = "accept_margin_drop"
        reason = f"Worst-case margin {min_worst:.0%} dips below target but expected stays above. Monitor."
        hitl = False
    else:
        action = "keep_price"
        reason = "No risk detected."
        hitl = False

    return {
        "dish": name,
        "action": action,
        "reason": reason,
        "confidence": "medium",
        "current_price": price,
        "target_margin": target,
        "current_margin": round(current_margin, 4),
        "min_expected_margin": min_exp,
        "min_worst_margin": min_worst,
        "risk_level": risk,
        "required_price": round(required_price, 2),
        "price_gap_pct": round(price_gap_pct, 1),
        "costliest_ingredient": costliest_id,
        "costliest_share_pct": costliest_share,
        "hitl_approval_required": hitl,
        "hitl_reason": "Menu price change needs owner sign-off." if hitl else None,
    }


# ── Multi-agent workflow log ──────────────────────────────────────────

def _build_workflow_log(
    ingredient_strategies: dict,
    dish_strategies: list[dict],
    dishes: list[dict],
) -> list[dict]:
    """Simulate a multi-agent decision workflow with timestamps."""
    ts = datetime.utcnow().isoformat() + "Z"
    log = []

    log.append({
        "step": 1,
        "agent": "data_agent",
        "action": "load_forecasts",
        "detail": f"Loaded {len(ingredient_strategies)} ingredient forecasts from cache.",
        "timestamp": ts,
    })

    log.append({
        "step": 2,
        "agent": "analysis_agent",
        "action": "compute_costs",
        "detail": f"Computed cost breakdown for {len(dishes)} dishes.",
        "timestamp": ts,
    })

    log.append({
        "step": 3,
        "agent": "strategy_agent",
        "action": "evaluate_ingredients",
        "detail": _summarize_ingredient_actions(ingredient_strategies),
        "timestamp": ts,
    })

    log.append({
        "step": 4,
        "agent": "strategy_agent",
        "action": "evaluate_dishes",
        "detail": _summarize_dish_actions(dish_strategies),
        "timestamp": ts,
    })

    hitl_items = [s for s in dish_strategies if s.get("hitl_approval_required")]
    hitl_items += [s for s in ingredient_strategies.values() if s.get("hitl_approval_required")]

    log.append({
        "step": 5,
        "agent": "hitl_agent",
        "action": "flag_for_review",
        "detail": f"{len(hitl_items)} decisions require human approval.",
        "timestamp": ts,
    })

    log.append({
        "step": 6,
        "agent": "strategy_agent",
        "action": "compile_report",
        "detail": "Strategy report compiled. Ready for review.",
        "timestamp": ts,
    })

    return log


def _summarize_ingredient_actions(strategies: dict) -> str:
    counts = {}
    for s in strategies.values():
        a = s.get("action", "monitor")
        counts[a] = counts.get(a, 0) + 1
    parts = [f"{v}x {k}" for k, v in sorted(counts.items())]
    return f"Ingredient decisions: {', '.join(parts)}."


def _summarize_dish_actions(strategies: list[dict]) -> str:
    counts = {}
    for s in strategies:
        a = s.get("action", "keep_price")
        counts[a] = counts.get(a, 0) + 1
    parts = [f"{v}x {k}" for k, v in sorted(counts.items())]
    return f"Dish decisions: {', '.join(parts)}."


# ── Public API ────────────────────────────────────────────────────────

def run_strategy(scenario: dict | None = None) -> dict:
    """
    Full strategy run:
    1. Load forecasts
    2. Analyze each ingredient → procurement advice
    3. Analyze each dish → pricing action
    4. Build workflow log
    5. Return structured strategy report
    """
    forecasts = load_all_normalized_forecasts()
    dishes = list_dishes(with_cost=True)

    # Step 1: ingredient strategies
    ingredient_strategies = {}
    for ing, nf in forecasts.items():
        ingredient_strategies[ing] = _ingredient_strategy(ing, nf)

    # Step 2: dish strategies
    dish_strategies = []
    for dish in dishes:
        ds = _dish_strategy(dish, ingredient_strategies)
        dish_strategies.append(ds)

    # Step 3: workflow log
    workflow_log = _build_workflow_log(ingredient_strategies, dish_strategies, dishes)

    # Step 4: summary
    buy_now = sum(1 for s in ingredient_strategies.values() if s["action"] == "buy_now")
    critical_dishes = sum(1 for s in dish_strategies if s.get("risk_level") == "critical")
    hitl_count = sum(1 for s in dish_strategies if s.get("hitl_approval_required"))
    hitl_count += sum(1 for s in ingredient_strategies.values() if s.get("hitl_approval_required"))

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total_ingredients": len(ingredient_strategies),
            "total_dishes": len(dish_strategies),
            "buy_now_count": buy_now,
            "critical_dishes": critical_dishes,
            "hitl_decisions_pending": hitl_count,
        },
        "ingredient_strategies": list(ingredient_strategies.values()),
        "dish_strategies": dish_strategies,
        "workflow_log": workflow_log,
    }
