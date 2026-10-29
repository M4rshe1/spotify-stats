"use client";

import { NoDataCard } from "@/components/cards/no-data-card";
import {
  PlaybackHistoryItem,
  type PlaybackHistoryItemData,
} from "@/components/playback-history-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { usePlayTrack } from "@/lib/play";
import { api } from "@/trpc/react";
import { HistoryIcon } from "lucide-react";

export function RecentPlaysCard({
  plays,
  isLoading,
  emptyDescription,
  compact = false,
}: {
  plays: PlaybackHistoryItemData[] | undefined;
  isLoading: boolean;
  emptyDescription: string;
  compact?: boolean;
}) {
  const { playTrack } = usePlayTrack();

  if (isLoading) {
    return <Loading />;
  }

  if (!plays?.length) {
    return (
      <NoDataCard
        title="Most recent plays"
        icon={<HistoryIcon />}
        emptyTitle="No plays yet"
        description={emptyDescription}
      />
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Most recent plays</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0">
        <div className="space-y-2">
          {plays.map((item) => (
            <PlaybackHistoryItem
              key={item.id}
              item={item}
              onPlay={playTrack}
              compact={compact}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ArtistRecentPlays({
  id,
  compact = false,
}: {
  id: number;
  compact?: boolean;
}) {
  const { data, isLoading } = api.artist.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this artist."
      compact={compact}
    />
  );
}

export function AlbumRecentPlays({
  id,
  compact = false,
}: {
  id: number;
  compact?: boolean;
}) {
  const { data, isLoading } = api.album.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays from this album."
      compact={compact}
    />
  );
}

export function PlaylistRecentPlays({
  id,
  compact = false,
}: {
  id: number;
  compact?: boolean;
}) {
  const { data, isLoading } = api.playlist.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays from this playlist."
      compact={compact}
    />
  );
}

export function TrackRecentPlays({
  id,
  compact = false,
}: {
  id: number;
  compact?: boolean;
}) {
  const { data, isLoading } = api.track.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this track."
      compact={compact}
    />
  );
}

export function GenreRecentPlays({
  id,
  compact = false,
}: {
  id: number;
  compact?: boolean;
}) {
  const { data, isLoading } = api.genre.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this genre."
      compact={compact}
    />
  );
}
