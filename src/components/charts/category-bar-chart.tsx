"use client";

import type { ComponentProps } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  CHART_AXIS_STROKE,
  chartPaddedUpperBound,
  DEFAULT_CHART_MARGIN,
  SeriesCartesianGrid,
} from "./series-chart-card";

import type { CategoryRecord } from "./category-area-chart";

export function CategoryBarChart<T extends CategoryRecord>({
  data,
  categoryKey,
  valueKey,
  color = "var(--chart-1)",
  formatCategoryTick,
  formatTooltipCategory,
  formatValueTick,
  formatTooltipValue,
  yDomainMax,
  yPaddingFactor = 1.1,
  emptyYMax = 1,
  tooltipCursor = { fill: "rgba(255,255,255,0.06)" },
  margin = DEFAULT_CHART_MARGIN,
  barRadius = 6,
  accessibilityLayer = true,
}: {
  data: T[];
  categoryKey: string;
  valueKey: string;
  color?: string;
  formatCategoryTick?: (value: string) => string;
  /** Receives the raw axis category string (and optional tooltip payload from Recharts). */
  formatTooltipCategory?: (label: string, payload?: unknown) => string;
  formatValueTick?: (value: number) => string;
  formatTooltipValue?: (
    value: number,
    payload: T | undefined,
  ) => React.ReactNode;
  yDomainMax?: number;
  yPaddingFactor?: number;
  emptyYMax?: number;
  tooltipCursor?: ComponentProps<typeof ChartTooltip>["cursor"];
  margin?: typeof DEFAULT_CHART_MARGIN;
  barRadius?: number;
  accessibilityLayer?: boolean;
}) {
  const numericValues = data.map((d) => Number(d[valueKey]));
  const yMax =
    yDomainMax ??
    chartPaddedUpperBound(
      numericValues.filter((n) => !Number.isNaN(n)),
      yPaddingFactor,
      emptyYMax,
    );

  return (
    <BarChart
      accessibilityLayer={accessibilityLayer}
      data={data}
      margin={{ ...margin }}
    >
      <SeriesCartesianGrid />
      <XAxis
        dataKey={categoryKey}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tickFormatter={(value) =>
          formatCategoryTick?.(String(value)) ?? String(value)
        }
        stroke={CHART_AXIS_STROKE}
      />
      <YAxis
        dataKey={valueKey}
        axisLine={false}
        tickLine={false}
        tickMargin={8}
        stroke={CHART_AXIS_STROKE}
        domain={[0, yMax]}
        tickFormatter={(value) =>
          typeof value === "number"
            ? (formatValueTick?.(value) ?? String(value))
            : String(value)
        }
      />
      <ChartTooltip
        cursor={tooltipCursor}
        content={
          <ChartTooltipContent
            formatter={(value, _name, item) => {
              const payload = (item as { payload?: T } | undefined)?.payload;
              if (typeof value === "number") {
                return formatTooltipValue?.(value, payload) ?? String(value);
              }
              return value;
            }}
            labelFormatter={(label, payload) =>
              formatTooltipCategory?.(String(label), payload) ?? String(label)
            }
          />
        }
      />
      <Bar dataKey={valueKey} fill={color} radius={barRadius} />
    </BarChart>
  );
}
