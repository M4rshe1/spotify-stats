"use client";

import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { Button } from "@/components/ui/button";
import { duration, formatPercent } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import Link from "next/link";

export type TopListEntityType = "tracks" | "artists" | "albums";

export type TopListItemData = {
  id: number;
  title: string;
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
  const href =
    type === "tracks"
      ? `/track/${item.id}`
      : type === "artists"
        ? `/artist/${item.id}`
        : item.id === 0
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
        <div className="hidden min-w-0 flex-1 overflow-hidden text-left text-xs lg:block">
          {item.albumId ? (
            <Link
              href={`/album/${item.albumId}`}
              title={item.album}
              className="text-muted-foreground block max-w-sm truncate underline-offset-2 hover:underline"
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
    <div className="relative isolate w-full overflow-hidden rounded-md border bg-muted/30">
      <CoverTintBackdrop coverUrl={item.image} className="rounded-md" />
      <div className="relative z-10 flex w-full items-center gap-3 p-2">
        {content}
      </div>
    </div>
  );
}
