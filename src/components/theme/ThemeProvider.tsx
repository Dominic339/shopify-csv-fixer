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

  React.useEffect(() => {
    setTheme(getPreferredTheme());
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Your CSS variables key off this:
    root.setAttribute("data-theme", theme);

    // Tailwind dark: utilities key off this:
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

  // Don’t crash builds if a route is evaluated without provider
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: () => {},
      toggle: () => {},
    };
  }

  return ctx;
}
