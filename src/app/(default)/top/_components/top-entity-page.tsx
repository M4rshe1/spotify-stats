"use client";

import { useEffect, useRef, useState } from "react";
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
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";
import { duration, formatPercent } from "@/lib/utils";
import { toast } from "sonner";

type SortBy = "count" | "duration";
type TopType = "tracks" | "artists" | "albums";

type ListItem = {
  id: string;
  title: string;
  image: string | null;
  duration: number;
  count: number;
  album?: string;
  artists?: string[];
};

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
};

function TopListItem({
  rank,
  item,
  countPercentage,
  durationPercentage,
  isPlayable,
  onPlay,
}: {
  rank: number;
  item: ListItem;
  countPercentage: number;
  durationPercentage: number;
  isPlayable: boolean;
  onPlay?: (trackId: string) => void;
}) {
  const content = (
    <>
      <div className="text-muted-foreground w-8 shrink-0 text-right text-sm font-semibold">
        {rank}
      </div>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="h-12 w-12 object-cover"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center text-xs">
            No img
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        {item.artists?.length ? (
          <p className="text-muted-foreground truncate text-xs">
            {item.artists.join(", ")}
          </p>
        ) : null}
      </div>
      {item.album ? (
        <div className="hidden w-56 shrink-0 text-right text-xs lg:block">
          <p className="text-muted-foreground truncate">{item.album}</p>
        </div>
      ) : null}
      <div className="space-y-0.5 text-right text-xs">
        <p>
          {item.count} plays ({formatPercent(countPercentage)})
        </p>
        <p className="text-muted-foreground">
          {duration(item.duration).toMinutes()} min (
          {formatPercent(durationPercentage)})
        </p>
      </div>
    </>
  );

  if (isPlayable && onPlay) {
    return (
      <button
        type="button"
        className="bg-muted/30 hover:bg-muted/50 flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors"
        onClick={() => onPlay(item.id)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-muted/30 flex w-full items-center gap-3 rounded-md border p-2">
      {content}
    </div>
  );
}

export default function TopEntityPage({ type }: { type: TopType }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("duration");
  const [items, setItems] = useState<ListItem[]>([]);
  const [cursor, setCursor] = useState<{
    cursorId: string;
    cursorValue: number;
  } | null>(null);
  const { selectedPeriod } = usePeriod();
  const { mutate: playTrack } = api.control.play.useMutation();
  const { data: preferredPeriod } = api.user.getPreferredPeriod.useQuery();
  const from =
    selectedPeriod === "custom"
      ? (preferredPeriod?.customStart ?? undefined)
      : undefined;
  const to =
    selectedPeriod === "custom"
      ? (preferredPeriod?.customEnd ?? undefined)
      : undefined;

  const songsQuery = api.dashboard.getTopSongs.useQuery(
    {
      period: selectedPeriod,
      from,
      to,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "tracks" },
  );
  const artistsQuery = api.dashboard.getTopArtists.useQuery(
    {
      period: selectedPeriod,
      from,
      to,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "artists" },
  );
  const albumsQuery = api.dashboard.getTopAlbums.useQuery(
    {
      period: selectedPeriod,
      from,
      to,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "albums" },
  );

  const query =
    type === "tracks"
      ? songsQuery
      : type === "artists"
        ? artistsQuery
        : albumsQuery;
  const data = query.data;
  const totalCount = data?.totalCount ?? 0;
  const totalDuration = data?.totalDuration ?? 0;

  useEffect(() => {
    setItems([]);
    setCursor(null);
  }, [selectedPeriod, from?.getTime(), to?.getTime(), sortBy, type]);

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
  }, [data?.nextCursor, query.isFetching]);

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
                    item={item}
                    countPercentage={countPercentage}
                    durationPercentage={durationPercentage}
                    isPlayable={type === "tracks"}
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
