"use client";

import type { MouseEvent } from "react";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { ProxyImage } from "@/components/proxy-image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getGenreColor } from "@/lib/consts/genres";
import { cn, duration, formatPercent } from "@/lib/utils";
import {
  MinusIcon,
  PlayIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
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
  previousRank?: number | null;
  album?: string;
  albumId?: number | null;
  artists?: {
    id: number | null;
    name: string;
    role: string;
  }[];
};

function RankDelta({
  rank,
  previousRank,
  compareAvailable,
}: {
  rank: number;
  previousRank?: number | null;
  compareAvailable?: boolean;
}) {
  if (!compareAvailable) return null;
  if (previousRank == null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-info cursor-default text-[10px] leading-none font-semibold">
            NEW
          </span>
        </TooltipTrigger>
        <TooltipContent>New vs the previous period</TooltipContent>
      </Tooltip>
    );
  }

  const delta = previousRank - rank;
  if (delta === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground inline-flex cursor-default items-center gap-0.5 text-[10px] leading-none">
            <MinusIcon className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>No change (was #{previousRank})</TooltipContent>
      </Tooltip>
    );
  }

  const rose = delta > 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-default items-center gap-0.5 text-[10px] leading-none font-semibold",
            rose ? "text-success" : "text-destructive",
          )}
        >
          {rose ? (
            <TrendingUpIcon className="size-3" />
          ) : (
            <TrendingDownIcon className="size-3" />
          )}
          {Math.abs(delta)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {rose ? "Up" : "Down"} {Math.abs(delta)} from #{previousRank}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopListItem({
  rank,
  type,
  item,
  countPercentage,
  durationPercentage,
  compareAvailable,
  onPlay,
}: {
  rank: number;
  type: TopListEntityType;
  item: TopListItemData;
  countPercentage: number;
  durationPercentage: number;
  compareAvailable?: boolean;
  onPlay?: (trackId: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const href = getHref(type, item.id);
  const content = (
    <>
      <div className="flex w-12 shrink-0 flex-col items-end justify-center gap-0.5">
        <div className="text-muted-foreground text-xl leading-none font-semibold">
          {rank}
        </div>
        <RankDelta
          rank={rank}
          previousRank={item.previousRank}
          compareAvailable={compareAvailable}
        />
      </div>
      {item.image ? (
        <div className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
          {href ? (
            <Link href={href} className="block">
              <ProxyImage
                src={item.image}
                alt={item.name}
                width={48}
                height={48}
                className="h-12 w-12 object-cover"
              />
            </Link>
          ) : (
            <ProxyImage
              src={item.image}
              alt={item.name}
              width={48}
              height={48}
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
                  onPlay(item.id, e);
                }}
              >
                <PlayIcon className="size-3.5 fill-current" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {type == "genres" && (
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm text-2xl font-extrabold",
            getGenreColor(item.name).fg,
            getGenreColor(item.name).bg,
          )}
        >
          {item.name.slice(0, 1).toUpperCase()}
        </div>
      )}
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
        <p className="text-muted-foreground w-full truncate text-xs">
          {item.artists && item.artists.length > 0
            ? item.artists
                .sort((a, b) => (a.role < b.role ? 1 : -1))
                .map((artist, index) => {
                  return (
                    <span key={`${artist.id ?? artist.name}-${index}`}>
                      {index > 0 ? ", " : ""}
                      {artist.id ? (
                        <Link
                          href={`/artist/${artist.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {artist.name}
                        </Link>
                      ) : (
                        artist.name
                      )}
                    </span>
                  );
                })
            : null}
        </p>
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
          {item.count.toLocaleString()} {item.count === 1 ? "play" : "plays"} (
          {formatPercent(countPercentage)})
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
      <CoverTintBackdrop
        coverUrl={item.image}
        colorOverride={
          type == "genres" ? getGenreColor(item.name).bgx : undefined
        }
        className="rounded-md"
      />
      <div className="relative z-10 flex w-full items-center gap-3 p-2">
        {content}
      </div>
    </div>
  );
}
