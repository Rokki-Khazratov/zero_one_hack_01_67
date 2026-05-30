import json
import os
from pathlib import Path

from sybilion import Client
from sybilion import ApiException

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
CACHE_DIR = DATA_DIR / "cache"
MOCK_DIR = DATA_DIR / "mock"

INGREDIENT_TITLES = {
    "pasta":     "Pasta Products Consumer Price Index EU Monthly",
    "tomatoes":  "Fresh Vegetables Consumer Price Index EU Monthly",
    "cheese":    "Cheese and Curd Consumer Price Index EU Monthly",
    "olive_oil": "Olive Oil Consumer Price Index EU Monthly",
    "eggs":      "Eggs Consumer Price Index EU Monthly",
    "flour":     "Flours and Cereals Consumer Price Index EU Monthly",
    "butter":    "Butter Consumer Price Index EU Monthly",
    "cream":     "Cream and Other Milk Products Consumer Price Index EU Monthly",
    "chicken":   "Poultry Consumer Price Index EU Monthly",
    "rice":      "Rice Consumer Price Index EU Monthly",
    "wine":      "Wine Consumer Price Index EU Monthly",
    "potatoes":  "Potatoes and Dried Vegetables Consumer Price Index EU Monthly",
    "sugar":     "Sugar Consumer Price Index EU Monthly",
    "coffee":    "Coffee and Tea Consumer Price Index EU Monthly",
    "milk":      "Milk Consumer Price Index EU Monthly",
    "fish":      "Fish and Seafood Consumer Price Index EU Monthly",
}


def _get_client() -> Client:
    token = os.environ.get("SYBILION_API_TOKEN") or os.environ.get("SYBILION_API_KEY")
    return Client(token=token)


def _cache_path(ingredient: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{ingredient}_forecast.json"


def _mock_path(ingredient: str) -> Path:
    return MOCK_DIR / f"{ingredient}_forecast_mock.json"


def run_forecast(
    ingredient: str,
    timeseries: dict[str, float],
    keywords: list[str],
    horizon_months: int = 6,
    force_refresh: bool = False,
) -> dict:
    """
    Submit a forecast to Sybilion, wait for completion, cache and return result.
    Falls back to mock data if API fails.
    """
    cache = _cache_path(ingredient)
    if cache.exists() and not force_refresh:
        return json.loads(cache.read_text())

    try:
        client = _get_client()
        body = {
            "pipeline_version": "v1",
            "frequency": "monthly",
            "soft_horizon": horizon_months,
            "hard_horizon": max(3, horizon_months - 2),
            "backtest": True,
            "recency_factor": 0.6,
            "strictly_positive": True,
            "timeseries_metadata": {
                "title": INGREDIENT_TITLES[ingredient],
                "description": (
                    f"Monthly HICP index for {ingredient} in EU27, base 2015=100. "
                    "Source: Eurostat prc_hicp_midx."
                ),
                "keywords": keywords,
            },
            "timeseries": timeseries,
        }

        submit = client.submit_forecast(body)
        job = client.wait_forecast(submit.job_id, poll_s=10.0, timeout_s=600.0)

        if job.status != "completed":
            raise RuntimeError(f"Forecast job {submit.job_id} ended with status {job.status}")

        forecast_raw = json.loads(client.get_forecast_artifact(submit.job_id, "forecast.json"))
        signals_raw = json.loads(client.get_forecast_artifact(submit.job_id, "external_signals.json"))

        result = {"forecast": forecast_raw, "signals": signals_raw, "job_id": submit.job_id}
        cache.write_text(json.dumps(result, indent=2))
        return result

    except (ApiException, Exception) as exc:
        print(f"[sybilion_client] API error for {ingredient}: {exc} — falling back to mock")
        mock = _mock_path(ingredient)
        if mock.exists():
            return json.loads(mock.read_text())
        raise RuntimeError(f"No mock available for {ingredient}") from exc


def get_cached_forecast(ingredient: str) -> dict | None:
    cache = _cache_path(ingredient)
    if cache.exists():
        return json.loads(cache.read_text())
    mock = _mock_path(ingredient)
    if mock.exists():
        return json.loads(mock.read_text())
    return None
