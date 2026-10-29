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

export function ExplicitSplitChart({ period, scope }: PeriodChartProps) {
  const query = api.chart.getExplicitDistribution.useQuery(
    providerPeriodToQueryInput(period, scope),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Explicit vs clean"
      description="Share of listening time on explicit vs non-explicit tracks"
      data={data}
      chartConfig={toChartConfig("Tracks", data)}
    />
  );
}
