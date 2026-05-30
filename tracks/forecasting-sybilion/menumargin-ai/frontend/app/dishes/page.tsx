"use client";
import { useEffect, useState } from "react";
import {
  getDishes, getIngredients, createDish, updateDish, deleteDish,
} from "@/lib/api";
import { Dish, Ingredient, IngredientRow, DishCostInfo } from "@/types/crud";
import { Navigation } from "@/components/Navigation";

const RISK_BADGE: Record<string, string> = {
  ok: "badge-ok", medium: "badge-medium", high: "badge-high", critical: "badge-critical",
};

// ── Dish form ─────────────────────────────────────────────────────────
function DishForm({
  initial,
  ingredients,
  onSave,
  onCancel,
}: {
  initial?: Partial<Dish>;
  ingredients: Ingredient[];
  onSave: (data: Partial<Dish>) => void;
  onCancel: () => void;
}) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [price, setPrice]     = useState(String(initial?.current_price_eur ?? 12));
  const [margin, setMargin]   = useState(String((initial?.target_margin ?? 0.65) * 100));
  const [rows, setRows]       = useState<IngredientRow[]>(initial?.ingredients ?? []);
  const [adding, setAdding]   = useState<{ ing_id: string; grams: string }>({ ing_id: "", grams: "" });

  function addRow() {
    if (!adding.ing_id || !adding.grams) return;
    setRows((prev) => [...prev, { ingredient_id: adding.ing_id, grams: parseFloat(adding.grams) }]);
    setAdding({ ing_id: "", grams: "" });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      current_price_eur: parseFloat(price) || 12,
      target_margin: parseFloat(margin) / 100 || 0.65,
      ingredients: rows,
    });
  }

  const ingMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));
  const usedIds = new Set(rows.map((r) => r.ingredient_id));

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: 560, maxHeight: "85vh", overflow: "auto", padding: "24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="display" style={{ fontSize: 20, fontWeight: 400, color: "var(--text-1)", marginBottom: 20 }}>
          {initial?.id ? "Edit Dish" : "New Dish"}
        </h3>

        {/* Basic info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Dish name", value: name, set: setName, type: "text" },
            { label: "Menu price €", value: price, set: setPrice, type: "number" },
            { label: "Target margin %", value: margin, set: setMargin, type: "number" },
          ].map(({ label, value, set, type }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                style={{
                  padding: "7px 10px", borderRadius: 8, fontSize: 13,
                  border: "1px solid var(--border)", background: "var(--bg-hover)",
                  color: "var(--text-1)", outline: "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Ingredients */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Ingredients
          </p>

          {rows.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>No ingredients yet.</p>
          )}

          {rows.map((row, idx) => {
            const ing = ingMap[row.ingredient_id];
            return (
              <div key={idx} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", background: "var(--bg-hover)",
                borderRadius: 8, marginBottom: 4,
              }}>
                <span style={{ fontSize: 13, color: "var(--text-1)" }}>
                  {ing?.name ?? row.ingredient_id}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>{row.grams}g</span>
                  {ing && (
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      €{(ing.current_price_eur_kg * row.grams / 1000).toFixed(2)}
                    </span>
                  )}
                  <button
                    onClick={() => removeRow(idx)}
                    style={{ fontSize: 11, padding: "2px 6px", borderRadius: 5, cursor: "pointer", border: "none", background: "var(--high-bg)", color: "var(--high-fg)" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add row */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <select
              value={adding.ing_id}
              onChange={(e) => setAdding((p) => ({ ...p, ing_id: e.target.value }))}
              style={{
                flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 13,
                border: "1px solid var(--border)", background: "var(--bg-hover)", color: "var(--text-1)",
              }}
            >
              <option value="">Select ingredient…</option>
              {ingredients.filter((i) => !usedIds.has(i.id)).map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="grams"
              value={adding.grams}
              onChange={(e) => setAdding((p) => ({ ...p, grams: e.target.value }))}
              style={{
                width: 80, padding: "7px 10px", borderRadius: 8, fontSize: 13,
                border: "1px solid var(--border)", background: "var(--bg-hover)", color: "var(--text-1)",
                outline: "none",
              }}
            />
            <button
              onClick={addRow}
              disabled={!adding.ing_id || !adding.grams}
              style={{
                padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                background: "var(--accent)", color: "#fff", border: "none", fontSize: 13,
              }}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Live cost preview */}
        {rows.length > 0 && (() => {
          const totalCost = rows.reduce((sum, r) => {
            const p = ingMap[r.ingredient_id]?.current_price_eur_kg ?? 5;
            return sum + p * r.grams / 1000;
          }, 0);
          const mp = parseFloat(price) || 12;
          const margin_val = (mp - totalCost) / mp;
          const target = parseFloat(margin) / 100 || 0.65;
          return (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1, background: "var(--border)", borderRadius: 10,
              overflow: "hidden", marginBottom: 20,
            }}>
              {[
                { label: "Ingredient Cost", value: `€${totalCost.toFixed(2)}`, accent: false },
                { label: "Current Margin", value: `${(margin_val * 100).toFixed(1)}%`, accent: margin_val < target },
                { label: "Target", value: `${(target * 100).toFixed(0)}%`, accent: false },
              ].map((cell) => (
                <div key={cell.label} style={{ background: "var(--bg-card)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>
                    {cell.label}
                  </p>
                  <p className="mono display" style={{ fontSize: 18, fontWeight: 400, color: cell.accent ? "var(--high-fg)" : "var(--text-1)" }}>
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, cursor: "pointer", background: "var(--bg-hover)", color: "var(--text-2)", border: "1px solid var(--border)", fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{ padding: "9px 20px", borderRadius: 8, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 500 }}
          >
            {initial?.id ? "Save Changes" : "Create Dish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cost breakdown row ────────────────────────────────────────────────
function CostBreakdown({ cost, ingredientMap }: { cost: DishCostInfo; ingredientMap: Record<string, Ingredient> }) {
  return (
    <div style={{ padding: "10px 14px", background: "var(--bg-hover)", borderRadius: 8 }}>
      <p style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        Cost Breakdown
      </p>
      {cost.ingredient_costs.map((row) => {
        const ing = ingredientMap[row.ingredient_id];
        return (
          <div key={row.ingredient_id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 48, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${row.share_pct}%`, height: "100%", background: "var(--accent)" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>{ing?.name ?? row.ingredient_id}</span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-2)" }}>
              <span className="mono">{row.grams}g</span>
              <span className="mono" style={{ color: "var(--text-3)" }}>€{row.price_per_kg.toFixed(2)}/kg</span>
              <span className="mono" style={{ fontWeight: 500, color: "var(--text-1)" }}>€{row.cost.toFixed(2)}</span>
              <span style={{ color: "var(--text-3)", fontSize: 11 }}>{row.share_pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)" }}>Total Cost</span>
        <span className="mono display" style={{ fontSize: 16, fontWeight: 400, color: "var(--text-1)" }}>€{cost.total_cost.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function DishesPage() {
  const [dishes, setDishes]           = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState<Dish | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [expanded, setExpanded]       = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [dishData, ingData] = await Promise.all([getDishes(), getIngredients()]);
      setDishes(dishData.dishes ?? []);
      setIngredients(ingData.ingredients ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: Partial<Dish>) {
    setShowCreate(false);
    await createDish(data);
    await load();
  }

  async function handleUpdate(data: Partial<Dish>) {
    if (!editing) return;
    setEditing(null);
    await updateDish(editing.id, data);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this dish?")) return;
    await deleteDish(id);
    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  const ingMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  const col: React.CSSProperties = {
    padding: "12px 14px",
    borderBottom: "1px solid var(--border-muted)",
    fontSize: 13, color: "var(--text-2)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navigation />

      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <h1 className="display" style={{ fontSize: 28, fontWeight: 400, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              Dishes
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
              {dishes.length} dishes · click row to see breakdown · cost updates live with ingredient prices
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "9px 18px", borderRadius: 9, cursor: "pointer",
              background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 500,
            }}
          >
            + New Dish
          </button>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-hover)" }}>
                {["Dish", "Ingredients", "Menu Price", "Cost", "Margin", "Target", "Gap", "M6 Forecast", "Risk", "Actions"].map((h, i) => (
                  <th key={h} style={{
                    ...col,
                    fontWeight: 500, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--text-3)", textAlign: i <= 1 ? "left" : "center",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length: 3}).map((_, i) => (
                  <tr key={i}>
                    {Array.from({length: 10}).map((_, j) => (
                      <td key={j} style={col}>
                        <div className="shimmer" style={{ height: 14, borderRadius: 4, width: j === 0 ? 120 : 50 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dishes.map((dish) => {
                const ci = dish.cost_info;
                const fc = dish.forecast;
                const isExpanded = expanded === dish.id;

                return (
                  <>
                    <tr
                      key={dish.id}
                      onClick={() => setExpanded(isExpanded ? null : dish.id)}
                      style={{ cursor: "pointer", transition: "background 0.1s", background: isExpanded ? "var(--bg-hover)" : "transparent" }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Dish name */}
                      <td style={{ ...col, fontWeight: 500, color: "var(--text-1)" }}>
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 6 }}>
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        {dish.name}
                      </td>

                      {/* Ingredients pills */}
                      <td style={col}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {dish.ingredients.map((row) => (
                            <span key={row.ingredient_id} style={{
                              fontSize: 10, padding: "2px 6px", borderRadius: 99,
                              background: "var(--bg-selected)", color: "var(--text-2)",
                            }}>
                              {ingMap[row.ingredient_id]?.name?.split(" ")[0] ?? row.ingredient_id} {row.grams}g
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ ...col, textAlign: "center" }} className="mono">
                        €{dish.current_price_eur.toFixed(2)}
                      </td>

                      {/* Cost */}
                      <td style={{ ...col, textAlign: "center" }} className="mono">
                        {ci ? `€${ci.total_cost.toFixed(2)}` : "—"}
                      </td>

                      {/* Current margin */}
                      <td style={{ ...col, textAlign: "center", fontWeight: 500 }} className="mono">
                        <span style={{ color: ci && ci.current_margin < ci.target_margin ? "var(--high-fg)" : "var(--ok-fg)" }}>
                          {ci ? `${(ci.current_margin * 100).toFixed(1)}%` : "—"}
                        </span>
                      </td>

                      {/* Target */}
                      <td style={{ ...col, textAlign: "center", color: "var(--text-3)" }} className="mono">
                        {`${(dish.target_margin * 100).toFixed(0)}%`}
                      </td>

                      {/* Gap */}
                      <td style={{ ...col, textAlign: "center" }} className="mono">
                        {ci ? (
                          <span style={{ color: ci.margin_gap < 0 ? "var(--high-fg)" : "var(--ok-fg)", fontWeight: 500 }}>
                            {ci.margin_gap >= 0 ? "+" : ""}{(ci.margin_gap * 100).toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>

                      {/* M6 forecast */}
                      <td style={{ ...col, textAlign: "center" }} className="mono">
                        {fc ? (
                          <span style={{ color: fc.min_expected_margin < dish.target_margin ? "var(--high-fg)" : "var(--ok-fg)", fontSize: 12 }}>
                            {(fc.min_expected_margin * 100).toFixed(1)}%
                          </span>
                        ) : <span style={{ color: "var(--text-3)", fontSize: 11 }}>no data</span>}
                      </td>

                      {/* Risk */}
                      <td style={{ ...col, textAlign: "center" }}>
                        {fc ? (
                          <span className={`badge ${RISK_BADGE[fc.risk_level] ?? ""}`}>{fc.risk_level}</span>
                        ) : <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ ...col, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                          <button
                            onClick={() => setEditing(dish)}
                            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer", background: "var(--bg-hover)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(dish.id)}
                            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer", background: "transparent", color: "var(--high-fg)", border: "1px solid var(--high-bg)" }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded cost breakdown */}
                    {isExpanded && ci && (
                      <tr key={`${dish.id}-breakdown`}>
                        <td colSpan={10} style={{ padding: "12px 16px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
                          <CostBreakdown cost={ci} ingredientMap={ingMap} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {!loading && dishes.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No dishes yet. Create your first dish.
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <DishForm ingredients={ingredients} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}
      {editing && (
        <DishForm initial={editing} ingredients={ingredients} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}
