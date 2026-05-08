"use client";

import { Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { duration as formatDuration, formatPercent } from "@/lib/utils";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export type DistributionDatum = {
  name: string;
  value: number;
  duration: number;
  percentage: number;
  fill: string;
};

export function toChartData(
  rows: { name: string; value: number; duration: number }[],
): DistributionDatum[] {
  const totalDuration = rows.reduce((acc, row) => acc + row.duration, 0);
  return rows.map((row, index) => ({
    ...row,
    percentage: totalDuration > 0 ? (row.duration / totalDuration) * 100 : 0,
    fill: PIE_COLORS[index % PIE_COLORS.length] ?? "var(--chart-1)",
  }));
}

export function toChartConfig(
  label: string,
  rows: DistributionDatum[],
): ChartConfig {
  const config: ChartConfig = {
    value: {
      label,
    },
  };

  rows.forEach((row, index) => {
    config[row.name] = {
      label: (
        <span>
          {row.name}{" "}
          <span className="text-muted-foreground">
            ({formatPercent(row.percentage)})
          </span>
        </span>
      ),

      color: PIE_COLORS[index % PIE_COLORS.length] ?? "var(--chart-1)",
    };
  });

  return config;
}

export function DistributionPieCard({
  title,
  description,
  data,
  chartConfig,
}: {
  title: string;
  description: string;
  data: DistributionDatum[];
  chartConfig: ChartConfig;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  nameKey="name"
                  indicator="line"
                  labelFormatter={(_label, payload) => {
                    return payload?.[0]?.name ?? "";
                  }}
                  formatter={(_value, _name, item, _index, _payload) => {
                    return (
                      <div className="flex flex-col gap-1">
                        <div>{item.payload.value.toLocaleString()} plays</div>
                        <div>
                          {formatDuration(
                            item.payload.duration,
                          ).toFormattedString("{h}h {m}m")}
                        </div>
                        <div>{formatPercent(item.payload.percentage)}</div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie data={data} dataKey="value" nameKey="name" />
            <ChartLegend
              align="right"
              layout="vertical"
              verticalAlign="middle"
              content={
                <ChartLegendContent
                  nameKey="name"
                  className="flex-col items-start gap-2 pt-0"
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}