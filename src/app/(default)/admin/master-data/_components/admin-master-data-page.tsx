"use client";

import Link from "next/link";
import {
  ChevronRight,
  Disc3,
  ListMusic,
  Loader2Icon,
  Music2,
  Tags,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type EntityCardProps = {
  title: string;
  description: string;
  count: number;
  icon: typeof Users;
  iconClassName: string;
  href?: string;
  hrefLabel?: string;
};

function EntityCard({
  title,
  description,
  count,
  icon: Icon,
  iconClassName,
  href,
  hrefLabel = "Explore in app",
}: EntityCardProps) {
  const body = (
    <Card
      size="sm"
      className={cn(href && "hover:bg-muted/40 h-full transition-colors")}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "bg-muted/80 ring-foreground/10 flex size-10 shrink-0 items-center justify-center ring-1",
              iconClassName,
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <CardTitle className="font-heading text-sm font-medium">
              {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {href ? (
            <ChevronRight
              className="text-muted-foreground mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <p className="text-foreground font-mono text-2xl font-semibold tabular-nums">
          {formatNumber(count, 3)}
        </p>
        {href && hrefLabel ? (
          <p className="text-muted-foreground mt-2 text-xs">{hrefLabel}</p>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            Indexed from Spotify imports
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group focus-visible:ring-ring focus-visible:ring-offset-background block focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {body}
      </Link>
    );
  }

  return body;
}

export function AdminMasterDataPageClient() {
  const utils = api.useUtils();
  const { data, isLoading, isError, error, isFetching } =
    api.admin.getMasterDataStats.useQuery(undefined, {
      staleTime: 30_000,
    });

  const enqueueRefetch = api.admin.enqueueMasterDataRefetch.useMutation({
    onSuccess: ({ jobId }) => {
      toast.success("Catalog sync queued for the cruncher worker", {
        description: jobId ? `Job id: ${jobId}` : undefined,
      });
      void utils.admin.getMasterDataStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not queue refetch");
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        Loading counts…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error?.message ?? "Could not load master data stats."}
        </AlertDescription>
      </Alert>
    );
  }

  const { relations } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Master data</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Shared catalogs from Spotify imports.{" "}
          <Link
            href="/admin/database"
            className="text-foreground underline underline-offset-2"
          >
            Database
          </Link>{" "}
          for ad hoc queries.
          {isFetching && !isLoading ? (
            <span className="ml-2 inline-flex items-center gap-1">
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
              <span className="sr-only">Refreshing</span>
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground max-w-xl text-sm">
          Queue a catalog sync job (uses your Spotify token). Reloads queues
          from stored track IDs and fills missing genres, artists, albums, and
          tracks.
        </p>
        <Button
          type="button"
          disabled={enqueueRefetch.isPending}
          onClick={() => enqueueRefetch.mutate()}
          className="shrink-0"
        >
          {enqueueRefetch.isPending ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
              Queueing…
            </>
          ) : (
            "Queue catalog sync"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EntityCard
          title="Artists"
          description="Distinct artists linked to tracks and albums."
          count={data.artists}
          icon={Users}
          iconClassName="text-violet-600 dark:text-violet-400"
          href="/top/artists"
        />
        <EntityCard
          title="Tracks"
          description="Normalized track records from listening history imports."
          count={data.tracks}
          icon={Music2}
          iconClassName="text-sky-600 dark:text-sky-400"
          href="/top/tracks"
        />
        <EntityCard
          title="Albums"
          description="Albums referenced by synced tracks."
          count={data.albums}
          icon={Disc3}
          iconClassName="text-amber-600 dark:text-amber-400"
          href="/top/albums"
        />
        <EntityCard
          title="Genres"
          description="Genre tags associated with artists."
          count={data.genres}
          icon={Tags}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          href="/top/genres"
        />
        <EntityCard
          title="Playlists"
          description="Playlist snapshots stored for this instance."
          count={data.playlists}
          icon={ListMusic}
          iconClassName="text-fuchsia-600 dark:text-fuchsia-400"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium tracking-tight">
          Relationship rows
        </h2>
        <p className="text-muted-foreground text-xs">
          Junction table sizes (artist ↔ genre, album ↔ artist, track ↔ artist).
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Card size="sm">
            <CardContent className="flex items-baseline justify-between gap-2 pt-4 pb-4">
              <span className="text-muted-foreground text-sm">
                Artist ↔ genre
              </span>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatNumber(relations.artistGenres, 3)}
              </span>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-baseline justify-between gap-2 pt-4 pb-4">
              <span className="text-muted-foreground text-sm">
                Album ↔ artist
              </span>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatNumber(relations.albumArtists, 3)}
              </span>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-baseline justify-between gap-2 pt-4 pb-4">
              <span className="text-muted-foreground text-sm">
                Track ↔ artist
              </span>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatNumber(relations.artistTracks, 3)}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
