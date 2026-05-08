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

export function DeviceSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getDeviceDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);

  return (
    <DistributionPieCard
      title="Device split"
      description="Playback count grouped by device for the selected period."
      data={data}
      chartConfig={toChartConfig("Plays", data)}
    />
  );
}
