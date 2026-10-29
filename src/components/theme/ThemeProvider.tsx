"use client";

import * as React from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "theme_v2";

/**
 * Runs in <head> before first paint so a dark-mode user never sees a light flash.
 * Light is the default; dark only when the visitor chose it with the toggle.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}`;

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light");

  // THEME_INIT_SCRIPT has already set the attribute; just sync React's copy.
  React.useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const choose = React.useCallback((t: Theme) => {
    setTheme(t);
    // CSS variables and Tailwind's dark: variant both key off this.
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
  }, []);

  const value = React.useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme: choose,
      toggle: () => choose(theme === "dark" ? "light" : "dark"),
    }),
    [theme, choose]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(ThemeContext);

  // Don’t crash builds if a route is evaluated without provider
  if (!ctx) {
    return {
      theme: "light",
      setTheme: () => {},
      toggle: () => {},
    };
  }

  return ctx;
}
