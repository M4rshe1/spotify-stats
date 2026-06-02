"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import { ColorThemeProvider } from "@/providers/color-theme-provider";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorThemeProvider>{children}</ColorThemeProvider>
    </NextThemesProvider>
  );
}
