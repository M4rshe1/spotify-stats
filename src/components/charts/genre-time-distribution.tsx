"use client";

import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration as formatDuration, formatPercent } from "@/lib/utils";
import { api } from "@/trpc/react";

import { CategoryBarChart } from "./category-bar-chart";
import { SeriesChartCard } from "./series-chart-card";

type HourDatum = {
  date: string;
  duration: number;
  count: number;
  percentage: number;
};

export function GenreTimeDistribution({
  genreId,
  period,
}: {
  genreId: number;
  period: ProviderPeriod;
}) {
  const queryEnabled = Number.isFinite(genreId) && genreId > 0;

  const { data: result, isLoading } =
    api.chart.getGenreTimeDistribution.useQuery(
      {
        ...providerPeriodToQueryInput(period),
        genreId,
      },
      { enabled: queryEnabled },
    );

  if (!queryEnabled) {
    return null;
  }

  if (isLoading) {
    return <Loading />;
  }

  const data: HourDatum[] =
    Array.isArray(result?.data) && result.data.length > 0
      ? result.data
      : [{ date: "00", duration: 0, count: 0, percentage: 0 }];

  const maxPercentage = Math.max(
    0,
    ...(result?.data?.map((d) => d.percentage) ?? []),
  );
  const yAxisMax = maxPercentage > 0 ? Math.ceil(maxPercentage * 1.1) : 1;

  return (
    <SeriesChartCard
      title="This genre by hour"
      description="When you played tracks from this genre during the day"
      chartConfig={{
        genreHourPercent: {
          label: "Share by hour",
          color: "var(--chart-1)",
        },
      }}
    >
      <CategoryBarChart<HourDatum>
        data={data}
        categoryKey="date"
        valueKey="percentage"
        yDomainMax={yAxisMax}
        formatCategoryTick={(value) => value}
        formatTooltipCategory={(_label, payload) => {
          const items = payload as { payload?: HourDatum }[] | undefined;
          const row = items?.[0]?.payload;
          return row?.date != null ? `${row.date}:00` : "";
        }}
        formatValueTick={(value) => formatPercent(value)}
        formatTooltipValue={(value, payload) => (
          <div className="flex flex-col gap-1">
            <div>
              {formatDuration(payload?.duration ?? 0).toFormattedString(
                "{M} min",
              )}
            </div>
            <div>{formatPercent(value)} of this genre in the period</div>
            <div>
              {(payload?.count ?? 0).toLocaleString()} of{" "}
              {result?.totalCount?.toLocaleString() ?? "0"} plays
            </div>
          </div>
        )}
      />
    </SeriesChartCard>
  );
}
