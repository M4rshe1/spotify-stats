"use client";

import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration as formatDuration, formatPercent, msToMin } from "@/lib/utils";
import { api } from "@/trpc/react";

import { CategoryBarChart } from "./category-bar-chart";
import { SeriesChartCard } from "./series-chart-card";

type YearDatum = {
  year: string;
  duration: number;
  minutes: number;
  count: number;
  percentage: number;
};

export function ReleaseYearDistribution({ period }: { period: ProviderPeriod }) {
  const { data: result, isLoading } = api.chart.getReleaseYearDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  const data: YearDatum[] =
    Array.isArray(result?.data) && result.data.length > 0
      ? result.data.map((row) => ({
          ...row,
          minutes: msToMin(row.duration),
        }))
      : [{ year: "—", duration: 0, minutes: 0, count: 0, percentage: 0 }];

  const maxMinutes = Math.max(0, ...data.map((d) => d.minutes));
  const yAxisMax = maxMinutes > 0 ? Math.ceil(maxMinutes * 1.1) : 1;

  return (
    <SeriesChartCard
      title="Listening by release year"
      description="Time listened grouped by track or album release year"
      chartConfig={{
        minutes: {
          label: "Minutes listened",
          color: "var(--chart-1)",
        },
      }}
    >
      <CategoryBarChart<YearDatum>
        data={data}
        categoryKey="year"
        valueKey="minutes"
        yDomainMax={yAxisMax}
        categoryAxisInterval="preserveStartEnd"
        formatValueTick={(value) => value.toLocaleString()}
        formatTooltipCategory={(label) => `Released ${label}`}
        formatTooltipValue={(_value, payload) => (
          <div className="flex flex-col gap-1">
            <div>
              {formatDuration(payload?.duration ?? 0).toFormattedString(
                "{M} min",
              )}
            </div>
            <div>
              {formatPercent(payload?.percentage ?? 0)} of total time listened
            </div>
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
