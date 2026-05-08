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
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { usePeriod } from "@/providers/period-provider";
import { api } from "@/trpc/react";
import { duration, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type SortBy = "count" | "duration";
type TopType = "tracks" | "artists" | "albums";

type ListItem = {
  id: string;
  title: string;
  image: string | null;
  duration: number;
  count: number;
  album?: string;
  albumId?: string | null;
  artists?: string[];
  artistIds?: string[];
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
  type,
  item,
  countPercentage,
  durationPercentage,
  onPlay,
}: {
  rank: number;
  type: TopType;
  item: ListItem;
  countPercentage: number;
  durationPercentage: number;
  onPlay?: (trackId: string) => void;
}) {
  const href =
    type === "tracks"
      ? `/track/${item.id}`
      : type === "artists"
        ? `/artist/${item.id}`
        : item.id === "unknown"
          ? null
          : `/album/${item.id}`;
  const content = (
    <>
      <div className="text-muted-foreground w-8 shrink-0 text-right text-xl font-semibold">
        {rank}
      </div>
      <div className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
        {href ? (
          <Link href={href} className="block">
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
          </Link>
        ) : item.image ? (
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
        {onPlay ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay(item.id);
              }}
            >
              <PlayIcon className="size-3.5 fill-current" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="truncate text-sm font-semibold underline-offset-2 hover:underline"
          >
            {item.title}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold">{item.title}</p>
        )}
        {item.artists?.length ? (
          <p className="text-muted-foreground truncate text-xs">
            {item.artists.map((artist, index) => {
              const artistId = item.artistIds?.[index];
              return artistId ? (
                <span key={artistId}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/artist/${artistId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {artist}
                  </Link>
                </span>
              ) : (
                <span key={`${artist}-${index}`}>
                  {index > 0 ? ", " : ""}
                  {artist}
                </span>
              );
            })}
          </p>
        ) : null}
      </div>
      {item.album ? (
        <div className="hidden w-56 shrink-0 text-right text-xs lg:block">
          {item.albumId ? (
            <Link
              href={`/album/${item.albumId}`}
              className="text-muted-foreground truncate underline-offset-2 hover:underline"
            >
              {item.album}
            </Link>
          ) : (
            <p className="text-muted-foreground truncate">{item.album}</p>
          )}
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
  const periodInput = providerPeriodToQueryInput(selectedPeriod);
  const { mutate: playTrack } = api.control.play.useMutation();

  const songsQuery = api.dashboard.getTopTracks.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "tracks" },
  );
  const artistsQuery = api.dashboard.getTopArtists.useQuery(
    {
      ...periodInput,
      sortBy,
      limit: 20,
      cursorId: cursor?.cursorId,
      cursorValue: cursor?.cursorValue,
    },
    { enabled: type === "artists" },
  );
  const albumsQuery = api.dashboard.getTopAlbums.useQuery(
    {
      ...periodInput,
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
