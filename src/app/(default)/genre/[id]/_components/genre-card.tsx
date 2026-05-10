import { NoDataCard } from "@/components/cards/no-data-card";
import { Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { duration, truncateText, TOP_CARD_ENTITY_NAME_MAX } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Loading } from "@/components/ui/loading";

const GenreCard = ({ id }: { id: number }) => {
  const { data: genre, isLoading } = api.genre.get.useQuery({ id });
  if (isLoading) {
    return <Loading />;
  }
  if (!genre) {
    return (
      <NoDataCard
        title="Genre"
        icon={<Tags />}
        emptyTitle="No genre data"
        description="We couldn't find any genre data"
      />
    );
  }

  return (
    <Card className="relative isolate">
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted relative flex aspect-square w-full max-w-full items-center justify-center overflow-hidden rounded-md">
            <Tags className="text-muted-foreground size-16 stroke-[1.25]" />
          </div>
          <div className="grid h-full min-w-0 grid-cols-1 grid-rows-[1fr_auto_1fr] justify-between">
            <div>
              <p className="block text-2xl font-bold">
                {truncateText(genre.name, TOP_CARD_ENTITY_NAME_MAX)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                From artists tagged with this genre
              </p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {genre.metrics.plays.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {genre.metrics.plays === 1 ? "play" : "plays"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {duration(genre.metrics.duration).toBestDurationString()}
                </span>
                <span className="text-muted-foreground text-sm">listened</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {genre.metrics.artists.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {genre.metrics.artists === 1 ? "artist" : "artists"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {genre.metrics.tracks.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {genre.metrics.tracks === 1 ? "track" : "tracks"}
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

export default GenreCard;
