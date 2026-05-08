import { CoverTintBackdrop } from "@/components/cards/cover-tint-backdrop";
import { NoDataCard } from "@/components/cards/no-data-card";
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
import { MicVocalIcon } from "lucide-react";
import Link from "next/link";

export default function TopArtist({ period }: { period: ProviderPeriod }) {
  const { data: topArtist, isLoading: isLoadingTopArtist } =
    api.dashboard.getTopArtist.useQuery(providerPeriodToQueryInput(period));
  if (isLoadingTopArtist) {
    return <Loading />;
  }
  if (!topArtist) {
    return (
      <NoDataCard
        title="Best artist"
        icon={<MicVocalIcon />}
        emptyTitle="No artist data"
        description="We couldn't find any artists for this period. Try a different time range."
      />
    );
  }

  const artistName = topArtist.artist?.name ?? "Unknown";
  const artistImage = topArtist.artist?.image ?? null;

  return (
    <Card className="relative isolate">
      <CoverTintBackdrop coverUrl={artistImage} />
      <CardContent className="relative z-10">
        <div className="flex flex-col items-start gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted relative h-77 max-w-full overflow-hidden rounded-md">
              {artistImage ? (
                <img
                  src={artistImage}
                  alt={artistName}
                  className="h-48 h-full w-full object-cover"
                />
              ) : (
                <div className="bg-muted-foreground text-muted flex h-full w-full items-center justify-center rounded-md text-lg">
                  ?
                </div>
              )}
            </div>
            <div className="grid h-full min-w-0 grid-cols-1 grid-rows-[1fr_auto_1fr] justify-between">
              <Link
                href={`/artist/${topArtist.artist?.id}`}
                aria-label={artistName}
                title={artistName}
                className="block text-2xl font-bold hover:underline"
              >
                {truncateText(artistName, TOP_CARD_ENTITY_NAME_MAX)}
              </Link>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {topArtist.differentTracks.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {topArtist.differentTracks === 1
                      ? "unique track"
                      : "different tracks"}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {duration(topArtist.duration).toMinutes().toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm">minutes</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                  <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {topArtist.tracks.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm">tracks</span>
                </div>
              </div>
              <div className="flex items-center gap-2"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
