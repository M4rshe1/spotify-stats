"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfISOWeek,
  format,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { CalendarIcon } from "lucide-react";

import { NoDataCard } from "@/components/cards/no-data-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { cn, duration as formatDuration } from "@/lib/utils";
import { api } from "@/trpc/react";

type CalendarDay = {
  date: string;
  duration: number;
  count: number;
};

const LEVEL_CLASS = [
  "bg-muted",
  "bg-chart-1/25",
  "bg-chart-1/50",
  "bg-chart-1/75",
  "bg-chart-1",
] as const;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function intensityLevel(duration: number, thresholds: number[]) {
  if (duration <= 0) return 0;
  for (let level = 0; level < thresholds.length; level++) {
    const threshold = thresholds[level];
    if (threshold != null && duration <= threshold) return level + 1;
  }
  return 4;
}

function percentileThresholds(durations: number[]) {
  const nonzero = durations.filter((value) => value > 0).sort((a, b) => a - b);
  if (nonzero.length === 0) return [];
  const at = (fraction: number) => {
    const index = Math.min(
      nonzero.length - 1,
      Math.floor((nonzero.length - 1) * fraction),
    );
    return nonzero[index] ?? 0;
  };
  return [at(0.25), at(0.5), at(0.75)];
}

function buildWeeks(days: CalendarDay[]) {
  if (days.length === 0) return [];
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return [];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const gridStart = startOfISOWeek(parseISO(first.date));
  const gridEnd = endOfISOWeek(parseISO(last.date));
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: {
    date: string;
    duration: number;
    count: number;
    inPeriod: boolean;
  }[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(
      cells.slice(index, index + 7).map((cell) => {
        const date = format(cell, "yyyy-MM-dd");
        const row = byDate.get(date);
        return {
          date,
          duration: row?.duration ?? 0,
          count: row?.count ?? 0,
          inPeriod: Boolean(row),
        };
      }),
    );
  }
  return weeks;
}

function monthLabels(
  weeks: { date: string; inPeriod: boolean }[][],
): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  weeks.forEach((week, col) => {
    const firstOfMonth = week.find(
      (day) => day.inPeriod && day.date.endsWith("-01"),
    );
    if (firstOfMonth) {
      labels.push({
        label: format(parseISO(firstOfMonth.date), "MMM"),
        col,
      });
      return;
    }
    if (col === 0) {
      const firstInPeriod = week.find((day) => day.inPeriod);
      if (firstInPeriod) {
        labels.push({
          label: format(parseISO(firstInPeriod.date), "MMM"),
          col,
        });
      }
    }
  });
  return labels.filter((label, index, all) => {
    const previous = all[index - 1];
    return !previous || label.col - previous.col >= 2;
  });
}

export function ListeningCalendarChart({ period }: { period: ProviderPeriod }) {
  const { data, isLoading } = api.chart.getListeningCalendar.useQuery(
    providerPeriodToQueryInput(period),
  );

  const weeks = useMemo(() => buildWeeks(data?.days ?? []), [data?.days]);
  const thresholds = useMemo(
    () => percentileThresholds((data?.days ?? []).map((day) => day.duration)),
    [data?.days],
  );
  const labels = useMemo(() => monthLabels(weeks), [weeks]);

  // Determine the date(s) with highest duration
  const maxDuration = useMemo(() => {
    if (!data?.days || data.days.length === 0) return 0;
    return Math.max(...data.days.map((day) => day.duration));
  }, [data?.days]);

  // There might be multiple days with same max duration, collect those dates
  const maxDurationDates = useMemo(() => {
    if (!data?.days || maxDuration === 0) return new Set();
    return new Set(
      data.days
        .filter((day) => day.duration === maxDuration)
        .map((day) => day.date),
    );
  }, [data?.days, maxDuration]);

  if (isLoading) {
    return <Loading />;
  }

  if (!data || data.days.length === 0) {
    return (
      <NoDataCard
        title="Listening calendar"
        icon={<CalendarIcon />}
        emptyTitle="No listening days in this period"
        description="Play something, or import your extended streaming history to fill the calendar."
      />
    );
  }

  const description = data.truncated
    ? "Last 53 weeks of the selected period"
    : "Daily listening time in the selected period";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening calendar</CardTitle>
        <CardDescription>
          {description}
          {" · "}
          {data.activeDays.toLocaleString()}{" "}
          {data.activeDays === 1 ? "day" : "days"}
          {" · "}
          {formatDuration(data.totalDuration).toBestDurationString(false)}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="flex w-full gap-1">
            <div className="w-7 shrink-0" />
            <div className="relative h-4 min-w-0 flex-1">
              {labels.map((label) => (
                <span
                  key={`${label.label}-${label.col}`}
                  className="text-muted-foreground absolute top-0 text-[10px] leading-none"
                  style={{
                    left: `${weeks.length > 0 ? (label.col / weeks.length) * 100 : 0}%`,
                  }}
                >
                  {label.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex w-full gap-1">
            <div className="text-muted-foreground flex w-7 shrink-0 flex-col gap-1 text-[10px] leading-3">
              {WEEKDAY_LABELS.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex h-3 items-center",
                    index % 2 === 1 ? "opacity-0" : "",
                  )}
                >
                  {label.slice(0, 1)}
                </span>
              ))}
            </div>
            <div
              className="grid min-w-0 flex-1 gap-1"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, minmax(0.75rem, 1fr))`,
                gridTemplateRows: "repeat(7, 0.75rem)",
                gridAutoFlow: "column",
              }}
            >
              {weeks.flatMap((week) =>
                week.map((day) => {
                  if (!day.inPeriod) {
                    return (
                      <div
                        key={day.date}
                        className="h-full w-full rounded-[2px] bg-transparent"
                      />
                    );
                  }
                  const level = intensityLevel(day.duration, thresholds);
                  const isMax = maxDurationDates.has(day.date);

                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${format(parseISO(day.date), "EEE, MMM d, yyyy")}: ${formatDuration(day.duration).toBestDurationString(false)}, ${day.count.toLocaleString()} plays`}
                          className={cn(
                            "ring-foreground/10 h-full w-full rounded-[2px] ring-1",
                            LEVEL_CLASS[level],
                            isMax
                              ? "outline-accent-foreground z-10 outline outline-2 outline-offset-2"
                              : "",
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {format(parseISO(day.date), "EEE, MMM d, yyyy")}
                          </span>
                          <span>
                            {formatDuration(day.duration).toBestDurationString(
                              false,
                            )}
                          </span>
                          <span>
                            {day.count.toLocaleString()}{" "}
                            {day.count === 1 ? "play" : "plays"}
                          </span>
                          {isMax && (
                            <span className="font-bold text-yellow-600">
                              Highest listening day
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }),
              )}
            </div>
          </div>
          <div className="text-muted-foreground mt-2 flex items-center justify-end gap-1 text-[10px]">
            <span>Less</span>
            {LEVEL_CLASS.map((className, level) => (
              <span
                key={className}
                className={cn(
                  "ring-foreground/10 size-3 rounded-[2px] ring-1",
                  className,
                )}
                aria-label={`Intensity ${level}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
