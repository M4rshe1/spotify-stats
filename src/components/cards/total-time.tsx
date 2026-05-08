"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn, duration, formatPercent } from "@/lib/utils";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";

export function TotalTime({ period }: { period: ProviderPeriod }) {
  const { data, isLoading } = api.dashboard.getDurationMetric.useQuery(
    providerPeriodToQueryInput(period),
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <div>No data</div>;
  }

  const durationPercentage =
    ((data.duration - data.previousDuration) / data.previousDuration) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duration</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-5xl font-bold">
            {duration(data.duration).toFormattedString("{M} min")}
          </p>
          {durationPercentage > 0 ? (
            <TrendingUpIcon size={24} className="text-success" />
          ) : (
            <TrendingDownIcon size={24} className="text-destructive" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          <span
            className={cn(
              durationPercentage > 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatPercent(Math.abs(durationPercentage))}{" "}
            {durationPercentage > 0 ? "more" : "less"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
