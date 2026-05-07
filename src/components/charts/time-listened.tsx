"use client";

import { CartesianGrid, Area, AreaChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Loading } from "@/components/ui/loading";
import type { Period } from "@/lib/consts/periods";
import { api } from "@/trpc/react";
import { duration as formatDuration } from "@/lib/utils";
import { periods } from "@/lib/consts/periods";

export function TimeListened({
  period,
  from,
  to,
}: {
  period: Period;
  from: Date | undefined | null;
  to: Date | undefined | null;
}) {
  const { data: tracks, isLoading: isLoadingTracks } =
    api.chart.getTimeListened.useQuery({
      period,
      from,
      to,
    });

  if (isLoadingTracks) {
    return <Loading />;
  }

  function formatTooltipValue(
    value: number,
    _name: string,
    _item: any,
    _index: number,
    _payload: any,
  ) {
    if (typeof value === "number") {
      return (
        <div className="flex flex-col gap-1">
          <div>{formatDuration(value).toFormattedString("{M}min {s}s")}</div>
        </div>
      );
    }
    return value;
  }

  // Check for valid, non-empty data
  const data =
    Array.isArray(tracks?.data) && tracks?.data.length > 0
      ? tracks.data
      : [{ date: "", duration: 0 }];

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Time Listened</CardTitle>
        <CardDescription>{periods[period].label}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="aspect-auto h-full min-h-0 w-full flex-1"
          config={{
            timeListened: {
              label: "Time Listened",
              color: "var(--chart-1)",
            },
          }}
        >
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 8,
            }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                typeof value === "string" && value.length >= 3
                  ? value.slice(0, 3)
                  : value
              }
              stroke="#a9adc1"
            />
            <YAxis
              dataKey="duration"
              hide={false}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              domain={[0, 1000 * 60 * 60]}
              stroke="#a9adc1"
              tickFormatter={(value) =>
                typeof value === "number"
                  ? formatDuration(value).toFormattedString("{M}m")
                  : value
              }
            />
            <ChartTooltip
              cursor={{
                stroke: "var(--color-desktop)",
                strokeWidth: 1,
                opacity: 0.2,
              }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item, index, payload) =>
                    formatTooltipValue(
                      value as number,
                      name as string,
                      item as any,
                      index as number,
                      payload as any,
                    )
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="duration"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#chart-gradient)"
              dot={{
                r: 4,
                stroke: "white",
                strokeWidth: 2,
                fill: "var(--chart-1)",
              }}
              activeDot={{
                r: 6,
                stroke: "var(--chart-1)",
                strokeWidth: 2,
                fill: "#fff",
              }}
              isAnimationActive={false}
            />
            <defs>
              <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="10%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="90%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
