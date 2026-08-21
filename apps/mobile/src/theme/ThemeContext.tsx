import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getStoredThemeMode, setStoredThemeMode } from "../lib/secureStorage";
import { getColorsForMode, type ThemeColors, type ThemeMode } from "./colors";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    getStoredThemeMode().then((stored) => {
      if (stored) setModeState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setStoredThemeMode(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      void setStoredThemeMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: getColorsForMode(mode), toggleTheme, setMode }),
    [mode, toggleTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
