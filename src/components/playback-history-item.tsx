"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { PlayIcon } from "lucide-react";

import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { duration } from "@/lib/utils";

export type PlaybackHistoryItemData =
  RouterOutputs["album"]["recentPlaybacks"][number];

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
      <div className="relative z-10 grid min-w-0 items-center gap-x-4 px-4 py-3 md:grid-cols-[3rem_1.5fr_1fr] lg:grid-cols-[3rem_1.5fr_1fr_1fr] xl:grid-cols-[3rem_1.5fr_1fr_1fr_auto_auto]">
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
        {/* Title & Artists */}
        <div className="flex min-w-0 flex-col justify-center">
          <Link
            href={`/track/${item.trackId}`}
            className="truncate text-sm font-semibold underline-offset-2 hover:underline"
            title={item.title}
          >
            {item.title}
          </Link>
          <p className="text-muted-foreground w-full truncate text-xs">
            {item.artists.length > 0
              ? item.artists.map((artist, index) => {
                  return artist.id ? (
                    <span key={artist.id}>
                      {index > 0 ? ", " : ""}
                      <Link
                        href={`/artist/${artist.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {artist.name}
                      </Link>
                    </span>
                  ) : (
                    <span key={`${artist.name}-${index}`}>
                      {index > 0 ? ", " : ""}
                      {artist.name}
                    </span>
                  );
                })
              : "Unknown Artist"}
          </p>
        </div>
        {/* Playlist */}
        <div className="hidden max-w-[14rem] min-w-[6rem] items-center truncate text-right text-xs xl:flex">
          {item.playlist?.id ? (
            <Link
              href={`/playlist/${item.playlist.id}`}
              className="flex items-center gap-1 underline-offset-2 hover:underline"
              title={item.playlist.name ?? undefined}
            >
              {item.playlist.image && (
                <img
                  src={item.playlist.image ?? ""}
                  alt={item.playlist.name ?? ""}
                  className="size-4 rounded-xs object-cover"
                />
              )}
              {item.playlist.name}
            </Link>
          ) : (
            (item.playlist?.name ?? <span>&mdash;</span>)
          )}
        </div>
        {/* Album */}
        <div className="hidden max-w-[14rem] min-w-[6rem] truncate text-right text-xs xl:block">
          {item.album.id ? (
            <Link
              href={`/album/${item.album.id}`}
              className="underline-offset-2 hover:underline"
              title={item.album.name}
            >
              {item.album.name}
            </Link>
          ) : (
            item.album.name
          )}
        </div>
        {/* Duration */}
        <div className="hidden max-w-[5.5rem] min-w-[4rem] text-right text-xs lg:block">
          {duration(item.duration).toBestDurationString(false)}
        </div>
        {/* Played at (time && relative) */}
        <div className="flex w-full max-w-[8rem] min-w-fit items-center justify-end gap-1 text-right text-xs whitespace-nowrap">
          {format(new Date(item.playedAt), "HH:mm")}{" "}
          <span className="text-muted-foreground">
            ({formatRelativePlayedAt(item.playedAt)})
          </span>
        </div>
      </div>
    </div>
  );
}
