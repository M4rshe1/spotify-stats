"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import type { Period } from "@/lib/consts/periods";
import { api } from "@/trpc/react";
import { duration as formatDuration } from "@/lib/utils";

export function TimeDistribution({
  period,
  from,
  to,
}: {
  period: Period;
  from: Date | undefined | null;
  to: Date | undefined | null;
}) {
  const { data: result, isLoading } = api.chart.getTimeDistribution.useQuery({
    period,
    from,
    to,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  function formatTooltipLabel(label: string) {
    return `${label}:00`;
  }

  function formatTooltipValue(value: number) {
    if (typeof value === "number") {
      return formatDuration(value).toFormattedString("{M}m {s}s");
    }
    return value;
  }

  const data =
    Array.isArray(result?.data) && result.data.length > 0
      ? result.data
      : [{ date: "00", duration: 0 }];

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Listening by hour</CardTitle>
        <CardDescription>
          Total time played in each hour of the day for this period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="aspect-auto h-full min-h-0 w-full flex-1"
          config={{
            duration: {
              label: "Time listened",
              color: "var(--chart-1)",
            },
          }}
        >
          <BarChart
            accessibilityLayer
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
                typeof value === "string" ? `${parseInt(value, 10)}` : value
              }
              stroke="#a9adc1"
            />
            <YAxis
              dataKey="duration"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              stroke="#a9adc1"
              domain={[0, 1000 * 60 * 60]}
              tickFormatter={(value) =>
                typeof value === "number"
                  ? formatDuration(value).toFormattedString("{M}m")
                  : value
              }
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.06)" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatTooltipValue(value as number)}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { date?: string }
                      | undefined;
                    return row?.date != null
                      ? formatTooltipLabel(row.date)
                      : "";
                  }}
                />
              }
            />
            <Bar dataKey="duration" fill="var(--color-duration)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
