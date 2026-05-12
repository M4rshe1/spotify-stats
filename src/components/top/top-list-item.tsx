"use client";

import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { Button } from "@/components/ui/button";
import { duration, formatPercent } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import Link from "next/link";

export type TopListEntityType =
  | "tracks"
  | "artists"
  | "albums"
  | "genres"
  | "playlists";

function getHref(type: TopListEntityType, id: number) {
  switch (type) {
    case "tracks":
      return `/track/${id}`;
    case "artists":
      return `/artist/${id}`;
    case "genres":
      return `/genre/${id}`;
    case "albums":
      return `/album/${id}`;
    case "playlists":
      return `/playlist/${id}`;
    default:
      return null;
  }
}

export type TopListItemData = {
  id: number;
  name: string;
  image: string | null;
  duration: number;
  count: number;
  album?: string;
  albumId?: number | null;
  artists?: string[];
  artistIds?: number[];
};

export function TopListItem({
  rank,
  type,
  item,
  countPercentage,
  durationPercentage,
  onPlay,
}: {
  rank: number;
  type: TopListEntityType;
  item: TopListItemData;
  countPercentage: number;
  durationPercentage: number;
  onPlay?: (trackId: number) => void;
}) {
  const href = getHref(type, item.id);
  const content = (
    <>
      <div className="text-muted-foreground w-8 shrink-0 text-right text-xl font-semibold">
        {rank}
      </div>
      {item.image ? (
        <div className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
          {href ? (
            <Link href={href} className="block">
              <img
                src={item.image}
                alt={item.name}
                className="h-12 w-12 object-cover"
              />
            </Link>
          ) : (
            <img
              src={item.image}
              alt={item.name}
              className="h-12 w-12 object-cover"
            />
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
      ) : null}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="block w-full max-w-full truncate text-sm font-semibold underline-offset-2 hover:underline"
          >
            {item.name}
          </Link>
        ) : (
          <p className="block w-full max-w-full truncate text-sm font-semibold">
            {item.name}
          </p>
        )}
        {item.artists?.length ? (
          <p className="text-muted-foreground block w-full max-w-full truncate text-xs">
            {item.artists.map((artist, index) => {
              const artistId = item.artistIds?.[index];
              return artistId ? (
                <span key={artistId}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/artist/${artistId}`}
                    className="block w-full max-w-full truncate underline-offset-2 hover:underline"
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
        <div className="hidden min-w-0 flex-1 overflow-hidden text-left text-xs lg:block">
          {item.albumId ? (
            <Link
              href={`/album/${item.albumId}`}
              title={item.album}
              className="text-muted-foreground block w-full max-w-full truncate underline-offset-2 hover:underline"
            >
              {item.album}
            </Link>
          ) : (
            <p
              title={item.album}
              className="text-muted-foreground max-w-sm truncate"
            >
              {item.album}
            </p>
          )}
        </div>
      ) : null}
      <div className="space-y-0.5 text-right text-xs">
        <p>
          {item.count.toLocaleString()} plays ({formatPercent(countPercentage)})
        </p>
        <p className="text-muted-foreground">
          {duration(item.duration).toBestDurationString(false)} (
          {formatPercent(durationPercentage)})
        </p>
      </div>
    </>
  );

  return (
    <div className="bg-muted/30 relative isolate w-full overflow-hidden rounded-md border">
      <CoverTintBackdrop coverUrl={item.image} className="rounded-md" />
      <div className="relative z-10 flex w-full items-center gap-3 p-2">
        {content}
      </div>
    </div>
  );
}
