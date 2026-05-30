from fastapi import APIRouter
from ..services.schemas_helpers import load_recipes, load_menu, load_current_price

router = APIRouter()

INGREDIENTS = ["pasta", "tomatoes", "cheese", "olive_oil", "eggs", "flour"]


@router.get("/api/dataset/demo")
def get_demo_dataset():
    menu = load_menu().to_dict(orient="records")
    recipes = load_recipes().to_dict(orient="records")
    current_prices = {ing: load_current_price(ing) for ing in INGREDIENTS}
    return {
        "restaurant": "Italian Bistro",
        "menu": menu,
        "recipes": recipes,
        "current_prices": current_prices,
        "ingredients": INGREDIENTS,
    }
