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
import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import { duration as formatDuration, formatPercent } from "@/lib/utils";

export function TimeDistribution({ period }: { period: ProviderPeriod }) {
  const { data: result, isLoading } = api.chart.getTimeDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  function formatTooltipLabel(label: string) {
    return `${label}:00`;
  }

  function formatTooltipValue(
    value: number,
    _name: string,
    _item: any,
    _index: number,
    payload: any,
  ) {
    if (typeof value === "number") {
      return (
        <div className="flex flex-col gap-1">
          <div>
            {formatDuration(payload?.duration ?? 0).toFormattedString(
              "{M} min",
            )}
          </div>
          <div>{formatPercent(value)} of total time listened</div>
          <div>
            {payload?.count} of {result?.totalCount} tracks
          </div>
        </div>
      );
    }
    return value;
  }

  const data =
    Array.isArray(result?.data) && result.data.length > 0
      ? result.data
      : [{ date: "00", duration: 0 }];

  const maxPercentage = Math.max(
    ...(result?.data?.map((d) => d.percentage) ?? []),
  );
  const yAxisMax = maxPercentage > 0 ? Math.ceil(maxPercentage * 1.1) : 1;
  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Listening by hour</CardTitle>
        <CardDescription>
          Total time played in each hour of the day
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="aspect-auto h-full min-h-0 w-full flex-1"
          config={{
            percentage: {
              label: "Listening by hour",
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
                typeof value === "string" ? `${value}` : value
              }
              stroke="#a9adc1"
            />
            <YAxis
              dataKey="percentage"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              stroke="#a9adc1"
              domain={[0, yAxisMax]}
              tickFormatter={(value) =>
                typeof value === "number" ? formatPercent(value) : value
              }
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.06)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item, index, payload) =>
                    formatTooltipValue(
                      value as number,
                      name as string,
                      item,
                      index,
                      payload,
                    )
                  }
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
            <Bar dataKey="percentage" fill="var(--chart-1)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
