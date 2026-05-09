"use client";

import * as React from "react";
import { useTheme } from "next-themes";

const FAVICONS: Record<string, string> = {
  light: "/favicon-light.ico",
  dark: "/favicon-dark.ico",
};

/**
 * Keeps the document favicon in sync with the in-app theme.
 * The static metadata in `app/layout.tsx` already provides
 * `prefers-color-scheme`-aware fallbacks for the initial render.
 */
export function FaviconSwitcher() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const href = FAVICONS[resolvedTheme ?? "light"] ?? FAVICONS.light;
    if (!href) return;

    const existing = document.querySelectorAll<HTMLLinkElement>(
      'link[rel~="icon"]',
    );
    existing.forEach((link) => link.parentElement?.removeChild(link));

    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
  }, [resolvedTheme]);

  return null;
}
