"use client";

import type { ComponentProps } from "react";
import { useId } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

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

export type CategoryRecord = Record<string, unknown>;

export function CategoryAreaChart<T extends CategoryRecord>({
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
  tooltipCursor = {
    stroke: "var(--color-desktop)",
    strokeWidth: 1,
    opacity: 0.2,
  },
  margin = DEFAULT_CHART_MARGIN,
  animationActive = false,
}: {
  data: T[];
  /** Row field used for the X axis (must exist on each datum). */
  categoryKey: string;
  /** Numeric row field for the area series. */
  valueKey: string;
  color?: string;
  formatCategoryTick?: (value: string) => string;
  formatTooltipCategory?: (label: string) => string;
  formatValueTick?: (value: number) => string;
  formatTooltipValue?: (
    value: number,
    payload: T | undefined,
  ) => React.ReactNode;
  /** When set, used as the upper Y bound; otherwise derived from data × yPaddingFactor. */
  yDomainMax?: number;
  yPaddingFactor?: number;
  emptyYMax?: number;
  tooltipCursor?: ComponentProps<typeof ChartTooltip>["cursor"];
  margin?: typeof DEFAULT_CHART_MARGIN;
  animationActive?: boolean;
}) {
  const reactId = useId().replace(/:/g, "");
  const gradientId = `category-area-gradient-${reactId}`;

  const numericValues = data.map((d) => Number(d[valueKey]));
  const yMax =
    yDomainMax ??
    chartPaddedUpperBound(
      numericValues.filter((n) => !Number.isNaN(n)),
      yPaddingFactor,
      emptyYMax,
    );

  return (
    <AreaChart data={data} margin={{ ...margin }}>
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
        hide={false}
        axisLine={false}
        tickLine={false}
        tickMargin={8}
        domain={[0, yMax]}
        stroke={CHART_AXIS_STROKE}
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
            labelFormatter={(label) =>
              formatTooltipCategory?.(String(label)) ?? String(label)
            }
            formatter={(value, _name, item) => {
              const payload = (item as { payload?: T } | undefined)?.payload;
              if (typeof value === "number") {
                return formatTooltipValue?.(value, payload) ?? String(value);
              }
              return value;
            }}
          />
        }
      />
      <Area
        type="monotone"
        dataKey={valueKey}
        stroke={color}
        strokeWidth={2.5}
        fill={`url(#${gradientId})`}
        dot={{
          r: 4,
          stroke: "white",
          strokeWidth: 2,
          fill: color,
        }}
        activeDot={{
          r: 6,
          stroke: color,
          strokeWidth: 2,
          fill: "#fff",
        }}
        isAnimationActive={animationActive}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="10%" stopColor={color} stopOpacity={0.6} />
          <stop offset="90%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
    </AreaChart>
  );
}
