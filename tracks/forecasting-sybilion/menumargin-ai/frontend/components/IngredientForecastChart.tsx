"use client";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";
import { IngredientForecast } from "@/types/menu";

export function IngredientForecastChart({
  forecast,
  historicalPrices,
}: {
  forecast: IngredientForecast;
  historicalPrices?: { date: string; price_per_kg: number }[];
}) {
  const histData = (historicalPrices ?? []).map((p) => ({
    date: p.date.slice(0, 7),
    historical: +p.price_per_kg.toFixed(3),
  }));

  const fcData = forecast.forecast.map((p) => ({
    date: p.month,
    median: +p.median.toFixed(3),
    band: [+p.lower_band.toFixed(3), +p.upper_band.toFixed(3)],
    lower_band: +p.lower_band.toFixed(3),
    upper_band: +p.upper_band.toFixed(3),
  }));

  // Combine: show last 12 months history + forecast
  const lastHist = histData.slice(-12);
  const all = [
    ...lastHist.map((d) => ({ ...d, median: undefined, lower_band: undefined, upper_band: undefined })),
    ...fcData.map((d) => ({ ...d, historical: undefined })),
  ];

  const name = forecast.ingredient.replace("_", " ");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white capitalize">{name}</h3>
        <span className="text-xs text-zinc-500">€{forecast.current_price_per_kg.toFixed(2)}/kg current</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={all}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} width={45} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Area dataKey="upper_band" stroke="none" fill="#f97316" fillOpacity={0.15} name="Upper band" />
          <Area dataKey="lower_band" stroke="none" fill="#18181b" fillOpacity={1} name="Lower band" />
          <Line dataKey="historical" stroke="#60a5fa" dot={false} strokeWidth={2} name="Historical" />
          <Line dataKey="median" stroke="#f97316" dot={false} strokeWidth={2} strokeDasharray="4 2" name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
      {forecast.drivers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {forecast.drivers.slice(0, 3).map((d) => (
            <span key={d.driver_name} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {d.driver_name.length > 30 ? d.driver_name.slice(0, 30) + "…" : d.driver_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
