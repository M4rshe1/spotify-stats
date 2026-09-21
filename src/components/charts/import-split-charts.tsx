"use client";

import { UploadIcon } from "lucide-react";

import { Loading } from "@/components/ui/loading";
import { NoDataCard } from "@/components/cards/no-data-card";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import {
  DistributionPieCard,
  toChartConfig,
  toChartData,
} from "@/components/charts/distribution-pie-card";

const IMPORT_EMPTY_DESCRIPTION =
  "These details come from Spotify's extended streaming history export, not from the live API.";

function ImportSplitChart({
  title,
  description,
  emptyTitle,
  query,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  query: {
    isLoading: boolean;
    data?: { name: string; value: number; duration: number }[];
  };
}) {
  if (query.isLoading) {
    return <Loading />;
  }

  const data = toChartData(query.data ?? []);
  if (data.length === 0) {
    return (
      <NoDataCard
        title={title}
        icon={<UploadIcon />}
        emptyTitle={emptyTitle}
        description={IMPORT_EMPTY_DESCRIPTION}
      />
    );
  }

  return (
    <DistributionPieCard
      title={title}
      description={description}
      data={data}
      chartConfig={toChartConfig("Plays", data)}
    />
  );
}

export function SkipSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getSkipDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );
  return (
    <ImportSplitChart
      title="Skip split"
      description="Plays marked skipped vs completed in your extended history"
      emptyTitle="No skip data in this period"
      query={query}
    />
  );
}

export function ShuffleSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getShuffleDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );
  return (
    <ImportSplitChart
      title="Shuffle split"
      description="Shuffle vs sequential playback from your extended history"
      emptyTitle="No shuffle data in this period"
      query={query}
    />
  );
}

export function CountrySplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getCountryDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );
  return (
    <ImportSplitChart
      title="Country split"
      description="Listening time by the country Spotify recorded for each play"
      emptyTitle="No country data in this period"
      query={query}
    />
  );
}

export function ReasonEndSplitChart({ period }: { period: ProviderPeriod }) {
  const query = api.chart.getReasonEndDistribution.useQuery(
    providerPeriodToQueryInput(period),
  );
  return (
    <ImportSplitChart
      title="How plays ended"
      description="Why each play stopped: finished, skipped, or left early"
      emptyTitle="No end-reason data in this period"
      query={query}
    />
  );
}
