from pathlib import Path
import pandas as pd
import json

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_current_price(ingredient: str) -> float:
    df = pd.read_csv(DATA_DIR / "current_prices.csv", index_col="ingredient")
    return float(df.loc[ingredient, "current_price_per_kg"])


def load_recipes() -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / "demo" / "recipes.csv")


def load_menu() -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / "demo" / "menu.csv")


def load_keywords() -> dict:
    path = DATA_DIR / "config" / "ingredient_keywords.json"
    return json.loads(path.read_text())


def load_all_forecasts() -> dict:
    cache_dir = DATA_DIR / "cache"
    forecasts = {}
    for path in cache_dir.glob("*_forecast.json"):
        ingredient = path.stem.replace("_forecast", "")
        import json as _json
        forecasts[ingredient] = _json.loads(path.read_text())
    return forecasts
