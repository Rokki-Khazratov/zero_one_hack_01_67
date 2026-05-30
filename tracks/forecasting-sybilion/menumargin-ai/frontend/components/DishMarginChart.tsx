"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid, Legend,
} from "recharts";
import { DishAnalysis } from "@/types/menu";

export function DishMarginChart({ dish }: { dish: DishAnalysis }) {
  const data = dish.month_margins.map((m) => ({
    month: m.month,
    expected: +(m.expected_margin * 100).toFixed(2),
    worst:    +(m.worst_case_margin * 100).toFixed(2),
    best:     +(m.best_case_margin * 100).toFixed(2),
  }));

  const targetPct = +(dish.target_margin * 100).toFixed(1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{dish.dish} — Margin Forecast</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickLine={false}
            width={45}
          />
          <Tooltip
            formatter={(v: number) => `${v.toFixed(1)}%`}
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
          <ReferenceLine y={targetPct} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Target ${targetPct}%`, fill: "#ef4444", fontSize: 10 }} />
          <Line dataKey="best"     stroke="#22c55e" dot={false} strokeWidth={1.5} name="Best case" />
          <Line dataKey="expected" stroke="#f97316" dot={false} strokeWidth={2}   name="Expected" />
          <Line dataKey="worst"    stroke="#ef4444" dot={false} strokeWidth={1.5} strokeDasharray="3 2" name="Worst case" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
