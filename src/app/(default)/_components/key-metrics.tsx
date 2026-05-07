"use client";

import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn, duration, formatPercentage } from "@/lib/utils";
import type { Period } from "@/lib/consts/periods";

export default function KeyMetrics({ period }: { period: Period }) {
  const { data: tracks, isLoading: isLoadingTracks } =
    api.dashboard.getKeyMetrics.useQuery({
      period,
    });

  if (isLoadingTracks) {
    return <Loading />;
  }

  if (!tracks) {
    return <div>No data</div>;
  }

  const tracksPercentage =
    ((tracks?.tracks - tracks?.previousTracks) / tracks?.previousTracks) * 100;
  const durationPercentage =
    ((tracks?.duration - tracks?.previousDuration) / tracks?.previousDuration) *
    100;
  const artistsPercentage =
    ((tracks?.artists - tracks?.previousArtists) / tracks?.previousArtists) *
    100;
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tracks Listened</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-5xl font-bold">{tracks.tracks}</p>
            {tracksPercentage > 0 ? (
              <TrendingUpIcon size={24} className="text-success" />
            ) : (
              <TrendingDownIcon size={24} className="text-destructive" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {Math.abs(tracks.tracks - tracks.previousTracks)} diff /{" "}
            <span
              className={cn(
                tracksPercentage > 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatPercentage(Math.abs(tracksPercentage))}{" "}
              {tracksPercentage > 0 ? "more" : "less"}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Duration Listened</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-5xl font-bold">
              {duration(tracks.duration).toFormattedString("{M}min")}
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
              {formatPercentage(Math.abs(durationPercentage))}{" "}
              {durationPercentage > 0 ? "more" : "less"}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Artists Listened</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-5xl font-bold">{tracks.artists}</p>
            {artistsPercentage > 0 ? (
              <TrendingUpIcon size={24} className="text-success" />
            ) : (
              <TrendingDownIcon size={24} className="text-destructive" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {Math.abs(tracks.artists - tracks.previousArtists)} diff /{" "}
            <span
              className={cn(
                artistsPercentage > 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatPercentage(Math.abs(artistsPercentage))}{" "}
              {artistsPercentage > 0 ? "more" : "less"}
            </span>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
