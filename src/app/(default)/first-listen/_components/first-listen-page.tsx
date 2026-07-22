"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";
import { usePlayTrack } from "@/lib/play";
import { FirstListenListItem } from "./fist-list-item";
import type {
  FirstListenEntityType,
  FirstListenListItemData,
} from "./fist-list-item";

type FirstListenType = FirstListenEntityType;

const meta: Record<
  FirstListenType,
  { title: string; empty: string; error: string }
> = {
  tracks: {
    title: "First time listened tracks",
    empty: "No tracks found in this time range.",
    error: "Failed to load first time listened tracks.",
  },
  artists: {
    title: "First time listened artists",
    empty: "No artists found in this time range.",
    error: "Failed to load first time listened artists.",
  },
  albums: {
    title: "First time listened albums",
    empty: "No albums found in this time range.",
    error: "Failed to load first time listened albums.",
  },
  genres: {
    title: "First time listened genres",
    empty: "No genres found in this time range.",
    error: "Failed to load first time listened genres.",
  },
  playlists: {
    title: "First time listened playlists",
    empty: "No playlists found in this time range.",
    error: "Failed to load first time listened playlists.",
  },
};

export default function FirstListenPage({ type }: { type: FirstListenType }) {
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);
  const { playTrack } = usePlayTrack();

  const tracksQuery = api.first.getFirstListenTracks.useQuery(
    {
      ...periodInput,
    },
    { enabled: type === "tracks" },
  );
  const artistsQuery = api.first.getFirstListenArtists.useQuery(
    {
      ...periodInput,
    },
    { enabled: type === "artists" },
  );
  const albumsQuery = api.first.getFirstListenAlbums.useQuery(
    {
      ...periodInput,
    },
    { enabled: type === "albums" },
  );
  const genresQuery = api.first.getFirstListenGenres.useQuery(
    {
      ...periodInput,
    },
    { enabled: type === "genres" },
  );
  const playlistsQuery = api.first.getFirstListenPlaylists.useQuery(
    {
      ...periodInput,
    },
    { enabled: type === "playlists" },
  );
  const query =
    type === "tracks"
      ? tracksQuery
      : type === "artists"
        ? artistsQuery
        : type === "albums"
          ? albumsQuery
          : type === "genres"
            ? genresQuery
            : playlistsQuery;

  const data = query.data;
  const items = (data?.items as FirstListenListItemData[]) ?? [];

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{meta[type].title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading && items.length === 0 ? (
          <Loading className="h-full border-none" />
        ) : query.isError ? (
          <p className="text-destructive text-sm">{meta[type].error}</p>
        ) : (
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {meta[type].empty}
              </p>
            ) : (
              items.map((item) => {
                return (
                  <FirstListenListItem
                    key={item.id}
                    type={type}
                    item={item}
                    onPlay={type === "tracks" ? playTrack : undefined}
                  />
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
