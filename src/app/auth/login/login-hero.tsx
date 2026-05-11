import {
  BarChart3,
  Clock,
  LineChart,
  ListMusic,
  Music2,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";

const featureIcons = [
  { icon: BarChart3, label: "Dashboard" },
  { icon: TrendingUp, label: "Top lists" },
  { icon: LineChart, label: "Trends" },
  { icon: Clock, label: "Sessions" },
  { icon: ListMusic, label: "Playlists" },
  { icon: Upload, label: "Import" },
] as const;

const barHeights = [38, 62, 44, 78, 52, 68, 41, 85, 56, 48] as const;
const barTone = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-1",
  "bg-chart-6",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
] as const;

function DashboardPreview() {
  return (
    <div
      className="border-border/80 bg-card/45 text-card-foreground relative overflow-hidden rounded-none border shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/30"
      aria-hidden
    >
      <div className="from-muted/30 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />
      <div className="relative p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <span className="bg-destructive/80 size-2 shrink-0 rounded-full" />
            <span className="bg-warning/90 size-2 shrink-0 rounded-full" />
            <span className="bg-success/85 size-2 shrink-0 rounded-full" />
          </div>
          <div className="bg-muted/50 h-2 max-w-[40%] flex-1 rounded-none" />
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { value: "2.4k", hint: "plays" },
            { value: "184h", hint: "listened" },
            { value: "612", hint: "artists" },
          ].map(({ value, hint }) => (
            <div
              key={hint}
              className="border-border/60 bg-background/40 flex flex-col gap-0.5 rounded-none border px-2 py-2.5 sm:px-3 dark:bg-white/5"
            >
              <span className="font-heading text-foreground text-lg leading-none font-semibold tracking-tight sm:text-xl">
                {value}
              </span>
              <span className="text-muted-foreground text-[10px] font-medium uppercase sm:text-xs">
                {hint}
              </span>
            </div>
          ))}
        </div>

        <div className="border-border/50 bg-muted/20 mb-5 rounded-none border p-2 sm:p-3">
          <svg
            viewBox="0 0 320 100"
            className="text-chart-2 h-20 w-full sm:h-24"
            preserveAspectRatio="none"
          >
            <title>Listening over time</title>
            <defs>
              <linearGradient id="loginHeroChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,88 C26,82 40,72 52,58 C68,38 82,28 98,32 C112,36 124,22 142,18 C158,14 174,24 192,20 C210,16 226,8 244,12 C262,16 278,4 320,0 L320,100 L0,100 Z"
              fill="url(#loginHeroChartFill)"
            />
            <path
              d="M0,88 C26,82 40,72 52,58 C68,38 82,28 98,32 C112,36 124,22 142,18 C158,14 174,24 192,20 C210,16 226,8 244,12 C262,16 278,4 320,0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="flex h-14 items-end gap-1 sm:h-16 sm:gap-1.5">
          {barHeights.map((h, i) => (
            <div key={i} className="flex min-h-0 flex-1 flex-col justify-end">
              <div
                className={cn(
                  "w-full rounded-none opacity-90",
                  barTone[i % barTone.length],
                )}
                style={{ height: `${(h / 100) * 3.75}rem` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginHero() {
  return (
    <div className="relative flex w-full max-w-xl flex-col justify-center gap-8 sm:max-w-2xl lg:max-w-2xl">
      <div className="pointer-events-none absolute -top-28 -left-20 size-80 rounded-full bg-primary/25 blur-3xl dark:bg-primary/15" />
      <div className="pointer-events-none absolute top-48 -right-16 size-72 rounded-full bg-chart-4/30 blur-3xl dark:bg-chart-5/20" />

      <header className="relative space-y-3">
        <div className="border-border bg-secondary/70 text-secondary-foreground inline-flex items-center gap-2 rounded-none border px-2.5 py-1 text-xs font-medium backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
          <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
          Spotify Stats
        </div>
        <h1 className="font-heading text-foreground max-w-[18ch] text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:max-w-none">
          Your listening,{" "}
          <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
            visualized
          </span>
        </h1>
      </header>

      <DashboardPreview />

      <ul
        className="relative flex flex-wrap gap-2"
        aria-label="What is in the app"
      >
        {featureIcons.map(({ icon: Icon, label }) => (
          <li key={label}>
            <span
              className="border-border bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground inline-flex items-center justify-center rounded-none border p-2 backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-black/20"
              title={label}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground flex items-center gap-2 text-[11px] sm:text-xs">
        <Music2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="text-balance">Insights only—playback stays in Spotify.</span>
      </p>

      <p className="sr-only">
        After you sign in with Spotify you can use the dashboard, top lists,
        listening charts, sessions, playlists, and import tools.
      </p>
    </div>
  );
}
