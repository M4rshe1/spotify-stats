"use client";

import type { CSSProperties } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";

/** Overrides Sonner’s injected stylesheet via inline cascade (inherits light/dark from `html`). */
function toasterSemanticStyle(): CSSProperties {
  return {
    "--normal-bg": "var(--card)",
    "--normal-border": "var(--border)",
    "--normal-text": "var(--foreground)",
    "--normal-bg-hover": "color-mix(in oklch, var(--muted) 82%, transparent)",
    "--normal-border-hover":
      "color-mix(in oklch, var(--foreground) 16%, transparent)",

    "--success-bg": "color-mix(in oklch, var(--success) 32%, var(--card))",
    "--success-border": "color-mix(in oklch, var(--chart-2) 55%, transparent)",
    "--success-text": "var(--success-foreground)",

    "--info-bg": "color-mix(in oklch, var(--info) 38%, var(--card))",
    "--info-border":
      "color-mix(in oklch, var(--info-foreground) 24%, transparent)",
    "--info-text": "var(--info-foreground)",

    "--warning-bg": "color-mix(in oklch, var(--warning) 38%, var(--card))",
    "--warning-border":
      "color-mix(in oklch, var(--warning-foreground) 24%, transparent)",
    "--warning-text": "var(--warning-foreground)",

    "--error-bg": "color-mix(in oklch, var(--destructive) 18%, var(--card))",
    "--error-border":
      "color-mix(in oklch, var(--destructive) 42%, transparent)",
    "--error-text":
      "color-mix(in oklch, var(--destructive) 92%, oklch(0.148 0.004 228.8))",

    "--border-radius": "0px",
    "--width": "min(384px, calc(100vw - 2rem))",
  } as CSSProperties;
}

const Toaster = ({
  toastOptions,
  style,
  icons,
  className,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group", className)}
      style={{
        ...toasterSemanticStyle(),
        fontFamily:
          'var(--font-mono), ui-monospace, "JetBrains Mono", monospace',
        ...style,
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 shrink-0" aria-hidden />,
        info: <InfoIcon className="size-4 shrink-0" aria-hidden />,
        warning: <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />,
        error: <OctagonXIcon className="size-4 shrink-0" aria-hidden />,
        loading: (
          <Loader2Icon className="size-4 shrink-0 animate-spin" aria-hidden />
        ),
        ...icons,
      }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...(toastOptions?.classNames ?? {}),
          toast: cn("cn-toast", toastOptions?.classNames?.toast),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
