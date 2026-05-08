"use client";

import { Pie, PieChart } from "recharts";

import { Loading } from "@/components/ui/loading";
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
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration as formatDuration, formatPercent } from "@/lib/utils";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";

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

type DistributionDatum = {
  name: string;
  value: number;
  duration: number;
  percentage: number;
  fill: string;
};

function toChartData(
  rows: { name: string; value: number; duration: number }[],
): DistributionDatum[] {
  const totalDuration = rows.reduce((acc, row) => acc + row.duration, 0);
  return rows.map((row, index) => ({
    ...row,
    percentage: totalDuration > 0 ? (row.duration / totalDuration) * 100 : 0,
    fill: PIE_COLORS[index % PIE_COLORS.length] ?? "var(--chart-1)",
  }));
}

function toChartConfig(
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
      label: `${row.name} (${formatPercent(row.percentage)})`,
      color: PIE_COLORS[index % PIE_COLORS.length] ?? "var(--chart-1)",
    };
  });

  return config;
}

function DistributionPieCard({
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
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  nameKey="name"
                  formatter={(_value, _name, _item, _index, payload) => {
                    const row = payload?.[0]?.payload as DistributionDatum;
                    if (!row) {
                      return null;
                    }
                    return (
                      <div className="flex flex-col gap-1">
                        <div>{row.value.toLocaleString()} plays</div>
                        <div>
                          {formatDuration(row.duration).toFormattedString(
                            "{h}h {m}m",
                          )}
                        </div>
                        <div>{formatPercent(row.percentage)}</div>
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

export default function AllStatsPage() {
  const { selectedPeriod } = usePeriod();
  const input = providerPeriodToQueryInput(selectedPeriod);

  const platformQuery = api.chart.getPlatformDistribution.useQuery(input);
  const deviceQuery = api.chart.getDeviceDistribution.useQuery(input);

  if (platformQuery.isLoading || deviceQuery.isLoading) {
    return <Loading />;
  }

  const platformData = toChartData(platformQuery.data ?? []);
  const deviceData = toChartData(deviceQuery.data ?? []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <DistributionPieCard
          title="Platform split"
          description="Playback count grouped by platform for the selected period."
          data={platformData}
          chartConfig={toChartConfig("Plays", platformData)}
        />
      </div>
      <div className="lg:col-span-1">
        <DistributionPieCard
          title="Device split"
          description="Playback count grouped by device for the selected period."
          data={deviceData}
          chartConfig={toChartConfig("Plays", deviceData)}
        />
      </div>
    </div>
  );
}
