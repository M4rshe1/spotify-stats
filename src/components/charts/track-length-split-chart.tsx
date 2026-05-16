"use client";

import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import {
  DistributionPieCard,
  toChartConfig,
  toChartData,
} from "@/components/charts/distribution-pie-card";

export function TrackLengthSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getTrackLengthDistribution.useQuery(
    providerPeriodToQueryInput(period),
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
