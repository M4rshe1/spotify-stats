"use client";

import { useEffect, useRef, useState } from "react";
import {
  TopListItem,
  type TopListEntityType,
  type TopListItemData,
} from "@/components/top/top-list-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type SortBy = "count" | "duration";
type TopType = TopListEntityType;

const meta: Record<TopType, { title: string; empty: string; error: string }> = {
  tracks: {
    title: "Top songs",
    empty: "No songs found in this time range.",
    error: "Failed to load top songs.",
  },
  artists: {
    title: "Top artists",
    empty: "No artists found in this time range.",
    error: "Failed to load top artists.",
  },
  albums: {
    title: "Top albums",
    empty: "No albums found in this time range.",
    error: "Failed to load top albums.",
  },
  genres: {
    title: "Top genres",
    empty: "No genres found in this time range.",
    error: "Failed to load top genres.",
  },
};

export default function TopEntityPage({ type }: { type: TopType }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const [items, setItems] = useState<TopListItemData[]>([]);
  const [cursor, setCursor] = useState<{
    cursorId: number;
    cursorValue: number;
  } | null>(null);
  const { selectedPeriod } = usePeriod();
  const periodInput = providerPeriodToQueryInput(selectedPeriod);
  const { mutate: playTrack } = api.control.play.useMutation();

  const songsQuery = api.top.getTopTracks.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "tracks" },
  );
  const artistsQuery = api.top.getTopArtists.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "artists" },
  );
  const albumsQuery = api.top.getTopAlbums.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "albums" },
  );
  const genresQuery = api.top.getTopGenres.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "genres" },
  );

  const query =
    type === "tracks"
      ? songsQuery
      : type === "artists"
        ? artistsQuery
        : type === "albums"
          ? albumsQuery
          : genresQuery;
  const data = query.data;
  const totalCount = data?.totalCount ?? 0;
  const totalDuration = data?.totalDuration ?? 0;

  useEffect(() => {
    setItems([]);
    setCursor(null);
  }, [selectedPeriod, sortBy, type]);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => {
      if (!cursor) return data.items;
      const known = new Set(prev.map((entry) => entry.id));
      const incoming = data.items.filter((entry) => !known.has(entry.id));
      return [...prev, ...incoming];
    });
  }, [cursor, data]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !data?.nextCursor || query.isFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setCursor((prev) => {
          const next = data.nextCursor;
          if (!next) return prev;
          if (
            prev?.cursorId === next.cursorId &&
            prev.cursorValue === next.cursorValue
          ) {
            return prev;
          }
          return next;
        });
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [data?.nextCursor, query.isFetching, items.length]);

  return (
    <Card className="h-full min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{meta[type].title}</CardTitle>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortBy)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">Sort by duration</SelectItem>
            <SelectItem value="count">Sort by play count</SelectItem>
          </SelectContent>
        </Select>
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
              items.map((item, index) => {
                const countPercentage =
                  totalCount > 0 ? (item.count / totalCount) * 100 : 0;
                const durationPercentage =
                  totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0;
                return (
                  <TopListItem
                    key={item.id}
                    rank={index + 1}
                    type={type}
                    item={item}
                    countPercentage={countPercentage}
                    durationPercentage={durationPercentage}
                    onPlay={
                      type === "tracks"
                        ? (trackId) =>
                            playTrack(
                              { trackId },
                              {
                                onSuccess: () => toast.success("Track played"),
                                onError: () =>
                                  toast.error("Failed to play track"),
                              },
                            )
                        : undefined
                    }
                  />
                );
              })
            )}
            <div
              ref={loadMoreRef}
              className="flex h-10 items-center justify-center"
            >
              {query.isFetching && items.length > 0 ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Spinner className="size-3" />
                  Loading more...
                </div>
              ) : data?.nextCursor ? (
                <span className="text-muted-foreground text-xs">
                  Scroll to load more
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  You reached the end
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
