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

export function ExplicitSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getExplicitDistribution.useQuery(
    providerPeriodToQueryInput(period),
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
