"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] shadow-sm">
            🧾
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">Shopify CSV Fixer</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/app"
            className="rgb-btn bg-[var(--surface)] text-[var(--text)] text-sm"
            >
                Open app
            </Link>


          <button
            onClick={toggle}
            className="rgb-btn bg-[var(--surface)] text-[var(--text)] text-sm"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </nav>
      </div>

      <div
        className="h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3), var(--accent-4), var(--accent-5))",
        }}
      />
    </header>
  );
}
