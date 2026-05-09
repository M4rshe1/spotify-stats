"use client";

import type { ReactNode } from "react";
import { CartesianGrid } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

export const DEFAULT_CHART_MARGIN = {
  left: 12,
  right: 12,
  top: 12,
  bottom: 8,
} as const;

export const CHART_AXIS_STROKE = "#a9adc1";

/** Upper axis bound: max(values)×factor, or emptyMax when max is 0. */
export function chartPaddedUpperBound(
  values: number[],
  factor: number,
  emptyMax: number,
) {
  const max = Math.max(...values, 0);
  return max > 0 ? Math.ceil(max * factor) : emptyMax;
}

export function SeriesCartesianGrid() {
  return (
    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" />
  );
}

export function SeriesChartCard({
  title,
  description,
  chartConfig,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  chartConfig: ChartConfig;
  children: ReactNode;
}) {
  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description != null ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="aspect-auto h-full min-h-0 w-full flex-1"
          config={chartConfig}
        >
          {children}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
