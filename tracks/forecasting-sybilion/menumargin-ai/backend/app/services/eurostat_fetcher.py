import io
import pandas as pd
import requests

INGREDIENT_COICOP = {
    "pasta":     "CP01116",
    "tomatoes":  "CP01171",
    "cheese":    "CP01144",
    "olive_oil": "CP01153",
    "eggs":      "CP01147",
    "flour":     "CP01112",
    "butter":    "CP01151",
    "cream":     "CP01152",
    "chicken":   "CP01122",
    "rice":      "CP01115",
    "wine":      "CP02121",
    "potatoes":  "CP01174",
    "sugar":     "CP01181",
    "coffee":    "CP01121",
    "milk":      "CP01141",
    "fish":      "CP01132",
}

DRIVER_COICOP = {
    "energy_price": "CP045",
    "fuel_price":   "CP0722",
}

BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_midx"


def _fetch_series(coicop_code: str, col_name: str, country: str) -> pd.DataFrame:
    url = f"{BASE_URL}/M.I15.{coicop_code}.{country}?format=SDMX-CSV"
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))[["TIME_PERIOD", "OBS_VALUE"]]
    df.columns = ["date", col_name]
    return df.dropna().sort_values("date").reset_index(drop=True)


def fetch_ingredient_series(ingredient: str, country: str = "EU27_2020") -> pd.DataFrame:
    """Return monthly HICP index for one ingredient."""
    coicop = INGREDIENT_COICOP[ingredient]
    return _fetch_series(coicop, "index_value", country)


def fetch_all_ingredients(country: str = "EU27_2020") -> dict[str, pd.DataFrame]:
    """Fetch HICP index series for all 6 MVP ingredients."""
    return {ing: fetch_ingredient_series(ing, country) for ing in INGREDIENT_COICOP}


def build_sybilion_timeseries(ingredient: str, months: int = 72, country: str = "EU27_2020") -> dict:
    """
    Build a timeseries dict ready for Sybilion API submission.
    Keys are YYYY-MM-01, values are index floats.
    """
    df = fetch_ingredient_series(ingredient, country).tail(months)
    ts = {
        f"{row['date']}-01": float(row["index_value"])
        for _, row in df.iterrows()
    }
    return ts


# Vova's original broad-food payload builder, kept for reference
def build_broad_food_payload(months: int = 60, country: str = "AT") -> dict:
    df_food   = _fetch_series("CP011",  "food_price",   country)
    df_energy = _fetch_series("CP045",  "energy_price", country)
    df_fuel   = _fetch_series("CP0722", "fuel_price",   country)

    df = pd.merge(df_food, df_energy, on="date", how="inner")
    df = pd.merge(df, df_fuel, on="date", how="inner")
    df = df.tail(months).reset_index(drop=True)

    return {
        "metadata": {
            "target": "food_price",
            "drivers": ["energy_price", "fuel_price"],
            "months_count": len(df),
        },
        "data": df.to_dict(orient="records"),
    }
