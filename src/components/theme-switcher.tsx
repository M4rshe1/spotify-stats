"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

const options = [
  { value: "light" as const, label: "Light theme", Icon: Sun },
  { value: "dark" as const, label: "Dark theme", Icon: Moon },
  { value: "system" as const, label: "System theme", Icon: Monitor },
];

export function ThemeSwitcherRow({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? (theme ?? "system") : "system";

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("inline-flex items-center gap-1", className)}
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            aria-pressed={isActive}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isActive && "text-foreground bg-muted/60",
            )}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}

export function ThemeSwitcher({
  className,
  ...props
}: React.ComponentProps<typeof SidebarGroup>) {
  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupContent>
        <ThemeSwitcherRow />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
