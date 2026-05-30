"use client";
import { useEffect, useState } from "react";
import {
  getIngredients, getIngredientCatalog, createIngredient,
  updateIngredient, deleteIngredient, triggerFetchHistory,
} from "@/lib/api";
import { Ingredient, CatalogItem } from "@/types/crud";
import { Navigation } from "@/components/Navigation";

const CATEGORIES = ["All", "Grains", "Meat", "Fish", "Dairy", "Oils", "Vegetables", "Fruit", "Pantry", "Beverages"];

function RiskDot({ value }: { value: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: value ? "var(--ok-fg)" : "var(--text-3)",
      flexShrink: 0,
    }} />
  );
}

function PriceEditCell({ ing, onSave }: { ing: Ingredient; onSave: (id: string, price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(ing.current_price_eur_kg));

  if (!editing) {
    return (
      <span
        className="mono"
        onClick={() => setEditing(true)}
        style={{ cursor: "pointer", borderBottom: "1px dashed var(--border)", color: "var(--text-1)", fontSize: 13 }}
        title="Click to edit"
      >
        €{ing.current_price_eur_kg.toFixed(2)}
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { onSave(ing.id, parseFloat(val) || ing.current_price_eur_kg); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Enter") { onSave(ing.id, parseFloat(val) || ing.current_price_eur_kg); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      style={{
        width: 72, fontSize: 13, padding: "2px 6px", borderRadius: 6,
        border: "1px solid var(--accent)", background: "var(--bg-card)",
        color: "var(--text-1)", outline: "none",
      }}
    />
  );
}

function AddModal({
  catalog,
  onClose,
  onAdd,
}: {
  catalog: CatalogItem[];
  onClose: () => void;
  onAdd: (item: CatalogItem, price: number) => void;
}) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [price, setPrice] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  const inactive = catalog.filter((c) => !c.active);
  const filtered  = inactive.filter((c) => {
    const matchCat = catFilter === "All" || c.category === catFilter;
    const matchQ   = !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.id.includes(filter.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 520, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <h3 className="display" style={{ fontSize: 18, fontWeight: 400, color: "var(--text-1)" }}>
            Add Ingredient
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            Pick from Eurostat catalog — price history fetched automatically
          </p>
        </div>

        {/* Filters */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-muted)", display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            placeholder="Search ingredient…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: "100%", padding: "7px 12px", borderRadius: 8, fontSize: 13,
              border: "1px solid var(--border)", background: "var(--bg-hover)",
              color: "var(--text-1)", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 99, cursor: "pointer",
                  background: catFilter === cat ? "var(--accent)" : "var(--bg-hover)",
                  color: catFilter === cat ? "#fff" : "var(--text-2)",
                  border: "none",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ overflow: "auto", flex: 1, padding: "8px 0" }}>
          {filtered.length === 0 && (
            <p style={{ padding: "16px 20px", color: "var(--text-3)", fontSize: 13 }}>
              No inactive ingredients match filter.
            </p>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => { setSelected(item); setPrice(String(item.current_price_eur_kg)); }}
              style={{
                padding: "10px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer",
                background: selected?.id === item.id ? "var(--bg-selected)" : "transparent",
                borderLeft: selected?.id === item.id ? `2px solid var(--accent)` : "2px solid transparent",
                transition: "background 0.1s",
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{item.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)" }}>{item.category} · {item.coicop}</p>
              </div>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>€{item.current_price_eur_kg.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        {selected && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>Current price €/kg</p>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: 100, padding: "6px 10px", borderRadius: 7, fontSize: 13,
                  border: "1px solid var(--border)", background: "var(--bg-hover)",
                  color: "var(--text-1)", outline: "none",
                }}
              />
            </div>
            <button
              onClick={() => onAdd(selected, parseFloat(price) || selected.current_price_eur_kg)}
              style={{
                padding: "9px 20px", borderRadius: 9, cursor: "pointer",
                background: "var(--accent)", color: "#fff",
                border: "none", fontSize: 13, fontWeight: 500,
              }}
            >
              Add {selected.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [catalog, setCatalog]         = useState<CatalogItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [catFilter, setCatFilter]     = useState("All");
  const [fetching, setFetching]       = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [ingData, catData] = await Promise.all([getIngredients(), getIngredientCatalog()]);
      setIngredients(ingData.ingredients ?? []);
      setCatalog(catData.catalog ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(item: CatalogItem, price: number) {
    setShowAdd(false);
    await createIngredient({ ...item, current_price_eur_kg: price });
    await load();
  }

  async function handlePriceSave(id: string, price: number) {
    await updateIngredient(id, { current_price_eur_kg: price });
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, current_price_eur_kg: price } : i));
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this ingredient from active list?")) return;
    await deleteIngredient(id);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleFetch(id: string) {
    setFetching((prev) => new Set([...prev, id]));
    try {
      await triggerFetchHistory(id);
      await new Promise((r) => setTimeout(r, 1200));
      await load();
    } finally {
      setFetching((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const displayed = catFilter === "All"
    ? ingredients
    : ingredients.filter((i) => i.category === catFilter);

  const col: React.CSSProperties = {
    padding: "11px 14px",
    borderBottom: "1px solid var(--border-muted)",
    fontSize: 13,
    color: "var(--text-2)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navigation />

      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <h1 className="display" style={{ fontSize: 28, fontWeight: 400, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
              Ingredients
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
              {ingredients.length} active · click price to edit · fetch history triggers Eurostat pull
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: "9px 18px", borderRadius: 9, cursor: "pointer",
              background: "var(--accent)", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 500,
            }}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 99, cursor: "pointer",
                background: catFilter === cat ? "var(--accent)" : "var(--bg-hover)",
                color: catFilter === cat ? "#fff" : "var(--text-2)",
                border: catFilter === cat ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-hover)" }}>
                {["Ingredient", "Category", "COICOP", "Price €/kg", "Unit", "Forecast", "Fetched", "Actions"].map((h, i) => (
                  <th key={h} style={{
                    ...col,
                    fontWeight: 500, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--text-3)", textAlign: i >= 3 ? "center" : "left",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length: 6}).map((_, i) => (
                  <tr key={i}>
                    {Array.from({length: 8}).map((_, j) => (
                      <td key={j} style={col}>
                        <div className="shimmer" style={{ height: 14, borderRadius: 4, width: j === 0 ? 120 : 60 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.map((ing) => (
                <tr key={ing.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...col, fontWeight: 500, color: "var(--text-1)" }}>{ing.name}</td>
                  <td style={col}>
                    <span style={{
                      fontSize: 11, padding: "2px 7px", borderRadius: 99,
                      background: "var(--bg-hover)", color: "var(--text-2)", border: "1px solid var(--border)",
                    }}>
                      {ing.category}
                    </span>
                  </td>
                  <td style={{ ...col, color: "var(--text-3)" }} className="mono">{ing.coicop}</td>
                  <td style={{ ...col, textAlign: "center" }}>
                    <PriceEditCell ing={ing} onSave={handlePriceSave} />
                  </td>
                  <td style={{ ...col, textAlign: "center", color: "var(--text-3)" }}>{ing.unit}</td>
                  <td style={{ ...col, textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <RiskDot value={ing.has_forecast} />
                    </div>
                  </td>
                  <td style={{ ...col, textAlign: "center", color: "var(--text-3)", fontSize: 11 }}>
                    {ing.price_fetched_at ? ing.price_fetched_at.slice(0, 10) : "—"}
                  </td>
                  <td style={{ ...col, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button
                        onClick={() => handleFetch(ing.id)}
                        disabled={fetching.has(ing.id)}
                        title="Fetch Eurostat price history"
                        style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                          background: "var(--bg-hover)", color: "var(--text-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {fetching.has(ing.id) ? "…" : "↓ Fetch"}
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id)}
                        title="Remove"
                        style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                          background: "transparent", color: "var(--high-fg)",
                          border: "1px solid var(--high-bg)",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showAdd && <AddModal catalog={catalog} onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}
