from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from ..services.ingredient_db import (
    list_ingredients, get_ingredient, create_ingredient,
    update_ingredient, delete_ingredient, mark_forecast_available, get_catalog,
)

router = APIRouter(prefix="/api/ingredients")


class IngredientCreate(BaseModel):
    id:                    Optional[str]   = None
    name:                  str
    coicop:                Optional[str]   = None
    category:              Optional[str]   = None
    current_price_eur_kg:  float           = 5.0
    unit:                  str             = "kg"
    geo:                   str             = "EU27_2020"
    notes:                 str             = ""


class IngredientUpdate(BaseModel):
    name:                  Optional[str]   = None
    current_price_eur_kg:  Optional[float] = None
    coicop:                Optional[str]   = None
    category:              Optional[str]   = None
    unit:                  Optional[str]   = None
    geo:                   Optional[str]   = None
    notes:                 Optional[str]   = None


def _fetch_price_history(ing_id: str):
    """Background task: fetch Eurostat price history for this ingredient."""
    try:
        from ..services.ingredient_db import get_ingredient, CATALOG_BY_ID
        from ..services.eurostat_fetcher import fetch_ingredient_series
        from ..services.price_reconstructor import reconstruct_prices
        import pandas as pd
        from pathlib import Path

        ing = get_ingredient(ing_id)
        if not ing or not ing.get("coicop"):
            return

        # Only fetch if this ingredient is in our known COICOP mapping
        if ing_id not in CATALOG_BY_ID:
            return

        df = fetch_ingredient_series(ing_id, ing.get("geo", "EU27_2020"))
        prices_df = reconstruct_prices(df, ing_id)

        # Save per-ingredient file
        out = Path(__file__).parent.parent.parent.parent / "data" / "processed" / f"{ing_id}_prices.csv"
        prices_df.to_csv(out, index=False)

        mark_forecast_available(ing_id)
        print(f"[bg] fetched price history for {ing_id}: {len(df)} rows")
    except Exception as e:
        print(f"[bg] failed to fetch history for {ing_id}: {e}")


@router.get("")
def get_ingredients():
    return {"ingredients": list_ingredients()}


@router.get("/catalog")
def get_catalog_endpoint():
    return {"catalog": get_catalog()}


@router.get("/{ing_id}")
def get_ingredient_endpoint(ing_id: str):
    ing = get_ingredient(ing_id)
    if not ing:
        raise HTTPException(status_code=404, detail=f"Ingredient '{ing_id}' not found")
    return ing


@router.post("", status_code=201)
def create_ingredient_endpoint(data: IngredientCreate, bg: BackgroundTasks):
    try:
        ing = create_ingredient(data.model_dump())
        # Trigger price history fetch in background
        bg.add_task(_fetch_price_history, ing["id"])
        return ing
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/{ing_id}")
def update_ingredient_endpoint(ing_id: str, data: IngredientUpdate):
    try:
        return update_ingredient(ing_id, data.model_dump(exclude_none=True))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{ing_id}", status_code=204)
def delete_ingredient_endpoint(ing_id: str):
    if not delete_ingredient(ing_id):
        raise HTTPException(status_code=404, detail=f"Ingredient '{ing_id}' not found")


@router.post("/{ing_id}/fetch-history")
def trigger_fetch_history(ing_id: str, bg: BackgroundTasks):
    ing = get_ingredient(ing_id)
    if not ing:
        raise HTTPException(status_code=404, detail=f"Ingredient '{ing_id}' not found")
    bg.add_task(_fetch_price_history, ing_id)
    return {"status": "fetching", "ingredient": ing_id}
