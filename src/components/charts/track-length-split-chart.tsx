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

export function TrackLengthSplitChart({ period, scope }: PeriodChartProps) {
  const query = api.chart.getTrackLengthDistribution.useQuery(
    providerPeriodToQueryInput(period, scope),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Track length"
      description="Listening time grouped by track duration"
      data={data}
      chartConfig={toChartConfig("Length", data)}
    />
  );
}
