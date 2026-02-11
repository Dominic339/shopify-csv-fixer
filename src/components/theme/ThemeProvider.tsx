"use client";

import * as React from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeCtx | null>(null);

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("dark");

  // Initialize from storage/system on mount (avoids SSR touching window)
  React.useEffect(() => {
    setTheme(getPreferredTheme());
  }, []);

  // Apply theme tokens + tailwind dark class
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // CSS variables in globals.css key off data-theme
    root.setAttribute("data-theme", theme);

    // Tailwind "dark:" utilities key off the .dark class
    root.classList.toggle("dark", theme === "dark");

    if (typeof window !== "undefined") localStorage.setItem("theme", theme);
  }, [theme]);

  const value = React.useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(ThemeContext);

  // During certain framework-generated prerenders (notably /_not-found in static export),
  // some trees can be evaluated without your provider fully established.
  // Instead of failing the entire build, fall back to a safe default.
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: () => {},
      toggle: () => {},
    };
  }

  return ctx;
}
