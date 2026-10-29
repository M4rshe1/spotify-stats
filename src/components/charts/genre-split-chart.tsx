"use client";

import { Loading } from "@/components/ui/loading";
import {
  providerPeriodToQueryInput,
  type PeriodChartProps,
} from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import {
  DistributionPieCard,
  toChartConfig,
  toChartData,
} from "@/components/charts/distribution-pie-card";

export function GenreSplitChart({ period, scope }: PeriodChartProps) {
  const query = api.chart.getGenreDistribution.useQuery(
    providerPeriodToQueryInput(period, scope),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Genre split"
      description="Listening time by genre (top 8 plus other)"
      data={data}
      chartConfig={toChartConfig("Genres", data)}
    />
  );
}
