"use client";

import { format } from "date-fns";

import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { periods } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration as formatDuration } from "@/lib/utils";
import { api } from "@/trpc/react";

import { CategoryAreaChart } from "./category-area-chart";
import { SeriesChartCard } from "./series-chart-card";

export function AlbumTimeListened({
  albumId,
  period,
}: {
  albumId: number;
  period: ProviderPeriod;
}) {
  const queryEnabled = Number.isFinite(albumId) && albumId > 0;

  const { data: tracks, isLoading: isLoadingTracks } =
    api.chart.getAlbumTimeListened.useQuery(
      {
        ...providerPeriodToQueryInput(period),
        albumId,
      },
      { enabled: queryEnabled },
    );

  if (!queryEnabled) {
    return null;
  }

  if (isLoadingTracks) {
    return <Loading />;
  }

  const grouping = tracks?.grouping;

  const data =
    Array.isArray(tracks?.data) && tracks.data.length > 0
      ? tracks.data
      : [{ date: "", duration: 0 }];

  function formatCategoryTick(value: string) {
    switch (grouping) {
      case "hour":
        return `${value}:00`;
      case "day":
        return format(new Date(value), "d. MMM");
      case "month":
        return format(new Date(value), "MMM yyyy");
      case "year":
        return format(new Date(value), "yyyy");
      default:
        return value;
    }
  }

  function formatTooltipCategory(label: string) {
    switch (grouping) {
      case "day":
        return format(new Date(label), "EE, d. MMM");
      case "month":
        return format(new Date(label), "MMM yyyy");
      case "year":
        return format(new Date(label), "yyyy");
      default:
        return label;
    }
  }

  return (
    <SeriesChartCard
      title={
        <>
          Time listened{" "}
          <span className="text-muted-foreground text-sm">(this album)</span>
        </>
      }
      description={periods[period.type]?.label}
      chartConfig={{
        albumTimeListened: {
          label: "Time listened",
          color: "var(--chart-1)",
        },
      }}
    >
      <CategoryAreaChart
        data={data}
        categoryKey="date"
        valueKey="duration"
        formatCategoryTick={formatCategoryTick}
        formatTooltipCategory={formatTooltipCategory}
        formatValueTick={(value) =>
          formatDuration(value).toFormattedString("{M}")
        }
        formatTooltipValue={(value) => (
          <div className="flex flex-col gap-1">
            <div>{formatDuration(value).toFormattedString("{M} min")}</div>
          </div>
        )}
      />
    </SeriesChartCard>
  );
}
