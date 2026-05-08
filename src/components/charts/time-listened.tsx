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
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import { duration as formatDuration } from "@/lib/utils";
import { periods } from "@/lib/consts/periods";
import { format } from "date-fns";

export function TimeListened({ period }: { period: ProviderPeriod }) {
  const { data: tracks, isLoading: isLoadingTracks } =
    api.chart.getTimeListened.useQuery(providerPeriodToQueryInput(period));

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
          <div>{formatDuration(value).toFormattedString("{M} min")}</div>
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
  const maxDuration = Math.max(...data.map((entry) => entry.duration), 0);
  const yAxisMax = maxDuration > 0 ? Math.ceil(maxDuration * 1.1) : 1;

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>
          Time Listened{" "}
          <span className="text-muted-foreground text-sm">(minutes)</span>
        </CardTitle>
        <CardDescription>{periods[period.type]?.label}</CardDescription>
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
              tickFormatter={(value) => {
                switch (tracks?.grouping) {
                  case "day":
                    return format(new Date(value), "d. MMM");
                  case "month":
                    return format(new Date(value), "MMM yyyy");
                  case "year":
                    return format(new Date(value), "yyyy");
                  default:
                    return value;
                }
              }}
              stroke="#a9adc1"
            />
            <YAxis
              dataKey="duration"
              hide={false}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              domain={[0, yAxisMax]}
              stroke="#a9adc1"
              tickFormatter={(value) =>
                typeof value === "number"
                  ? formatDuration(value).toFormattedString("{M}")
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
                  labelFormatter={(label) => {
                    switch (tracks?.grouping) {
                      case "day":
                        return format(new Date(label), "EE, d. MMM");
                      case "month":
                        return format(new Date(label), "MMM yyyy");
                      case "year":
                        return format(new Date(label), "yyyy");
                      default:
                        return label;
                    }
                  }}
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
