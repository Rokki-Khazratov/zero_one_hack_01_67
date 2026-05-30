import { MenuSummary } from "@/types/menu";

const RISK_COLOR = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: MenuSummary }) {
  const dropPct = (summary.average_margin_drop * 100).toFixed(1);
  const dropColor = summary.average_margin_drop < 0 ? "text-red-400" : "text-green-400";
  const riskIng = summary.highest_risk_ingredient.replace("_", " ");

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card label="Dishes at Risk" value={String(summary.dishes_at_risk)} sub={`of ${summary.total_dishes} total`} accent="text-orange-400" />
      <Card label="Critical" value={String(summary.critical_dishes)} accent="text-red-400" />
      <Card label="Avg Margin Drop" value={`${dropPct}%`} accent={dropColor} />
      <Card label="Top Risk Ingredient" value={riskIng} accent="text-yellow-300" />
      <Card label="Total Dishes" value={String(summary.total_dishes)} />
    </div>
  );
}
