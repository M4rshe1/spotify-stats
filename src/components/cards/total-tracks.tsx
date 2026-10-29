"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";

export function TotalPlays({ period }: { period: ProviderPeriod }) {
  const { data, isLoading } = api.dashboard.getPlaysMetric.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <div>No data</div>;
  }

  const playsPercentage =
    ((data.plays - data.previousPlays) / data.previousPlays) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plays</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-5xl font-bold">{data.plays.toLocaleString()}</p>
          {playsPercentage > 0 ? (
            <TrendingUpIcon size={24} className="text-success" />
          ) : (
            <TrendingDownIcon size={24} className="text-destructive" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {Math.abs(data.plays - data.previousPlays).toLocaleString()} diff /{" "}
          <span
            className={cn(
              playsPercentage > 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatPercent(Math.abs(playsPercentage))}{" "}
            {playsPercentage > 0 ? "more" : "less"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
