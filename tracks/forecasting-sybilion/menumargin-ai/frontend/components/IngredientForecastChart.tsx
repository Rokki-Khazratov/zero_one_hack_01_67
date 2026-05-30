"use client";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { IngredientForecast } from "@/types/menu";
import { useTheme } from "@/contexts/ThemeContext";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const relevant = payload.filter((p) => p.value != null && p.name !== "Band");
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "10px 14px", boxShadow: "var(--shadow-lg)", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-3)", marginBottom: 6, fontSize: 11 }}>{label}</p>
      {relevant.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--text-2)" }}>{p.name}</span>
          <span className="mono" style={{ fontWeight: 500, color: "var(--text-1)" }}>
            €{typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function IngredientForecastChart({
  forecast,
  historicalPrices,
}: {
  forecast: IngredientForecast;
  historicalPrices?: { date: string; price_per_kg: number }[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const axisColor = isDark ? "#5A5550" : "#A8A39A";

  const histData = (historicalPrices ?? []).map((p) => ({
    date: p.date.slice(0, 7),
    Historical: +p.price_per_kg.toFixed(2),
  }));

  const fcData = forecast.forecast.map((p) => ({
    date: p.month,
    Forecast:   +p.median.toFixed(2),
    lower_band: +p.lower_band.toFixed(2),
    upper_band: +p.upper_band.toFixed(2),
  }));

  const lastHist = histData.slice(-12);
  const all = [
    ...lastHist.map((d) => ({ ...d, Forecast: undefined, lower_band: undefined, upper_band: undefined })),
    ...fcData.map((d) => ({ ...d, Historical: undefined })),
  ];

  const name = forecast.ingredient.replace(/_/g, " ");
  const lastFc = forecast.forecast[forecast.forecast.length - 1];
  const priceDelta = lastFc ? ((lastFc.median - forecast.current_price_per_kg) / forecast.current_price_per_kg * 100) : 0;
  const deltaPositive = priceDelta >= 0;

  return (
    <div className="card" style={{ padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3
            className="display"
            style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)", lineHeight: 1.2, textTransform: "capitalize" }}
          >
            {name}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            <span className="mono">€{forecast.current_price_per_kg.toFixed(2)}/kg</span> current
          </p>
        </div>
        {lastFc && (
          <div style={{ textAlign: "right" }}>
            <span className="mono" style={{ fontSize: 16, fontWeight: 500, color: deltaPositive ? "var(--high-fg)" : "var(--ok-fg)" }}>
              {deltaPositive ? "+" : ""}{priceDelta.toFixed(1)}%
            </span>
            <p style={{ fontSize: 10, color: "var(--text-3)" }}>6-month outlook</p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={all} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: axisColor }}
            tickFormatter={(v) => `€${v}`}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="upper_band"
            stroke="none"
            fill="var(--chart-forecast)"
            fillOpacity={0.12}
            name="Band"
          />
          <Area
            dataKey="lower_band"
            stroke="none"
            fill="var(--bg-card)"
            fillOpacity={1}
            name="Band"
          />
          <Line
            dataKey="Historical"
            stroke="var(--chart-hist)"
            dot={false}
            strokeWidth={2}
            name="Historical"
          />
          <Line
            dataKey="Forecast"
            stroke="var(--chart-forecast)"
            dot={false}
            strokeWidth={2}
            strokeDasharray="5 3"
            name="Forecast"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {forecast.drivers.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Drivers:
          </span>
          {forecast.drivers.slice(0, 3).map((d) => (
            <span
              key={d.driver_name}
              style={{
                fontSize: 11, background: "var(--bg-hover)", color: "var(--text-2)",
                padding: "2px 8px", borderRadius: 99, border: "1px solid var(--border)",
              }}
            >
              {d.driver_name.length > 28 ? d.driver_name.slice(0, 28) + "…" : d.driver_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
