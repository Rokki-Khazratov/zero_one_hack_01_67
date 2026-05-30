# MenuMargin AI — CLAUDE.md

## What this project is

Decision-support agent for restaurants (hackathon, Forecasting AI track).
Given ingredient price history → forecasts costs via Sybilion API → calculates dish margins → recommends actions.

Demo: Italian Bistro, 3 dishes (Margherita Pizza, Pasta Pomodoro, Carbonara), 6 ingredients.

## Repo layout

```
menumargin-ai/
  backend/
    app/
      main.py               ← FastAPI entry point (uvicorn app.main:app)
      api/                  ← 5 routers: dataset, forecast, menu, recommendations, scenario
      services/             ← all business logic
      models/schemas.py     ← Pydantic models
    requirements.txt
  frontend/                 ← Next.js 15 + Tailwind + Recharts
    app/page.tsx            ← single-page dashboard
    components/             ← 7 components
    lib/api.ts              ← backend API calls
    types/menu.ts           ← TypeScript types
  data/
    config/                 ← ingredient_sources.csv, ingredient_keywords.json
    current_prices.csv      ← manual price anchors (€/kg)
    demo/                   ← recipes.csv, menu.csv
    processed/              ← ingredient_prices.csv (generated)
    cache/                  ← Sybilion forecast JSON (generated)
    mock/                   ← mock fallback JSON
  .env                      ← SYBILION_API_KEY
```

## Running locally

### Backend

```bash
cd backend
pip install -r requirements.txt
# Set env var: SYBILION_API_TOKEN = value from .env SYBILION_API_KEY
export SYBILION_API_TOKEN=sk_ops_...
uvicorn app.main:app --reload --port 8000
```

First run — fetch data and trigger forecasts:
```bash
curl -X POST http://localhost:8000/api/forecast/run
```

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open http://localhost:3000

## Key env vars

| Var | Where | Notes |
|---|---|---|
| `SYBILION_API_TOKEN` | shell / .env | Sybilion SDK reads this |
| `NEXT_PUBLIC_API_URL` | frontend .env.local | default: http://localhost:8000 |

## API endpoints

| Method | Path | What |
|---|---|---|
| GET | /api/dataset/demo | Demo restaurant data |
| POST | /api/forecast/run | Fetch Eurostat + run Sybilion for all ingredients |
| GET | /api/forecast/latest | Return cached normalized forecasts |
| POST | /api/menu/analyze | Dish cost + margin analysis |
| POST | /api/recommendations/generate | Actions per dish |
| POST | /api/scenario/simulate | Re-run with changed business assumptions |

## Data flow

```
Eurostat HICP → eurostat_fetcher.py → index series (YYYY-MM-01: float)
                                     ↓
                             price_reconstructor.py → €/kg history
                                     ↓
                              sybilion_client.py → Sybilion API → cache
                                     ↓
                            forecast_normalizer.py → normalized forecast
                                     ↓
               dish_cost_engine.py + margin_engine.py → margin risk
                                     ↓
                        recommendation_engine.py → actions + reasoning
                                     ↓
                           scenario_engine.py → scenario adaptation
```

## Important notes

- Sybilion SDK reads `SYBILION_API_TOKEN` (not `SYBILION_API_KEY`)
- Cache lives in `data/cache/`. Delete files to force re-run
- Mock fallback in `data/mock/` — if cache + API both fail
- Need 60+ monthly points for 6-month forecast (we have 109 from Eurostat)
- Sybilion job takes ~1-3 min per ingredient

## Branch strategy

- `main` — stable, integrated
- `bek` — backend development (this branch)
- `feature/data-connector` — Vova's Eurostat connector (merged)
