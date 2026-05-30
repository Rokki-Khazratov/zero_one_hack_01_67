"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/",            label: "Dashboard" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/dishes",      label: "Dishes" },
];

export function Navigation({ onRefresh, loading }: { onRefresh?: () => void; loading?: boolean }) {
  const path = usePathname();

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="display" style={{ fontSize: 18, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
            MenuMargin
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
            AI
          </span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: "flex", gap: 2 }}>
          {NAV.map(({ href, label }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 13,
                  padding: "5px 12px",
                  borderRadius: 7,
                  textDecoration: "none",
                  color: active ? "var(--accent)" : "var(--text-2)",
                  background: active ? "var(--accent-light)" : "transparent",
                  fontWeight: active ? 500 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ThemeToggle />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              fontSize: 12, padding: "5px 14px", borderRadius: 8, cursor: "pointer",
              background: "var(--bg-hover)", color: "var(--text-2)",
              border: "1px solid var(--border)", transition: "all 0.15s ease",
            }}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        )}
      </div>
    </header>
  );
}
