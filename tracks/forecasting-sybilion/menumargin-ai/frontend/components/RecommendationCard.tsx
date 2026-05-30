import { Recommendation } from "@/types/menu";

const ACTION_META: Record<string, { label: string; varFg: string; varBg: string }> = {
  KEEP_PRICE:                  { label: "Hold Price",       varFg: "--ok-fg",   varBg: "--ok-bg"   },
  RAISE_PRICE_NOW:             { label: "Raise Now",        varFg: "--crit-fg", varBg: "--crit-bg" },
  RAISE_PRICE_GRADUALLY:       { label: "Raise Gradually",  varFg: "--mid-fg",  varBg: "--mid-bg"  },
  BUY_INGREDIENT_STOCK:        { label: "Stock Up",         varFg: "--accent",  varBg: "--accent-light" },
  CHANGE_RECIPE:               { label: "Adjust Recipe",    varFg: "--mid-fg",  varBg: "--mid-bg"  },
  ACCEPT_TEMPORARY_MARGIN_DROP:{ label: "Accept Dip",       varFg: "--text-2",  varBg: "--bg-hover"},
  MANUAL_REVIEW:               { label: "Manual Review",    varFg: "--text-2",  varBg: "--bg-hover"},
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const meta = ACTION_META[rec.primary_action] ?? { label: rec.primary_action.replace(/_/g," "), varFg: "--text-2", varBg: "--bg-hover" };

  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2 }}>
            {rec.dish}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            Recommendation
          </p>
        </div>
        <span
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
            padding: "4px 12px", borderRadius: 99,
            background: `var(${meta.varBg})`,
            color: `var(${meta.varFg})`,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Price */}
      {rec.recommended_price !== rec.current_price && (
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden",
          }}
        >
          {[
            { label: "Current",     value: `€${rec.current_price.toFixed(2)}`,    accent: false },
            { label: "Required",    value: `€${rec.required_price.toFixed(2)}`,   accent: false },
            { label: "Recommended", value: `€${rec.recommended_price.toFixed(2)}`,accent: true  },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--bg-card)", padding: "12px 14px",
                display: "flex", flexDirection: "column", gap: 3,
              }}
            >
              <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {item.label}
              </span>
              <span
                className="mono display"
                style={{
                  fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em",
                  color: item.accent ? "var(--accent)" : "var(--text-1)",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Price plan */}
      {rec.price_plan.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Price Path
          </p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
              €{rec.current_price.toFixed(2)}
            </span>
            {rec.price_plan.map((step, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--border-strong, var(--text-3))", fontSize: 10 }}>→</span>
                <span
                  className="mono"
                  style={{
                    fontSize: 12, fontWeight: 500, color: "var(--accent)",
                    background: "var(--accent-light)", padding: "2px 7px", borderRadius: 6,
                  }}
                >
                  €{step.recommended_price.toFixed(2)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Procurement */}
      {rec.procurement_ingredients.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Buy Early
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {rec.procurement_ingredients.map((ing) => (
              <span
                key={ing}
                style={{
                  fontSize: 12, padding: "3px 10px", borderRadius: 99,
                  background: "var(--accent-light)", color: "var(--accent)",
                  border: "1px solid var(--accent)",
                }}
              >
                {ing.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recipe */}
      {rec.recipe_adjustments.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Recipe
          </p>
          {rec.recipe_adjustments.map((adj, i) => (
            <p key={i} style={{ fontSize: 12, color: "var(--mid-fg)" }}>{adj}</p>
          ))}
        </div>
      )}
    </div>
  );
}
