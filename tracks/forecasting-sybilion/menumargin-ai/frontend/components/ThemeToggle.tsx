"use client";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        width: 40,
        height: 22,
        borderRadius: 99,
        border: "1px solid var(--border)",
        background: theme === "dark" ? "var(--bg-selected)" : "var(--bg-hover)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.25s ease",
        display: "flex",
        alignItems: "center",
        padding: "2px",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          transform: theme === "dark" ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
