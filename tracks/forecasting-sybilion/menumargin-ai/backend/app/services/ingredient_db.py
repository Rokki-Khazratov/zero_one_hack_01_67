"""
Ingredient database: JSON-backed CRUD for active ingredients.
Prices sourced from Eurostat HICP index + current price anchors.
Also exposes the static Eurostat catalog for the picker UI.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
DB_PATH  = DATA_DIR / "db" / "ingredients.json"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load_eurostat_indices() -> dict:
    """Load latest Eurostat HICP indices from config."""
    path = DATA_DIR / "config" / "eurostat_indices.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


EUROSTAT_INDICES = _load_eurostat_indices()

# ── Full Eurostat HICP catalog ────────────────────────────────────────
# Prices derived from Eurostat HICP index + current price anchors.
# For ingredients with known market prices (current_prices.csv), those are used.
# For others, prices are estimated from index ratios and EU wholesale benchmarks.
EUROSTAT_CATALOG: list[dict] = [
    {"id": "pasta",      "name": "Pasta & Couscous",               "coicop": "CP01116", "category": "Grains",      "price": 4.20,  "source": "Eurostat HICP + anchor"},
    {"id": "flour",      "name": "Flour & Cereals",                "coicop": "CP01112", "category": "Grains",      "price": 2.80,  "source": "Eurostat HICP + anchor"},
    {"id": "bread",      "name": "Bread",                          "coicop": "CP01113", "category": "Grains",      "price": 3.50,  "source": "EU wholesale benchmark"},
    {"id": "rice",       "name": "Rice",                           "coicop": "CP01111", "category": "Grains",      "price": 2.80,  "source": "Eurostat HICP + anchor"},

    {"id": "beef",       "name": "Beef & Veal",                    "coicop": "CP01121", "category": "Meat",        "price": 16.00, "source": "EU wholesale benchmark"},
    {"id": "pork",       "name": "Pork",                           "coicop": "CP01122", "category": "Meat",        "price": 8.50,  "source": "EU wholesale benchmark"},
    {"id": "chicken",    "name": "Poultry (Chicken)",              "coicop": "CP01124", "category": "Meat",        "price": 7.50,  "source": "Eurostat HICP + anchor"},
    {"id": "lamb",       "name": "Lamb & Goat",                    "coicop": "CP01123", "category": "Meat",        "price": 18.00, "source": "EU wholesale benchmark"},

    {"id": "fish",       "name": "Fresh Fish & Seafood",           "coicop": "CP01131", "category": "Fish",        "price": 14.00, "source": "Eurostat HICP + anchor"},

    {"id": "milk",       "name": "Fresh Whole Milk",               "coicop": "CP01141", "category": "Dairy",       "price": 1.60,  "source": "Eurostat HICP + anchor"},
    {"id": "cheese",     "name": "Cheese & Curd",                  "coicop": "CP01144", "category": "Dairy",       "price": 18.50, "source": "Eurostat HICP + anchor"},
    {"id": "eggs",       "name": "Eggs",                           "coicop": "CP01147", "category": "Dairy",       "price": 9.50,  "source": "Eurostat HICP + anchor"},
    {"id": "butter",     "name": "Butter",                         "coicop": "CP01151", "category": "Dairy",       "price": 8.50,  "source": "Eurostat HICP + anchor"},
    {"id": "cream",      "name": "Cream & Yoghurt",                "coicop": "CP01142", "category": "Dairy",       "price": 6.00,  "source": "Eurostat HICP + anchor"},

    {"id": "olive_oil",  "name": "Olive Oil (extra virgin)",       "coicop": "CP01153", "category": "Oils",        "price": 19.00, "source": "Eurostat HICP + anchor"},
    {"id": "other_oils", "name": "Sunflower / Veggie Oil",         "coicop": "CP01154", "category": "Oils",        "price": 3.20,  "source": "EU wholesale benchmark"},

    {"id": "tomatoes",   "name": "Fresh Vegetables (Tomato proxy)","coicop": "CP01171", "category": "Vegetables",  "price": 4.80,  "source": "Eurostat HICP + anchor"},
    {"id": "potatoes",   "name": "Potatoes",                       "coicop": "CP01174", "category": "Vegetables",  "price": 1.80,  "source": "Eurostat HICP + anchor"},

    {"id": "fruit",      "name": "Fresh Fruit",                    "coicop": "CP01161", "category": "Fruit",       "price": 3.50,  "source": "EU wholesale benchmark"},

    {"id": "sugar",      "name": "Sugar",                          "coicop": "CP01181", "category": "Pantry",      "price": 1.50,  "source": "Eurostat HICP + anchor"},
    {"id": "coffee",     "name": "Coffee, Tea & Cocoa",            "coicop": "CP0121",  "category": "Pantry",      "price": 18.00, "source": "Eurostat HICP + anchor"},
    {"id": "chocolate",  "name": "Chocolate & Confectionery",      "coicop": "CP01183", "category": "Pantry",      "price": 12.00, "source": "EU wholesale benchmark"},
    {"id": "salt",       "name": "Salt, Spices & Condiments",      "coicop": "CP01191", "category": "Pantry",      "price": 4.00,  "source": "EU wholesale benchmark"},

    {"id": "wine",       "name": "Wine",                           "coicop": "CP0211",  "category": "Beverages",   "price": 8.00,  "source": "Eurostat HICP + anchor"},
    {"id": "beer",       "name": "Beer",                           "coicop": "CP0212",  "category": "Beverages",   "price": 3.50,  "source": "EU wholesale benchmark"},
]

CATALOG_BY_ID = {c["id"]: c for c in EUROSTAT_CATALOG}


# ── Default active ingredients (seeded from Eurostat data) ────────────
def _default_ingredients() -> list[dict]:
    now = datetime.utcnow().isoformat()
    result = []
    for cat in EUROSTAT_CATALOG:
        cid = cat["id"]
        price = cat.get("price", 5.0)
        eurostat = EUROSTAT_INDICES.get(cid, {})
        result.append({
            "id":                    cid,
            "name":                  cat["name"],
            "coicop":                cat["coicop"],
            "category":              cat["category"],
            "current_price_eur_kg":  price,
            "unit":                  "kg",
            "geo":                   "EU27_2020",
            "has_forecast":          cid in {"pasta","tomatoes","cheese","olive_oil","eggs","flour",
                                             "butter","cream","chicken","rice","wine","potatoes",
                                             "sugar","coffee","milk","fish"},
            "eurostat_index":        eurostat.get("index"),
            "eurostat_date":         eurostat.get("date"),
            "price_source":          cat.get("source", "Eurostat HICP"),
            "price_fetched_at":      now if price else None,
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
    default_price = catalog_entry.get("price", 5.0)
    new = {
        "id":                   ing_id,
        "name":                 data.get("name", catalog_entry.get("name", ing_id)),
        "coicop":               data.get("coicop", catalog_entry.get("coicop", "")),
        "category":             data.get("category", catalog_entry.get("category", "Other")),
        "current_price_eur_kg": float(data.get("current_price_eur_kg", default_price)),
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
    result = []
    for cat in EUROSTAT_CATALOG:
        eurostat = EUROSTAT_INDICES.get(cat["id"], {})
        result.append({
            **cat,
            "current_price_eur_kg": cat.get("price", 5.0),
            "eurostat_index": eurostat.get("index"),
            "eurostat_date": eurostat.get("date"),
            "active": cat["id"] in active_ids,
        })
    return result
