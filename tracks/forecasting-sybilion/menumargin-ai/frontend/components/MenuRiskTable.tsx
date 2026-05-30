import { DishAnalysis, Recommendation } from "@/types/menu";

const RISK_CLASS: Record<string, string> = {
  ok: "badge-ok", medium: "badge-medium", high: "badge-high", critical: "badge-critical",
};

const ACTION_LABEL: Record<string, string> = {
  KEEP_PRICE:                  "Hold price",
  RAISE_PRICE_NOW:             "↑ Raise now",
  RAISE_PRICE_GRADUALLY:       "↑ Raise gradually",
  BUY_INGREDIENT_STOCK:        "Stock up",
  CHANGE_RECIPE:               "Adjust recipe",
  ACCEPT_TEMPORARY_MARGIN_DROP:"Accept dip",
  MANUAL_REVIEW:               "Review",
};

export function MenuRiskTable({
  dishes, recs, onSelectDish, selectedDish,
}: {
  dishes: DishAnalysis[];
  recs: Recommendation[];
  onSelectDish: (d: string) => void;
  selectedDish: string | null;
}) {
  const recMap = Object.fromEntries(recs.map((r) => [r.dish, r]));

  const col: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-muted)",
    fontSize: 13,
    color: "var(--text-2)",
    transition: "background 0.15s ease",
  };

  return (
    <div className="card fade-up fade-up-2" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--bg-hover)" }}>
            {["Dish", "Price", "Now", "Target", "Month 6", "Worst Case", "Risk", "Action"].map((h, i) => (
              <th
                key={h}
                style={{
                  ...col,
                  fontWeight: 500,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-3)",
                  textAlign: i === 0 ? "left" : i >= 5 ? "center" : "right",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dishes.map((d) => {
            const rec = recMap[d.dish];
            const sel = selectedDish === d.dish;
            const expBelowTarget = d.min_expected_margin < d.target_margin;
            const worstBelowTarget = d.min_worst_case_margin < d.target_margin;

            return (
              <tr
                key={d.dish}
                onClick={() => onSelectDish(d.dish)}
                style={{
                  background: sel ? "var(--bg-selected)" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Dish */}
                <td style={{ ...col, fontWeight: 500, color: "var(--text-1)", textAlign: "left" }}>
                  {d.dish}
                </td>
                {/* Price */}
                <td style={{ ...col, textAlign: "right" }} className="mono">
                  €{d.current_price.toFixed(2)}
                </td>
                {/* Current margin */}
                <td style={{ ...col, textAlign: "right" }} className="mono">
                  {(d.current_margin * 100).toFixed(1)}%
                </td>
                {/* Target */}
                <td style={{ ...col, textAlign: "right", color: "var(--text-3)" }} className="mono">
                  {(d.target_margin * 100).toFixed(0)}%
                </td>
                {/* Month 6 expected */}
                <td
                  style={{ ...col, textAlign: "right", fontWeight: 500, color: expBelowTarget ? "var(--high-fg)" : "var(--ok-fg)" }}
                  className="mono"
                >
                  {(d.min_expected_margin * 100).toFixed(1)}%
                </td>
                {/* Worst case */}
                <td
                  style={{ ...col, textAlign: "right", color: worstBelowTarget ? "var(--high-fg)" : "var(--text-3)" }}
                  className="mono"
                >
                  {(d.min_worst_case_margin * 100).toFixed(1)}%
                </td>
                {/* Risk badge */}
                <td style={{ ...col, textAlign: "center" }}>
                  <span className={`badge ${RISK_CLASS[d.risk_level] ?? ""}`}>
                    {d.risk_level}
                  </span>
                </td>
                {/* Action */}
                <td style={{ ...col, textAlign: "center", color: "var(--accent)", fontSize: 12, fontWeight: 500 }}>
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
