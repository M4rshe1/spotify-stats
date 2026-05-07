"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";

export function DiffArtists({ period }: { period: ProviderPeriod }) {
  const { data, isLoading } = api.dashboard.getArtistsMetric.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <div>No data</div>;
  }

  const artistsPercentage =
    ((data.artists - data.previousArtists) / data.previousArtists) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artists Listened</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-5xl font-bold">{data.artists}</p>
          {artistsPercentage > 0 ? (
            <TrendingUpIcon size={24} className="text-success" />
          ) : (
            <TrendingDownIcon size={24} className="text-destructive" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {Math.abs(data.artists - data.previousArtists)} diff /{" "}
          <span
            className={cn(
              artistsPercentage > 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatPercent(Math.abs(artistsPercentage))}{" "}
            {artistsPercentage > 0 ? "more" : "less"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
