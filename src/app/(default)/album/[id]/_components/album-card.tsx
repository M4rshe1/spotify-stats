import { NoDataCard } from "@/components/cards/no-data-card";
import { Disc3Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { duration, truncateText, TOP_CARD_ENTITY_NAME_MAX } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Loading } from "@/components/ui/loading";
import Link from "next/link";

const AlbumCard = ({ id }: { id: number }) => {
  const { data: album, isLoading } = api.album.get.useQuery({ id });
  if (isLoading) {
    return <Loading />;
  }
  if (!album) {
    return (
      <NoDataCard
        title="Album"
        icon={<Disc3Icon />}
        emptyTitle="No album data"
        description="We couldn't find any album data"
      />
    );
  }

  const artistNames = album.artists
    .map((a) => a.artist?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={album.image} fillsContainer />
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted relative aspect-square w-full max-w-full overflow-hidden rounded-md">
            {album.image ? (
              <img
                src={album.image}
                alt={album.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-muted-foreground text-muted flex h-full w-full items-center justify-center rounded-md text-lg">
                ?
              </div>
            )}
          </div>
          <div className="grid h-full min-w-0 grid-cols-1 grid-rows-[1fr_auto_1fr] justify-between">
            <div>
              <p className="block text-2xl font-bold">
                {truncateText(album.name, TOP_CARD_ENTITY_NAME_MAX)}
              </p>
              <Link
                href={`/artist/${album.artistId}`}
                className="text-muted-foreground mt-1 text-sm hover:underline"
              >
                {artistNames || "—"}
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {album.metrics.plays.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {album.metrics.plays === 1 ? "play" : "plays"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {duration(album.metrics.duration).toBestDurationString()}
                </span>
                <span className="text-muted-foreground text-sm">listened</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {album.metrics.tracks.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {album.metrics.tracks === 1 ? "track" : "tracks"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlbumCard;
