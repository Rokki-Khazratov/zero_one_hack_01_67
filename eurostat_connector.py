import pandas as pd
import requests
import io

def fetch_eurostat_series(coicop_code: str, col_name: str, country_code: str = "AT") -> pd.DataFrame:
    url = f"https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/prc_hicp_midx/M.I15.{coicop_code}.{country_code}?format=SDMX-CSV"
    
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    df = pd.read_csv(io.StringIO(response.text))[['TIME_PERIOD', 'OBS_VALUE']]
    df.columns = ['date', col_name]
    
    return df.dropna().sort_values(by='date')

def build_sybilion_payload(months: int = 60) -> dict:
    df_target = fetch_eurostat_series("CP011", "food_price")
    df_energy = fetch_eurostat_series("CP045", "energy_price")
    df_fuel = fetch_eurostat_series("CP0722", "fuel_price")
    
    df_merged = pd.merge(df_target, df_energy, on='date', how='inner')
    df_merged = pd.merge(df_merged, df_fuel, on='date', how='inner')
    
    df_final = df_merged.tail(months).reset_index(drop=True)
    
    return {
        "metadata": {
            "target": "food_price",
            "drivers": ["energy_price", "fuel_price"],
            "months_count": len(df_final)
        },
        "data": df_final.to_dict(orient='records')
    }