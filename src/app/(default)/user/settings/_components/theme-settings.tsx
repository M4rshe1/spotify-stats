"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { themeOptions } from "@/components/theme-switcher";
import { Label } from "@/components/ui/label";
import {
  colorThemeIds,
  colorThemes,
  type ColorThemeId,
} from "@/lib/consts/themes";
import { cn } from "@/lib/utils";
import { useColorTheme } from "@/providers/color-theme-provider";

function ThemePreviewMock({ isDark }: { isDark: boolean }) {
  return (
    <div className="bg-background text-foreground space-y-2 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="bg-primary size-2.5 shrink-0 rounded-full" />
        <span className="bg-muted h-1.5 flex-1 rounded-sm" />
        <span className="bg-accent size-2.5 shrink-0 rounded-sm" />
      </div>

      <div className="border-border bg-card space-y-1.5 rounded-sm border p-2">
        <div className="bg-foreground/75 h-1.5 w-3/5 rounded-sm" />
        <div className="bg-muted-foreground/35 h-1 w-full rounded-sm" />
        <div className="bg-muted-foreground/25 h-1 w-4/5 rounded-sm" />
        <div className="mt-1 flex gap-1">
          <span className="bg-primary h-3.5 flex-1 rounded-sm" />
          <span className="bg-secondary h-3.5 w-7 rounded-sm" />
        </div>
      </div>

      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-sm">
        {[1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className="flex-1"
            style={{ backgroundColor: `var(--chart-${index})` }}
          />
        ))}
      </div>

      <div className="bg-sidebar border-sidebar-border flex items-center gap-1.5 rounded-sm border p-1.5">
        <span className="bg-sidebar-primary size-2 shrink-0 rounded-sm" />
        <span className="bg-sidebar-accent h-1.5 flex-1 rounded-sm" />
      </div>

      <div className="flex gap-1">
        <span className="bg-info h-2 flex-1 rounded-sm" />
        <span className="bg-warning h-2 flex-1 rounded-sm" />
        <span className="bg-success h-2 flex-1 rounded-sm" />
        <span className="bg-destructive/80 h-2 flex-1 rounded-sm" />
      </div>

      <span className="text-muted-foreground block text-[10px] leading-none">
        {isDark ? "Dark preview" : "Light preview"}
      </span>
    </div>
  );
}

function ThemePreviewCard({
  themeId,
  isSelected,
  isDark,
  disabled,
  onSelect,
}: {
  themeId: ColorThemeId;
  isSelected: boolean;
  isDark: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const theme = colorThemes[themeId];

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${theme.label} theme`}
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 text-left transition-all",
        "hover:border-primary/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        isSelected ? "border-primary ring-primary/15 ring-2" : "border-border",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div data-theme={themeId} className={cn(isDark ? "dark" : "light")}>
        <ThemePreviewMock isDark={isDark} />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">{theme.label}</p>
          <p className="text-muted-foreground text-xs">
            Background, surfaces, and accents
          </p>
        </div>
        {isSelected ? (
          <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
            <CheckIcon className="size-3" aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme, mounted } = useColorTheme();
  const [modeMounted, setModeMounted] = React.useState(false);

  React.useEffect(() => {
    setModeMounted(true);
  }, []);

  const activeMode = modeMounted ? (theme ?? "system") : "system";
  const previewIsDark =
    modeMounted && (resolvedTheme === "dark" || activeMode === "dark");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Color mode</Label>
        <div
          role="group"
          aria-label="Color mode"
          className="flex flex-wrap gap-2"
        >
          {themeOptions.map(({ value, label, Icon }) => {
            const isActive = activeMode === value;
            return (
              <Button
                key={value}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                disabled={!modeMounted}
                aria-pressed={isActive}
                onClick={() => setTheme(value)}
                className="gap-2"
              >
                <Icon className="size-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Color theme</Label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {colorThemeIds.map((themeId) => (
            <ThemePreviewCard
              key={themeId}
              themeId={themeId}
              isSelected={colorTheme === themeId}
              isDark={previewIsDark}
              disabled={!mounted}
              onSelect={() => setColorTheme(themeId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
