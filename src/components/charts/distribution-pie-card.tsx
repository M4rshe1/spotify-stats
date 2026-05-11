"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Pie, PieChart } from "recharts";

import {
  Card,
  CardAction,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const names = new Set(data.map((d) => d.name));
    setHiddenNames((prev) => {
      const next = new Set<string>();
      for (const n of prev) {
        if (names.has(n)) next.add(n);
      }
      return next;
    });
  }, [data]);

  const visibleData = useMemo(() => {
    const rows = data.filter((d) => !hiddenNames.has(d.name));
    const totalDuration = rows.reduce((acc, row) => acc + row.duration, 0);
    return rows.map((row) => ({
      ...row,
      percentage:
        totalDuration > 0
          ? (row.duration / totalDuration) * 100
          : row.percentage,
    }));
  }, [data, hiddenNames]);

  const visibleChartConfig = useMemo(() => {
    const next: ChartConfig = { ...chartConfig };
    for (const row of visibleData) {
      const prev = chartConfig[row.name];
      if (!prev) continue;
      next[row.name] = {
        ...prev,
        label: (
          <span>
            {row.name}{" "}
            <span className="text-muted-foreground">
              ({formatPercent(row.percentage)})
            </span>
          </span>
        ),
      };
    }
    return next;
  }, [chartConfig, visibleData]);

  function setSegmentVisible(name: string, visible: boolean) {
    setHiddenNames((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(name);
      } else {
        const visibleAfter = data.filter(
          (d) => d.name !== name && !prev.has(d.name),
        );
        if (visibleAfter.length === 0) return prev;
        next.add(name);
      }
      return next;
    });
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-none"
                aria-label="Choose segments to show"
              >
                <SlidersHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Segments</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {data.map((row) => (
                <DropdownMenuCheckboxItem
                  key={row.name}
                  checked={!hiddenNames.has(row.name)}
                  onCheckedChange={(checked) =>
                    setSegmentVisible(row.name, checked === true)
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {row.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {visibleData.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-center text-xs">
            Enable at least one segment to show the chart.
          </div>
        ) : (
          <ChartContainer
            config={visibleChartConfig}
            className="h-[260px] w-full"
          >
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    nameKey="name"
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
                            ).toBestDurationString()}
                          </div>
                          <div>{formatPercent(item.payload.percentage)}</div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie data={visibleData} dataKey="value" nameKey="name" />
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
        )}
      </CardContent>
    </Card>
  );
}
