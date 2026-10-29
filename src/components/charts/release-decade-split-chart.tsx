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

export function ReleaseDecadeSplitChart({ period, scope }: PeriodChartProps) {
  const query = api.chart.getReleaseDecadeDistribution.useQuery(
    providerPeriodToQueryInput(period, scope),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Release decade"
      description="Listening time by release decade of album or track"
      data={data}
      chartConfig={toChartConfig("Decade", data)}
    />
  );
}
