import { NoDataCard } from "@/components/cards/no-data-card";
import { ListMusicIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { duration, truncateText, TOP_CARD_ENTITY_NAME_MAX } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Loading } from "@/components/ui/loading";
import { authClient } from "@/server/better-auth/client";
import { Button } from "@/components/ui/button";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";

const PlaylistCard = ({
  id,
  period,
}: {
  id: number;
  period: ProviderPeriod;
}) => {
  const periodInput = providerPeriodToQueryInput(period);
  const { data: playlist, isLoading } = api.playlist.get.useQuery({
    id,
    ...periodInput,
  });
  const { mutate: refreshPlaylist } = api.admin.refreshMasterData.useMutation();
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();

  function handleRefreshPlaylist() {
    refreshPlaylist({ type: "playlist", id });
    void utils.invalidate();
  }

  if (isLoading) {
    return <Loading />;
  }
  if (!playlist) {
    return (
      <NoDataCard
        title="Playlist"
        icon={<ListMusicIcon />}
        emptyTitle="No playlist data"
        description="We couldn't find any playlist data"
      />
    );
  }

  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={playlist.image} fillsContainer />
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted relative aspect-square w-full max-w-full overflow-hidden rounded-md">
            {playlist.image ? (
              <img
                src={playlist.image}
                alt={playlist.name}
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
                {truncateText(playlist.name, TOP_CARD_ENTITY_NAME_MAX)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">Playlist</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {playlist.metrics.plays.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {playlist.metrics.plays === 1 ? "play" : "plays"}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {duration(playlist.metrics.duration).toBestDurationString()}
                </span>
                <span className="text-muted-foreground text-sm">listened</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                  {playlist.metrics.tracks.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">
                  {playlist.metrics.tracks === 1 ? "track" : "tracks"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2"></div>
            {session?.user.role === "admin" && (
              <Button
                variant="outline"
                className="ml-auto"
                size="sm"
                onClick={handleRefreshPlaylist}
              >
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaylistCard;
