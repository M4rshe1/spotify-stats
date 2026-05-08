import { NoDataCard } from "@/components/cards/no-data-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration } from "@/lib/utils";
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

  const trackName = topTrack.track?.name || "Unknown";
  const albumImage = topTrack.track?.image || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best song</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted relative h-64 max-w-full overflow-hidden rounded-md">
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
              <Link
                href={`/track/${topTrack.track?.id}`}
                className="overflow-hidden text-2xl font-bold hover:underline"
              >
                {trackName}
              </Link>
              <div className="mt-3 space-y-1">
                <div className="text-sm">
                  {topTrack.tracks.toLocaleString()} times listened
                </div>
                <div className="text-sm">
                  {duration(topTrack.duration).toMinutes().toLocaleString()}{" "}
                  minutes listened
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
