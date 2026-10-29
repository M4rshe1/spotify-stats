"use client";

import type { MouseEvent, ReactNode } from "react";

import AllStatsPage from "@/app/(default)/all-stats/_components/all-stats-page";
import {
  TopListItem,
  type TopListItemData,
} from "@/components/top/top-list-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Spinner } from "@/components/ui/spinner";
import { usePlayTrack } from "@/lib/play";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { cn, duration, formatPercent } from "@/lib/utils";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";

const RANK_LIMIT = 10;

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0 && current <= 0) {
    return <p className="text-muted-foreground text-sm">No plays yet</p>;
  }
  if (previous <= 0) {
    return <p className="text-muted-foreground text-sm">New this period</p>;
  }
  const delta = ((current - previous) / previous) * 100;
  if (delta === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Same as the previous period
      </p>
    );
  }
  const up = delta > 0;
  return (
    <p className="text-muted-foreground text-sm">
      <span className={cn(up ? "text-success" : "text-destructive")}>
        {formatPercent(Math.abs(delta))} {up ? "more" : "less"}
      </span>
    </p>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        {detail}
      </CardContent>
    </Card>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function RankedList({
  title,
  description,
  type,
  items,
  totalCount,
  totalDuration,
  isLoading,
  isError,
  empty,
  onPlay,
}: {
  title: string;
  description: string;
  type: "tracks" | "artists";
  items: TopListItemData[];
  totalCount: number;
  totalDuration: number;
  isLoading: boolean;
  isError: boolean;
  empty: string;
  onPlay?: (trackId: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Spinner className="size-4" />
            Loading...
          </div>
        ) : isError ? (
          <p className="text-destructive text-sm">
            Failed to load {title.toLowerCase()}.
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <TopListItem
                key={item.id}
                rank={index + 1}
                type={type}
                item={item}
                countPercentage={
                  totalCount > 0 ? (item.count / totalCount) * 100 : 0
                }
                durationPercentage={
                  totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0
                }
                onPlay={onPlay}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminStatisticsPage() {
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);
  const { playTrack } = usePlayTrack();
  const overview = api.admin.statistics.getOverview.useQuery(periodInput);
  const listeners =
    api.admin.statistics.getListeningByUser.useQuery(periodInput);
  const tracks = api.admin.statistics.getTopTracks.useQuery({
    ...periodInput,
    limit: RANK_LIMIT,
  });
  const artists = api.admin.statistics.getTopArtists.useQuery({
    ...periodInput,
    limit: RANK_LIMIT,
  });

  const users = listeners.data ?? [];
  const totalDuration = users.reduce((sum, user) => sum + user.duration, 0);
  const maxDuration = Math.max(0, ...users.map((user) => user.duration));

  return (
    <div className="space-y-4">
      {overview.isLoading ? (
        <Loading />
      ) : overview.isError || !overview.data ? (
        <p className="text-destructive text-sm">
          Failed to load listening totals.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Accounts"
            value={overview.data.accounts.toLocaleString()}
            detail={
              <p className="text-muted-foreground text-sm">Registered users</p>
            }
          />
          <MetricCard
            title="Listeners"
            value={overview.data.listeners.toLocaleString()}
            detail={
              <Trend
                current={overview.data.listeners}
                previous={overview.data.previousListeners}
              />
            }
          />
          <MetricCard
            title="Plays"
            value={overview.data.plays.toLocaleString()}
            detail={
              <Trend
                current={overview.data.plays}
                previous={overview.data.previousPlays}
              />
            }
          />
          <MetricCard
            title="Time listened"
            value={duration(overview.data.duration).toFormattedString(
              "{M} min",
            )}
            detail={
              <Trend
                current={overview.data.duration}
                previous={overview.data.previousDuration}
              />
            }
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Time listened per user</CardTitle>
          <CardDescription>
            Every account, ranked by listening time in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listeners.isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Spinner className="size-4" />
              Loading...
            </div>
          ) : listeners.isError ? (
            <p className="text-destructive text-sm">Failed to load users.</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accounts yet.</p>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => {
                const share =
                  totalDuration > 0 ? (user.duration / totalDuration) * 100 : 0;
                const width =
                  maxDuration > 0 ? (user.duration / maxDuration) * 100 : 0;
                return (
                  <div
                    key={user.id}
                    className="bg-muted/30 flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="text-muted-foreground w-6 shrink-0 text-center text-sm font-semibold tabular-nums">
                      {index + 1}
                    </div>
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} alt="" />
                      <AvatarFallback>
                        {initials(user.name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {user.name || user.email}
                        </p>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : null}
                      </div>
                      <div className="bg-muted mt-1.5 h-1.5 w-full">
                        <div
                          className="bg-chart-1 h-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 space-y-0.5 text-right text-xs">
                      <p>
                        {duration(user.duration).toBestDurationString(false)}
                      </p>
                      <p className="text-muted-foreground">
                        {user.count.toLocaleString()}{" "}
                        {user.count === 1 ? "play" : "plays"} (
                        {formatPercent(share)})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedList
          title="Most listened songs"
          description="Tracks with the most listening time across every account."
          type="tracks"
          items={tracks.data?.items ?? []}
          totalCount={tracks.data?.totalCount ?? 0}
          totalDuration={tracks.data?.totalDuration ?? 0}
          isLoading={tracks.isLoading}
          isError={tracks.isError}
          empty="No tracks in this period."
          onPlay={playTrack}
        />
        <RankedList
          title="Top artists"
          description="Primary artists ranked by listening time across every account."
          type="artists"
          items={artists.data?.items ?? []}
          totalCount={artists.data?.totalCount ?? 0}
          totalDuration={artists.data?.totalDuration ?? 0}
          isLoading={artists.isLoading}
          isError={artists.isError}
          empty="No artists in this period."
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-sm font-medium">
            Listening breakdown
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Genres, devices, platforms, and the same charts as All Stats,
            combined across every account.
          </p>
        </div>
        <AllStatsPage scope="all" />
      </div>
    </div>
  );
}
