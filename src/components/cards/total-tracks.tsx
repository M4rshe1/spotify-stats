"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";
import type { Period } from "@/lib/consts/periods";

export function TotalTracks({ period }: { period: Period }) {
  const { data, isLoading } = api.dashboard.getTracksMetric.useQuery({
    period,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <div>No data</div>;
  }

  const tracksPercentage = ((data.tracks - data.previousTracks) / data.previousTracks) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracks Listened</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-5xl font-bold">{data.tracks}</p>
          {tracksPercentage > 0 ? (
            <TrendingUpIcon size={24} className="text-success" />
          ) : (
            <TrendingDownIcon size={24} className="text-destructive" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {Math.abs(data.tracks - data.previousTracks)} diff /{" "}
          <span className={cn(tracksPercentage > 0 ? "text-success" : "text-destructive")}>
            {formatPercentage(Math.abs(tracksPercentage))} {tracksPercentage > 0 ? "more" : "less"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
