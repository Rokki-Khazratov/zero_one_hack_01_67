"""
Ingredient database: JSON-backed CRUD for active ingredients.
Also exposes the static Eurostat catalog for the picker UI.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
DB_PATH  = DATA_DIR / "db" / "ingredients.json"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Full Eurostat HICP catalog ────────────────────────────────────────
EUROSTAT_CATALOG: list[dict] = [
    {"id": "pasta",      "name": "Pasta & Couscous",           "coicop": "CP01116", "category": "Grains"},
    {"id": "flour",      "name": "Flour & Cereals",            "coicop": "CP01112", "category": "Grains"},
    {"id": "bread",      "name": "Bread",                      "coicop": "CP01113", "category": "Grains"},
    {"id": "rice",       "name": "Rice",                       "coicop": "CP01111", "category": "Grains"},

    {"id": "beef",       "name": "Beef & Veal",                "coicop": "CP01121", "category": "Meat"},
    {"id": "pork",       "name": "Pork",                       "coicop": "CP01122", "category": "Meat"},
    {"id": "chicken",    "name": "Poultry (Chicken)",          "coicop": "CP01124", "category": "Meat"},
    {"id": "lamb",       "name": "Lamb & Goat",                "coicop": "CP01123", "category": "Meat"},

    {"id": "fish",       "name": "Fresh Fish & Seafood",       "coicop": "CP01131", "category": "Fish"},

    {"id": "milk",       "name": "Fresh Whole Milk",           "coicop": "CP01141", "category": "Dairy"},
    {"id": "cheese",     "name": "Cheese & Curd",              "coicop": "CP01144", "category": "Dairy"},
    {"id": "eggs",       "name": "Eggs",                       "coicop": "CP01147", "category": "Dairy"},
    {"id": "butter",     "name": "Butter",                     "coicop": "CP01151", "category": "Dairy"},
    {"id": "cream",      "name": "Cream & Yoghurt",            "coicop": "CP01142", "category": "Dairy"},

    {"id": "olive_oil",  "name": "Olive Oil (extra virgin)",   "coicop": "CP01153", "category": "Oils"},
    {"id": "other_oils", "name": "Sunflower / Veggie Oil",     "coicop": "CP01154", "category": "Oils"},

    {"id": "tomatoes",   "name": "Fresh Vegetables (Tomato proxy)", "coicop": "CP01171", "category": "Vegetables"},
    {"id": "potatoes",   "name": "Potatoes",                   "coicop": "CP01174", "category": "Vegetables"},

    {"id": "fruit",      "name": "Fresh Fruit",                "coicop": "CP01161", "category": "Fruit"},

    {"id": "sugar",      "name": "Sugar",                      "coicop": "CP01181", "category": "Pantry"},
    {"id": "coffee",     "name": "Coffee, Tea & Cocoa",        "coicop": "CP0121",  "category": "Pantry"},
    {"id": "chocolate",  "name": "Chocolate & Confectionery",  "coicop": "CP01183", "category": "Pantry"},
    {"id": "salt",       "name": "Salt, Spices & Condiments",  "coicop": "CP01191", "category": "Pantry"},

    {"id": "wine",       "name": "Wine",                       "coicop": "CP0211",  "category": "Beverages"},
    {"id": "beer",       "name": "Beer",                       "coicop": "CP0212",  "category": "Beverages"},
]

CATALOG_BY_ID = {c["id"]: c for c in EUROSTAT_CATALOG}


# ── Default active ingredients (seeded from current_prices.csv) ───────
def _default_ingredients() -> list[dict]:
    current_prices = {
        "pasta": 4.20, "tomatoes": 4.80, "cheese": 18.50,
        "olive_oil": 19.00, "eggs": 9.50, "flour": 2.80,
    }
    now = datetime.utcnow().isoformat()
    result = []
    for cat in EUROSTAT_CATALOG:
        cid = cat["id"]
        result.append({
            "id":                    cid,
            "name":                  cat["name"],
            "coicop":                cat["coicop"],
            "category":              cat["category"],
            "current_price_eur_kg":  current_prices.get(cid, 5.0),
            "unit":                  "kg",
            "geo":                   "EU27_2020",
            "has_forecast":          cid in {"pasta","tomatoes","cheese","olive_oil","eggs","flour",
                                             "butter","cream","chicken","rice","wine","potatoes",
                                             "sugar","coffee","milk","fish"},
            "price_fetched_at":      now if cid in current_prices else None,
            "added_at":              now,
            "notes":                 "",
        })
    return result


def _load() -> list[dict]:
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text())
    data = _default_ingredients()
    _save(data)
    return data


def _save(data: list[dict]):
    DB_PATH.write_text(json.dumps(data, indent=2))


# ── Public API ────────────────────────────────────────────────────────

def list_ingredients() -> list[dict]:
    return _load()


def get_ingredient(ing_id: str) -> dict | None:
    return next((i for i in _load() if i["id"] == ing_id), None)


def create_ingredient(data: dict) -> dict:
    db = _load()
    ing_id = data.get("id") or data["name"].lower().replace(" ", "_")
    if any(i["id"] == ing_id for i in db):
        raise ValueError(f"Ingredient '{ing_id}' already exists")
    catalog_entry = CATALOG_BY_ID.get(ing_id, {})
    new = {
        "id":                   ing_id,
        "name":                 data.get("name", catalog_entry.get("name", ing_id)),
        "coicop":               data.get("coicop", catalog_entry.get("coicop", "")),
        "category":             data.get("category", catalog_entry.get("category", "Other")),
        "current_price_eur_kg": float(data.get("current_price_eur_kg", 5.0)),
        "unit":                 data.get("unit", "kg"),
        "geo":                  data.get("geo", "EU27_2020"),
        "has_forecast":         False,
        "price_fetched_at":     None,
        "added_at":             datetime.utcnow().isoformat(),
        "notes":                data.get("notes", ""),
    }
    db.append(new)
    _save(db)
    return new


def update_ingredient(ing_id: str, data: dict) -> dict:
    db = _load()
    for i, ing in enumerate(db):
        if ing["id"] == ing_id:
            allowed = {"name", "current_price_eur_kg", "unit", "geo", "notes", "coicop", "category"}
            for k, v in data.items():
                if k in allowed:
                    db[i][k] = v
            _save(db)
            return db[i]
    raise KeyError(f"Ingredient '{ing_id}' not found")


def delete_ingredient(ing_id: str) -> bool:
    db = _load()
    new_db = [i for i in db if i["id"] != ing_id]
    if len(new_db) == len(db):
        return False
    _save(new_db)
    return True


def mark_forecast_available(ing_id: str, fetched_at: str | None = None):
    db = _load()
    for ing in db:
        if ing["id"] == ing_id:
            ing["has_forecast"] = True
            ing["price_fetched_at"] = fetched_at or datetime.utcnow().isoformat()
            _save(db)
            return


def get_catalog() -> list[dict]:
    """Full Eurostat catalog for the ingredient picker."""
    active_ids = {i["id"] for i in _load()}
    return [
        {**cat, "active": cat["id"] in active_ids}
        for cat in EUROSTAT_CATALOG
    ]
