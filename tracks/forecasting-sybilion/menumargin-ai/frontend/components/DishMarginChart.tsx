"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";
import { DishAnalysis } from "@/types/menu";
import { useTheme } from "@/contexts/ThemeContext";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "10px 14px", boxShadow: "var(--shadow-lg)", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-3)", marginBottom: 6, fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: p.color }}>
          <span style={{ color: "var(--text-2)" }}>{p.name}</span>
          <span className="mono" style={{ fontWeight: 500 }}>{p.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function DishMarginChart({ dish }: { dish: DishAnalysis }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = dish.month_margins.map((m) => ({
    month: m.month.slice(0, 7),
    Expected:   +(m.expected_margin   * 100).toFixed(2),
    Worst:      +(m.worst_case_margin * 100).toFixed(2),
    Best:       +(m.best_case_margin  * 100).toFixed(2),
  }));
  const targetPct = +(dish.target_margin * 100).toFixed(1);
  const gridColor  = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const axisColor  = isDark ? "#5A5550" : "#A8A39A";

  return (
    <div className="card" style={{ padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2 }}>
            {dish.dish}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Margin forecast · 6 months</p>
        </div>
        <span className={`badge badge-${dish.risk_level}`}>{dish.risk_level}</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: axisColor }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={targetPct}
            stroke="var(--chart-ref)"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: `${targetPct}%`, fill: "var(--chart-ref)", fontSize: 9, position: "right" }}
          />
          <Line dataKey="Best"     stroke="var(--ok-fg)"   dot={false} strokeWidth={1.5} strokeOpacity={0.6} />
          <Line dataKey="Expected" stroke="var(--accent)"  dot={false} strokeWidth={2} />
          <Line dataKey="Worst"    stroke="var(--high-fg)" dot={false} strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.7} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {[
          { color: "var(--ok-fg)", label: "Best" },
          { color: "var(--accent)", label: "Expected" },
          { color: "var(--high-fg)", label: "Worst" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 16, height: 2, background: color, display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
          <span style={{ width: 16, height: 1, background: "var(--chart-ref)", display: "inline-block", borderRadius: 1, borderTop: "1px dashed var(--chart-ref)" }} />
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>Target {targetPct}%</span>
        </div>
      </div>
    </div>
  );
}
