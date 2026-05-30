import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def reconstruct_prices(index_df: pd.DataFrame, ingredient: str) -> pd.DataFrame:
    """
    Convert HICP index series to estimated €/kg using current price anchor.
    Formula: price_t = current_price * index_t / latest_index
    """
    current_prices = pd.read_csv(DATA_DIR / "current_prices.csv", index_col="ingredient")
    current_price = float(current_prices.loc[ingredient, "current_price_per_kg"])

    df = index_df.copy()
    latest_index = float(df["index_value"].iloc[-1])
    df["price_per_kg"] = current_price * df["index_value"] / latest_index
    df["ingredient"] = ingredient
    df["current_price_per_kg"] = current_price
    df["latest_index"] = latest_index
    df["source"] = "Eurostat"
    df["source_type"] = "index_reconstructed"
    return df[["ingredient", "date", "price_per_kg", "index_value",
               "current_price_per_kg", "latest_index", "source", "source_type"]]


def build_ingredient_prices_csv(index_data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Combine all ingredients into one processed CSV."""
    frames = [reconstruct_prices(df, ing) for ing, df in index_data.items()]
    combined = pd.concat(frames, ignore_index=True)
    out_path = DATA_DIR / "processed" / "ingredient_prices.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(out_path, index=False)
    return combined


def load_ingredient_prices() -> pd.DataFrame:
    path = DATA_DIR / "processed" / "ingredient_prices.csv"
    return pd.read_csv(path)
