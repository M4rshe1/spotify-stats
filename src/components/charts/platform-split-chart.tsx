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

export function PlatformSplitChart({ period, scope }: PeriodChartProps) {
  const query = api.chart.getPlatformDistribution.useQuery(
    providerPeriodToQueryInput(period, scope),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Platform split"
      description="Playback count grouped by platform for the selected period."
      data={data}
      chartConfig={toChartConfig("Plays", data)}
    />
  );
}
