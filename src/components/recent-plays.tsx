"use client";

import { NoDataCard } from "@/components/cards/no-data-card";
import {
  PlaybackHistoryItem,
  type PlaybackHistoryItemData,
} from "@/components/playback-history-item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { api } from "@/trpc/react";
import { HistoryIcon } from "lucide-react";
import { toast } from "sonner";

export function RecentPlaysCard({
  plays,
  isLoading,
  emptyDescription,
}: {
  plays: PlaybackHistoryItemData[] | undefined;
  isLoading: boolean;
  emptyDescription: string;
}) {
  const { mutate: playTrack } = api.control.play.useMutation();

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
              onPlay={(trackId) =>
                playTrack(
                  { trackId },
                  {
                    onSuccess: () => toast.success("Track played"),
                    onError: () => toast.error("Failed to play track"),
                  },
                )
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ArtistRecentPlays({ id }: { id: number }) {
  const { data, isLoading } = api.artist.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this artist."
    />
  );
}

export function AlbumRecentPlays({ id }: { id: number }) {
  const { data, isLoading } = api.album.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays from this album."
    />
  );
}

export function TrackRecentPlays({ id }: { id: number }) {
  const { data, isLoading } = api.track.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this track."
    />
  );
}

export function GenreRecentPlays({ id }: { id: number }) {
  const { data, isLoading } = api.genre.recentPlaybacks.useQuery({ id });
  return (
    <RecentPlaysCard
      plays={data}
      isLoading={isLoading}
      emptyDescription="No recent plays for this genre."
    />
  );
}
