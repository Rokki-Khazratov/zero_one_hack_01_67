from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.dish_db import (
    list_dishes, get_dish, create_dish, update_dish, delete_dish,
    calculate_dish_cost, calculate_dish_forecast,
)

router = APIRouter(prefix="/api/dishes")


class IngredientRow(BaseModel):
    ingredient_id: str
    grams:         float


class DishCreate(BaseModel):
    name:              str
    current_price_eur: float = 12.0
    target_margin:     float = 0.65
    ingredients:       list[IngredientRow] = []


class DishUpdate(BaseModel):
    name:              Optional[str]             = None
    current_price_eur: Optional[float]           = None
    target_margin:     Optional[float]           = None
    ingredients:       Optional[list[IngredientRow]] = None


@router.get("")
def get_dishes():
    return {"dishes": list_dishes(with_cost=True)}


@router.get("/{dish_id}")
def get_dish_endpoint(dish_id: str):
    dish = get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail=f"Dish '{dish_id}' not found")
    cost = calculate_dish_cost(dish)
    forecast = calculate_dish_forecast(dish)
    return {**dish, "cost_info": cost, "forecast": forecast}


@router.post("", status_code=201)
def create_dish_endpoint(data: DishCreate):
    payload = data.model_dump()
    payload["ingredients"] = [r.model_dump() for r in data.ingredients]
    return create_dish(payload)


@router.patch("/{dish_id}")
def update_dish_endpoint(dish_id: str, data: DishUpdate):
    payload = data.model_dump(exclude_none=True)
    if "ingredients" in payload:
        payload["ingredients"] = [r.model_dump() for r in data.ingredients]
    try:
        return update_dish(dish_id, payload)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{dish_id}", status_code=204)
def delete_dish_endpoint(dish_id: str):
    if not delete_dish(dish_id):
        raise HTTPException(status_code=404, detail=f"Dish '{dish_id}' not found")


@router.get("/{dish_id}/cost")
def get_dish_cost(dish_id: str):
    dish = get_dish(dish_id)
    if not dish:
        raise HTTPException(status_code=404, detail=f"Dish '{dish_id}' not found")
    cost = calculate_dish_cost(dish)
    forecast = calculate_dish_forecast(dish)
    return {
        "dish_id":   dish_id,
        "dish_name": dish["name"],
        "cost_info": cost,
        "forecast":  forecast,
    }
