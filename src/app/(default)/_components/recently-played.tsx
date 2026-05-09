"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { api } from "@/trpc/react";
import {
  PlaybackHistoryItem,
  type PlaybackHistoryItemData,
} from "@/components/playback-history-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Spinner } from "@/components/ui/spinner";

export default function RecentlyPlayed({ period }: { period: ProviderPeriod }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<PlaybackHistoryItemData[]>([]);
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
      <CardContent className="min-h-0 overflow-y-scroll">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tracks found in this time range.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <PlaybackHistoryItem
                key={`${item.id}-${index}`}
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
