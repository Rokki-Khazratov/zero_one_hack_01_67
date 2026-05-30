import { DishAnalysis, Recommendation } from "@/types/menu";

const RISK_BADGE: Record<string, string> = {
  ok:       "bg-green-900/60 text-green-300",
  medium:   "bg-yellow-900/60 text-yellow-300",
  high:     "bg-orange-900/60 text-orange-300",
  critical: "bg-red-900/60 text-red-300",
};

const ACTION_LABEL: Record<string, string> = {
  KEEP_PRICE:                  "Keep Price",
  RAISE_PRICE_NOW:             "↑ Raise Now",
  RAISE_PRICE_GRADUALLY:       "↑ Raise Gradually",
  BUY_INGREDIENT_STOCK:        "📦 Buy Stock",
  CHANGE_RECIPE:               "🍴 Change Recipe",
  ACCEPT_TEMPORARY_MARGIN_DROP:"⏳ Accept Drop",
  MANUAL_REVIEW:               "⚠ Manual Review",
};

export function MenuRiskTable({
  dishes,
  recs,
  onSelectDish,
  selectedDish,
}: {
  dishes: DishAnalysis[];
  recs: Recommendation[];
  onSelectDish: (dish: string) => void;
  selectedDish: string | null;
}) {
  const recMap = Object.fromEntries(recs.map((r) => [r.dish, r]));

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Dish</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Current Margin</th>
            <th className="px-4 py-3 text-right">Target</th>
            <th className="px-4 py-3 text-right">Month 6 (exp)</th>
            <th className="px-4 py-3 text-right">Worst Case</th>
            <th className="px-4 py-3 text-center">Risk</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {dishes.map((d) => {
            const rec = recMap[d.dish];
            const isSelected = selectedDish === d.dish;
            return (
              <tr
                key={d.dish}
                onClick={() => onSelectDish(d.dish)}
                className={`border-t border-zinc-800 cursor-pointer transition-colors
                  ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-900/60"}`}
              >
                <td className="px-4 py-3 font-medium text-white">{d.dish}</td>
                <td className="px-4 py-3 text-right text-zinc-300">€{d.current_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{(d.current_margin * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-zinc-500">{(d.target_margin * 100).toFixed(0)}%</td>
                <td className={`px-4 py-3 text-right font-medium ${d.min_expected_margin < d.target_margin ? "text-red-400" : "text-green-400"}`}>
                  {(d.min_expected_margin * 100).toFixed(1)}%
                </td>
                <td className={`px-4 py-3 text-right ${d.min_worst_case_margin < d.target_margin ? "text-red-400" : "text-zinc-400"}`}>
                  {(d.min_worst_case_margin * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_BADGE[d.risk_level] ?? ""}`}>
                    {d.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-300 text-xs">
                  {rec ? ACTION_LABEL[rec.primary_action] ?? rec.primary_action : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
