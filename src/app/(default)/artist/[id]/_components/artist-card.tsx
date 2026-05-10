import type { RouterOutputs } from "@/trpc/react";
import { NoDataCard } from "@/components/cards/no-data-card";
import { MicVocalIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { duration, truncateText, TOP_CARD_ENTITY_NAME_MAX } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Loading } from "@/components/ui/loading";
import Link from "next/link";

const ArtistCard = ({ id }: { id: number }) => {
  const { data: artist, isLoading } = api.artist.get.useQuery({ id });
  if (isLoading) {
    return <Loading />;
  }
  if (!artist) {
    return (
      <NoDataCard
        title="Artist"
        icon={<MicVocalIcon />}
        emptyTitle="No artist data"
        description="We couldn't find any artist data"
      />
    );
  }
  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={artist.image} fillsContainer />
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted relative aspect-square w-full max-w-full overflow-hidden rounded-md">
            {artist.image ? (
              <img
                src={artist.image}
                alt={artist.name}
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
                {truncateText(artist.name, TOP_CARD_ENTITY_NAME_MAX)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {artist.genres.map((genre, index) => (
                  <>
                    <Link
                      key={genre.genre?.id}
                      href={`/genre/${genre.genre?.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {genre.genre?.name}
                    </Link>
                    {index < artist.genres.length - 1 ? ", " : ""}
                  </>
                ))}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {artist.metrics.tracks.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {artist.metrics.tracks === 1
                    ? "unique track"
                    : "different tracks"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {duration(artist.metrics.duration).toBestDurationString()}
                </span>
                <span className="text-muted-foreground text-sm">minutes</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {artist.metrics.albums.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">tracks</span>
              </div>
            </div>
            <div className="flex items-center gap-2"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistCard;
