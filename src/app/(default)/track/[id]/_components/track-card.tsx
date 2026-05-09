import Link from "next/link";
import { NoDataCard } from "@/components/cards/no-data-card";
import { Music2Icon } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { duration, truncateText, TOP_CARD_ENTITY_NAME_MAX } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Loading } from "@/components/ui/loading";

const TrackCard = ({ id }: { id: number }) => {
  const { data: track, isLoading } = api.track.get.useQuery({ id });
  if (isLoading) {
    return <Loading />;
  }
  if (!track) {
    return (
      <NoDataCard
        title="Track"
        icon={<Music2Icon />}
        emptyTitle="No track data"
        description="We couldn't find any track data"
      />
    );
  }

  const artistNames = track.artists
    .map((a) => a.artist?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={track.image} fillsContainer />
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted relative aspect-square w-full max-w-full overflow-hidden rounded-md">
            {track.image ? (
              <img
                src={track.image}
                alt={track.name}
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
                {truncateText(track.name, TOP_CARD_ENTITY_NAME_MAX)}
              </p>
              {track.album ? (
                <p className="text-muted-foreground mt-1 truncate text-sm">
                  <Link
                    href={`/album/${track.album.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {track.album.name}
                  </Link>
                  {artistNames ? ` · ${artistNames}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">
                  {artistNames || "—"}
                </p>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {track.metrics.plays.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {track.metrics.plays === 1 ? "play" : "plays"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {duration(track.metrics.duration).toBestDurationString()}
                </span>
                <span className="text-muted-foreground text-sm">listened</span>
              </div>
            </div>
            <div className="flex items-center gap-2"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackCard;
