from fastapi import APIRouter, HTTPException
from ..services.strategy_agent import run_strategy

router = APIRouter()


@router.post("/api/strategy/run")
def run_strategy_endpoint():
    """Run the full strategy agent: procurement + pricing + workflow log."""
    try:
        return run_strategy()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
