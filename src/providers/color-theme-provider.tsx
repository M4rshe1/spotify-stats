"use client";

import * as React from "react";

import {
  COLOR_THEME_STORAGE_KEY,
  defaultColorTheme,
  isColorThemeId,
  type ColorThemeId,
} from "@/lib/consts/themes";

type ColorThemeContextValue = {
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
  mounted: boolean;
};

const ColorThemeContext = React.createContext<ColorThemeContextValue | null>(
  null,
);

function applyColorTheme(theme: ColorThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] =
    React.useState<ColorThemeId>(defaultColorTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      const next =
        stored && isColorThemeId(stored) ? stored : defaultColorTheme;
      setColorThemeState(next);
      applyColorTheme(next);
    } catch {
      applyColorTheme(defaultColorTheme);
    }
    setMounted(true);
  }, []);

  const setColorTheme = React.useCallback((theme: ColorThemeId) => {
    setColorThemeState(theme);
    applyColorTheme(theme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const value = React.useMemo(
    () => ({ colorTheme, setColorTheme, mounted }),
    [colorTheme, setColorTheme, mounted],
  );

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = React.useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within ColorThemeProvider");
  }
  return context;
}
