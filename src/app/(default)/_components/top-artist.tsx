import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import type { ProviderPeriod } from "@/lib/consts/periods";
import { providerPeriodToQueryInput } from "@/lib/provider-period-query-input";
import { duration } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";

export default function TopArtist({ period }: { period: ProviderPeriod }) {
  const { data: topArtist, isLoading: isLoadingTopArtist } =
    api.dashboard.getTopArtist.useQuery(providerPeriodToQueryInput(period));
  if (isLoadingTopArtist) {
    return <Loading />;
  }
  if (!topArtist) {
    return <div>No data</div>;
  }

  const artistName = topArtist.artist?.name || "Unknown";
  const artistImage = topArtist.artist?.image || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best artist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted relative h-64 max-w-full overflow-hidden rounded-md">
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
                className="overflow-hidden text-2xl font-bold hover:underline"
              >
                {artistName}
              </Link>
              <div className="mt-3 space-y-1">
                <div className="text-sm">
                  {topArtist.differentTracks}{" "}
                  {topArtist.differentTracks === 1
                    ? "track"
                    : "different tracks"}
                </div>
                <div className="text-sm">
                  {duration(topArtist.duration).toMinutes()} minutes
                </div>
                <div className="text-sm">{topArtist.tracks} tracks</div>
              </div>
              <div className="flex items-center gap-2"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
