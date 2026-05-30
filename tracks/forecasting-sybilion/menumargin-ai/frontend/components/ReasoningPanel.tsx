import { Recommendation, ScenarioResult } from "@/types/menu";

export function ReasoningPanel({ recs, scenario }: { recs: Recommendation[]; scenario: ScenarioResult | null }) {
  return (
    <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2 }}>
          Reasoning
        </h3>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Agent decision log</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recs.map((rec, i) => (
          <div
            key={rec.dish}
            style={{
              paddingLeft: 14,
              borderLeft: `2px solid ${rec.risk_level === "critical" ? "var(--crit-fg)" : rec.risk_level === "high" ? "var(--high-fg)" : rec.risk_level === "medium" ? "var(--mid-fg)" : "var(--ok-fg)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{rec.dish}</span>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
                {rec.primary_action.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{rec.reasoning}</p>
          </div>
        ))}
      </div>

      {scenario && (
        <div
          style={{
            marginTop: 4, paddingTop: 16,
            borderTop: "1px solid var(--border)",
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mid-fg)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mid-fg)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Scenario Adaptation
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{scenario.summary}</p>

          {scenario.comparisons.filter((c) => c.old_action !== c.new_action).map((c) => (
            <div
              key={c.dish}
              style={{
                padding: "10px 14px", borderRadius: 8,
                background: "var(--bg-hover)", border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)" }}>{c.dish}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ color: "var(--text-3)", textDecoration: "line-through" }}>
                    {c.old_action.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span style={{ color: "var(--text-3)" }}>→</span>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                    {c.new_action.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{c.why_changed}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
