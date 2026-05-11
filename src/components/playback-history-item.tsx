"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { PlayIcon } from "lucide-react";

import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { duration } from "@/lib/utils";

export type PlaybackHistoryItemData =
  RouterOutputs["dashboard"]["getRecentlyPlayed"]["items"][number];

function formatRelativePlayedAt(playedAt: Date | string) {
  return formatDistanceToNowStrict(new Date(playedAt), {
    addSuffix: true,
    unit: undefined,
  });
}

export function PlaybackHistoryItem({
  item,
  onPlay,
}: {
  item: PlaybackHistoryItemData;
  onPlay: (trackId: number) => void;
}) {
  return (
    <div className="bg-muted/30 relative isolate overflow-hidden rounded-md border">
      <CoverTintBackdrop coverUrl={item.image} className="rounded-md" />
      <div className="relative z-10 grid min-w-0 grid-cols-1 items-center gap-3 gap-x-6 p-2 sm:grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto] lg:grid-cols-[auto_1fr_auto_auto_auto]">
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
                onPlay(item.trackId);
              }}
            >
              <PlayIcon className="size-3.5 fill-current" />
            </Button>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/track/${item.trackId}`}
            className="block truncate text-sm font-semibold underline-offset-2 hover:underline"
            title={item.title}
          >
            {item.title}
          </Link>
          <p className="text-muted-foreground w-full truncate text-xs">
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
        <div className="hidden max-w-[14rem] min-w-[6rem] truncate text-right text-xs xl:block">
          {item.albumId ? (
            <Link
              href={`/album/${item.albumId}`}
              className="underline-offset-2 hover:underline"
              title={item.album}
            >
              {item.album}
            </Link>
          ) : (
            item.album
          )}
        </div>
        <div className="hidden max-w-[5.5rem] min-w-fit text-right text-xs md:block">
          {duration(item.duration).toBestDurationString(false)}
        </div>
        <div className="hidden max-w-[14rem] min-w-fit text-right text-xs whitespace-nowrap lg:block">
          {format(new Date(item.playedAt), "HH:mm")}{" "}
          <span className="text-muted-foreground">
            ({formatRelativePlayedAt(item.playedAt)})
          </span>
        </div>
      </div>
    </div>
  );
}
