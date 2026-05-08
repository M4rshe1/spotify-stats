import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { NoDataCard } from "@/components/cards/no-data-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import {
  TOP_CARD_ENTITY_NAME_MAX,
  duration,
  truncateText,
} from "@/lib/utils";
import { api } from "@/trpc/react";
import { MusicIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TopTrack({ period }: { period: ProviderPeriod }) {
  const { data: topTrack, isLoading: isLoadingTopTrack } =
    api.dashboard.getTopTrack.useQuery(providerPeriodToQueryInput(period));
  const { mutate: playTrack } = api.control.play.useMutation();
  if (isLoadingTopTrack) {
    return <Loading />;
  }
  if (!topTrack) {
    return (
      <NoDataCard
        title="Best song"
        icon={<MusicIcon />}
        emptyTitle="No track data"
        description="We couldn't find any tracks for this period. Try a different time range."
      />
    );
  }

  function handlePlayTrack() {
    playTrack(
      { trackId: topTrack?.track?.id ?? 0 },
      {
        onSuccess: () => {
          toast.success("Track played");
        },
        onError: () => {
          toast.error("Failed to play track");
        },
      },
    );
  }

  const trackName = topTrack.track?.name ?? "Unknown";
  const albumImage = topTrack.track?.image ?? null;
  const primaryArtist = topTrack.track?.artists[0]?.artist;
  const artistName = primaryArtist?.name ?? "";

  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={albumImage} />
      <CardContent className="relative z-10">
        <div className="flex flex-col items-start gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted relative h-77 max-w-full overflow-hidden rounded-md">
              {albumImage ? (
                <img
                  src={albumImage}
                  alt={trackName}
                  className="h-48 h-full w-full object-cover"
                />
              ) : (
                <div className="bg-muted-foreground text-muted flex h-full w-full items-center justify-center rounded-md text-lg">
                  ?
                </div>
              )}
            </div>
            <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
              <div className="min-w-0">
                <Link
                  href={`/track/${topTrack.track?.id}`}
                  aria-label={trackName}
                  title={trackName}
                  className="block text-2xl font-bold hover:underline"
                >
                  {truncateText(trackName, TOP_CARD_ENTITY_NAME_MAX)}
                </Link>
                {primaryArtist ? (
                  <Link
                    href={`/artist/${primaryArtist.id}`}
                    aria-label={artistName}
                    title={artistName}
                    className="text-muted-foreground mt-1 block text-sm hover:underline"
                  >
                    {truncateText(artistName, TOP_CARD_ENTITY_NAME_MAX)}
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {topTrack.tracks.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm">listens</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {duration(topTrack.duration).toMinutes().toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm">minutes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handlePlayTrack}>
                  <PlayIcon size={16} />
                  Play
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
