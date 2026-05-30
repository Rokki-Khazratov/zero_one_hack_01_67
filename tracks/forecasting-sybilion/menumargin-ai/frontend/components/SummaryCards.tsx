import { MenuSummary } from "@/types/menu";

function MetricCard({
  value, label, sub, accentVar, delay,
}: {
  value: string; label: string; sub?: string; accentVar?: string; delay?: number;
}) {
  return (
    <div
      className="card fade-up"
      style={{ padding: "20px 24px 18px", animationDelay: `${delay ?? 0}ms`, display: "flex", flexDirection: "column", gap: 4 }}
    >
      <span className="section-label">{label}</span>
      <span
        className="display"
        style={{ fontSize: 38, fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.02em", color: accentVar ? `var(${accentVar})` : "var(--text-1)", marginTop: 4 }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: MenuSummary }) {
  const drop = (summary.average_margin_drop * 100).toFixed(1);
  const dropNeg = summary.average_margin_drop < 0;
  const ing = summary.highest_risk_ingredient.replace(/_/g, " ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      <MetricCard
        label="Dishes at Risk"
        value={`${summary.dishes_at_risk} / ${summary.total_dishes}`}
        sub="of total menu"
        accentVar={summary.dishes_at_risk > 0 ? "--high-fg" : "--ok-fg"}
        delay={0}
      />
      <MetricCard
        label="Critical"
        value={String(summary.critical_dishes)}
        sub={summary.critical_dishes > 0 ? "immediate action" : "none critical"}
        accentVar={summary.critical_dishes > 0 ? "--crit-fg" : "--text-2"}
        delay={50}
      />
      <MetricCard
        label="Avg Margin Shift"
        value={`${dropNeg ? "−" : "+"}${Math.abs(Number(drop))}%`}
        sub="vs target"
        accentVar={dropNeg ? "--high-fg" : "--ok-fg"}
        delay={100}
      />
      <MetricCard
        label="Highest Risk Ingredient"
        value={ing}
        sub="monitor closely"
        accentVar="--accent"
        delay={150}
      />
    </div>
  );
}
