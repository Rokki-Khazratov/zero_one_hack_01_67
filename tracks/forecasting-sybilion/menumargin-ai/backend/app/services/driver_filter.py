"""
Driver filter: cleans noisy Sybilion driver names and scores their relevance
to the specific ingredient being forecast.
"""
import re

# Keyword sets per ingredient — what should be visible to a restaurant owner
INGREDIENT_DRIVER_KEYWORDS: dict[str, list[str]] = {
    "cheese": [
        "cheese", "milk", "dairy", "eggs", "whey", "cream", "curd",
        "food", "producer price", "import price", "agriculture",
        "energy", "feed", "cattle", "livestock",
    ],
    "olive_oil": [
        "olive", "oil", "vegetable oil", "cooking oil",
        "drought", "weather", "rainfall", "spain", "italy", "greece",
        "mediterranean", "agriculture", "energy", "transport", "hicp",
    ],
    "pasta": [
        "pasta", "wheat", "grain", "cereal", "durum", "flour", "semolina",
        "energy", "fertilizer", "agriculture", "food",
    ],
    "tomatoes": [
        "tomato", "vegetable", "fresh produce", "greenhouse",
        "weather", "energy", "agriculture", "food",
    ],
    "eggs": [
        "egg", "poultry", "chicken", "feed", "food",
        "agriculture", "energy", "producer price",
    ],
    "flour": [
        "flour", "wheat", "grain", "cereal", "bread", "baking",
        "agriculture", "fertilizer", "energy", "food",
    ],
}

# Sectors that are almost certainly spurious correlations for food commodities
_NOISE_SECTORS = [
    "textiles", "apparel", "clothing", "wearing", "footwear",
    "population", "demographic",
    "labour market", "labor market", "employment rate", "unemployment",
    "housing", "rent", "real estate",
    "telecommunications", "telecom", "internet",
    "pharmaceutical", "medicine", "health",
    "automotive", "motor vehicle", "car",
    "software", "information technology",
]

# Short display-name patterns: regex → replacement template
_NAME_CLEANUP_RULES = [
    # "Food price monitoring tool, Index, 2015=100, Import price index, X, Country"
    (r"food price monitoring tool,?\s*index,?\s*\d{4}=\d+,?\s*import price index,?\s*(.+?),?\s*(\w+)\s+in\s+\w+",
     lambda m: f"{m.group(1).strip().title()} import price index — {m.group(2).strip().title()}"),

    # "Domestic producer prices – X in Country"
    (r"domestic producer prices\s*[–-]\s*(.+?)\s+in\s+(\w+)",
     lambda m: f"{m.group(1).strip().title()} producer prices — {m.group(2).strip().title()}"),

    # "HICP – X in/of Region"
    (r"hicp\s*[–-]\s*(.+?)(?:\s+in\s+|\s+of\s+)(.+)",
     lambda m: f"Consumer price index: {m.group(1).strip().title()} — {m.group(2).strip().title()}"),

    # "HICP – X" (no region)
    (r"hicp\s*[–-]\s*(.+)",
     lambda m: f"Consumer price index: {m.group(1).strip().title()}"),

    # "X exports of Y (qty, Weight in kilograms) via Z"
    (r"(\w+)\s+exports\s+of\s+(.+?)\s*\(.*?\)\s*via\s+(.+)",
     lambda m: f"{m.group(1).title()} exports: {m.group(2).strip().title()} — {m.group(3).strip()}"),

    # "Global risk – Country"
    (r"global risk\s*[–-]\s*(.+)",
     lambda m: f"Global economic risk — {m.group(1).strip().title()}"),

    # "Labour/Labor market – Country"
    (r"lab(?:ou?r|or)\s+market\s*[–-]\s*(.+)",
     lambda m: f"Labour market — {m.group(1).strip().title()}"),

    # "Population – Region"
    (r"population\s*[–-]?\s*(.+)",
     lambda m: f"Population — {m.group(1).strip().title()}"),
]


def clean_driver_name(raw_name: str) -> str:
    """Convert verbose raw driver names into human-readable labels."""
    text = raw_name.strip()
    lower = text.lower()

    for pattern, replacement in _NAME_CLEANUP_RULES:
        m = re.match(pattern, lower, re.IGNORECASE)
        if m:
            try:
                result = replacement(m) if callable(replacement) else replacement
                # Truncate if still too long
                return result[:80] if len(result) > 80 else result
            except Exception:
                break

    # Fallback: trim and truncate
    return text[:72] + "…" if len(text) > 72 else text


def score_driver_relevance(driver_name: str, ingredient: str) -> float:
    """Return relevance score 0.0–1.0 for a driver relative to the ingredient."""
    lower = driver_name.lower()
    keywords = INGREDIENT_DRIVER_KEYWORDS.get(ingredient, [])

    # Hard penalty for noise sectors
    for noise in _NOISE_SECTORS:
        if noise in lower:
            return 0.0

    if not keywords:
        return 0.5  # no filter defined — neutral

    matches = sum(1 for kw in keywords if kw in lower)
    if matches == 0:
        return 0.1  # exists but no keyword match → low relevance

    score = min(1.0, 0.3 + matches * 0.35)  # 1 match → 0.65, 2 → 1.0

    # Bonus: direct ingredient name appears
    ingredient_words = ingredient.replace("_", " ").split()
    if any(w in lower for w in ingredient_words):
        score = min(1.0, score + 0.3)

    return round(score, 3)


def filter_and_clean_drivers(
    raw_drivers: list[dict],
    ingredient: str,
    max_visible: int = 5,
    relevance_threshold: float = 0.2,
) -> list[dict]:
    """
    Score, clean, and filter drivers. Returns cleaned list with visible flag.
    Guarantees at most max_visible visible drivers; irrelevant ones are hidden.
    """
    cleaned = []
    for d in raw_drivers:
        raw_name = d.get("driver_name", "")
        score = score_driver_relevance(raw_name, ingredient)
        cleaned.append({
            "name":             clean_driver_name(raw_name),
            "raw_name":         raw_name,
            "importance":       round(float(d.get("importance", 0)), 2),
            "direction":        round(float(d.get("direction", 0)), 3),
            "relevance_score":  score,
            "visible":          score >= relevance_threshold,
        })

    # Sort: visible first, then by relevance desc, then importance desc
    cleaned.sort(key=lambda x: (-x["visible"], -x["relevance_score"], -x["importance"]))

    # Cap visible count
    visible_count = 0
    for d in cleaned:
        if d["visible"]:
            if visible_count >= max_visible:
                d["visible"] = False
            else:
                visible_count += 1

    return cleaned
