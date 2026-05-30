import { Recommendation } from "@/types/menu";
import { ScenarioResult } from "@/types/menu";

export function ReasoningPanel({
  recs,
  scenario,
}: {
  recs: Recommendation[];
  scenario: ScenarioResult | null;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">Agent Reasoning</h3>

      {recs.map((rec) => (
        <div key={rec.dish} className="border-l-2 border-zinc-700 pl-3 space-y-1">
          <p className="text-xs font-medium text-zinc-300">{rec.dish}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">{rec.reasoning}</p>
        </div>
      ))}

      {scenario && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs font-medium text-yellow-400 mb-2">Scenario Adaptation</p>
          <p className="text-xs text-zinc-400 mb-3">{scenario.summary}</p>
          {scenario.comparisons.map((c) => (
            <div key={c.dish} className="border-l-2 border-yellow-800 pl-3 mb-3 space-y-1">
              <p className="text-xs font-medium text-zinc-300">{c.dish}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500 line-through">{c.old_action.replace(/_/g," ")}</span>
                <span className="text-orange-300">→ {c.new_action.replace(/_/g," ")}</span>
              </div>
              <p className="text-xs text-zinc-500">{c.why_changed}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
