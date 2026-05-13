import Link from "next/link";
import { Compass } from "lucide-react";

import { ThemeSwitcherRow } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="from-primary/[0.1] via-background to-chart-2/18 dark:from-muted/35 dark:via-background dark:to-primary/12 relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br px-4 py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "28px 28px",
          color: "var(--muted-foreground)",
        }}
        aria-hidden
      />
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcherRow />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="border-border bg-background/80 text-muted-foreground mb-6 flex size-14 items-center justify-center border backdrop-blur-sm">
          <Compass className="size-7" aria-hidden />
        </div>
        <p className="text-muted-foreground font-mono text-lg font-medium tracking-widest uppercase">
          404
        </p>
        <h1 className="text-foreground mt-2 font-sans text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          This URL does not match any page. It may have been moved or typed
          incorrectly.
        </p>
        <Button asChild className="mt-8" variant="default" size="default">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
