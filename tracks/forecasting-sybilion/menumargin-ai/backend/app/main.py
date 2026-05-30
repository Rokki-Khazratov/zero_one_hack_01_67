from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import dataset, forecast, menu, recommendations, scenario, ingredients, dishes

app = FastAPI(title="MenuMargin AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset.router)
app.include_router(forecast.router)
app.include_router(menu.router)
app.include_router(recommendations.router)
app.include_router(scenario.router)
app.include_router(ingredients.router)
app.include_router(dishes.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "menumargin-ai"}
