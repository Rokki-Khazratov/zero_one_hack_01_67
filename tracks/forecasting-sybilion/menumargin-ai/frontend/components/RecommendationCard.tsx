import { Recommendation } from "@/types/menu";

const ACTION_STYLE: Record<string, string> = {
  KEEP_PRICE:                  "bg-green-900/30 text-green-300 border-green-800",
  RAISE_PRICE_NOW:             "bg-red-900/30 text-red-300 border-red-800",
  RAISE_PRICE_GRADUALLY:       "bg-orange-900/30 text-orange-300 border-orange-800",
  BUY_INGREDIENT_STOCK:        "bg-blue-900/30 text-blue-300 border-blue-800",
  CHANGE_RECIPE:               "bg-purple-900/30 text-purple-300 border-purple-800",
  ACCEPT_TEMPORARY_MARGIN_DROP:"bg-yellow-900/30 text-yellow-300 border-yellow-800",
  MANUAL_REVIEW:               "bg-zinc-800 text-zinc-300 border-zinc-700",
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const style = ACTION_STYLE[rec.primary_action] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{rec.dish}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Current €{rec.current_price.toFixed(2)}</p>
        </div>
        <span className={`border rounded-full px-3 py-1 text-xs font-medium ${style}`}>
          {rec.primary_action.replace(/_/g, " ")}
        </span>
      </div>

      {rec.recommended_price !== rec.current_price && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-zinc-500 text-xs">Required</span>
            <p className="text-white font-medium">€{rec.required_price.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Recommended</span>
            <p className="text-orange-300 font-bold">€{rec.recommended_price.toFixed(2)}</p>
          </div>
        </div>
      )}

      {rec.price_plan.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Price Plan</p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
              Now €{rec.current_price.toFixed(2)}
            </span>
            {rec.price_plan.map((step, i) => (
              <span key={i} className="text-xs bg-zinc-800 text-orange-300 px-2 py-1 rounded">
                {step.month} → €{step.recommended_price.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {rec.procurement_ingredients.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Buy Stock Early</p>
          <div className="flex gap-2">
            {rec.procurement_ingredients.map((ing) => (
              <span key={ing} className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                {ing.replace("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {rec.recipe_adjustments.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Recipe</p>
          {rec.recipe_adjustments.map((adj, i) => (
            <p key={i} className="text-xs text-purple-300">{adj}</p>
          ))}
        </div>
      )}
    </div>
  );
}
