"use client";

import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { PlayIcon } from "lucide-react";
import { toast } from "sonner";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { duration } from "@/lib/utils";

function formatRelativePlayedAt(playedAt: Date) {
  return formatDistanceToNowStrict(new Date(playedAt), {
    addSuffix: true,
    unit: undefined,
  });
}

export default function RecentlyPlayed({ period }: { period: ProviderPeriod }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<
    {
      id: number;
      trackId: number;
      image: string | null;
      title: string;
      artists: string[];
      artistIds: number[];
      duration: number;
      playedAt: Date;
      albumId: number | null;
      album: string;
    }[]
  >([]);
  const [cursor, setCursor] = useState<{
    cursorPlayedAt: Date;
    cursorId: number;
  } | null>(null);

  const { data, isLoading, isFetching, isError } =
    api.dashboard.getRecentlyPlayed.useQuery({
      ...providerPeriodToQueryInput(period),
      limit: 20,
      cursorPlayedAt: cursor?.cursorPlayedAt,
      cursorId: cursor?.cursorId,
    });
  const { mutate: playTrack } = api.control.play.useMutation();

  const hasNextPage = Boolean(data?.nextCursor);

  const periodResetKey =
    period.type === "custom"
      ? `custom:${period.from.getTime()}:${period.end.getTime()}`
      : period.type;

  useEffect(() => {
    setCursor(null);
    setItems([]);
  }, [periodResetKey]);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => {
      if (!cursor) {
        return data.items;
      }
      const known = new Set(prev.map((entry) => entry.id));
      const incoming = data.items.filter((entry) => !known.has(entry.id));
      return [...prev, ...incoming];
    });
  }, [cursor, data]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isFetching || !data?.nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          setCursor((prev) => {
            const next = data.nextCursor;
            if (!next) {
              return prev;
            }
            if (
              prev?.cursorId === next.cursorId &&
              prev?.cursorPlayedAt.getTime() === next.cursorPlayedAt.getTime()
            ) {
              return prev;
            }
            return next;
          });
        }
      },
      {
        rootMargin: "240px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [data?.nextCursor, hasNextPage, isFetching, items.length]);

  if (isLoading && items.length === 0) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recently played</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          Failed to load recently played tracks.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Recently played</CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-scoll min-h-0">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tracks found in this time range.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="bg-muted/30 relative isolate overflow-hidden rounded-md border"
              >
                <CoverTintBackdrop
                  coverUrl={item.image}
                  className="rounded-md"
                />
                <div className="relative z-10 flex items-center gap-3 p-2">
                  <div className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
                    <Link href={`/track/${item.trackId}`} className="block">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playTrack(
                            { trackId: item.trackId },
                            {
                              onSuccess: () => toast.success("Track played"),
                              onError: () =>
                                toast.error("Failed to play track"),
                            },
                          );
                        }}
                      >
                        <PlayIcon className="size-3.5 fill-current" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/track/${item.trackId}`}
                      className="truncate text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {item.artists.length > 0
                        ? item.artists.map((artist, artistIndex) => {
                            const artistId = item.artistIds[artistIndex];
                            return artistId ? (
                              <span key={artistId}>
                                {artistIndex > 0 ? ", " : ""}
                                <Link
                                  href={`/artist/${artistId}`}
                                  className="underline-offset-2 hover:underline"
                                >
                                  {artist}
                                </Link>
                              </span>
                            ) : (
                              <span key={`${artist}-${artistIndex}`}>
                                {artistIndex > 0 ? ", " : ""}
                                {artist}
                              </span>
                            );
                          })
                        : "Unknown Artist"}
                    </p>
                  </div>
                  <div className="hidden w-56 truncate text-right text-xs xl:block">
                    {item.albumId ? (
                      <Link
                        href={`/album/${item.albumId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {item.album}
                      </Link>
                    ) : (
                      item.album
                    )}
                  </div>
                  <div className="hidden w-28 text-right text-xs md:block">
                    {duration(item.duration).toBestDurationString(false)}
                  </div>
                  <div className="hidden w-64 text-right text-xs lg:block">
                    {format(new Date(item.playedAt), "HH:mm")}{" "}
                    <span className="text-muted-foreground">
                      ({formatRelativePlayedAt(item.playedAt)})
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div
              ref={loadMoreRef}
              className="flex h-10 items-center justify-center"
            >
              {isFetching && items.length > 0 ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Spinner className="size-3" />
                  Loading more...
                </div>
              ) : hasNextPage ? (
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
