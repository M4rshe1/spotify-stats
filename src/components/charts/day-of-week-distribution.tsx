"use client";

import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration as formatDuration, formatPercent } from "@/lib/utils";
import { api } from "@/trpc/react";

import { CategoryBarChart } from "./category-bar-chart";
import { SeriesChartCard } from "./series-chart-card";

type DayDatum = {
  date: string;
  duration: number;
  count: number;
  percentage: number;
};

export function DayOfWeekDistribution({ period }: { period: ProviderPeriod }) {
  const { data: result, isLoading } = api.chart.getDayOfWeekDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  const data: DayDatum[] =
    Array.isArray(result?.data) && result.data.length > 0
      ? result.data
      : [{ date: "Mon", duration: 0, count: 0, percentage: 0 }];

  const maxPercentage = Math.max(
    0,
    ...(result?.data?.map((d) => d.percentage) ?? []),
  );
  const yAxisMax = maxPercentage > 0 ? Math.ceil(maxPercentage * 1.1) : 1;

  return (
    <SeriesChartCard
      title="Listening by day"
      description="Share of listening time for each day of the week"
      chartConfig={{
        percentage: {
          label: "Listening by day",
          color: "var(--chart-1)",
        },
      }}
    >
      <CategoryBarChart<DayDatum>
        data={data}
        categoryKey="date"
        valueKey="percentage"
        yDomainMax={yAxisMax}
        formatValueTick={(value) => formatPercent(value)}
        formatTooltipValue={(value, payload) => (
          <div className="flex flex-col gap-1">
            <div>
              {formatDuration(payload?.duration ?? 0).toFormattedString(
                "{M} min",
              )}
            </div>
            <div>{formatPercent(value)} of total time listened</div>
            <div>
              {(payload?.count ?? 0).toLocaleString()} of{" "}
              {result?.totalCount?.toLocaleString() ?? "0"} tracks
            </div>
          </div>
        )}
      />
    </SeriesChartCard>
  );
}
